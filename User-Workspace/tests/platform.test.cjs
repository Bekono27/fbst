const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {openDatabase}=require('../database.cjs');const {groupStore}=require('../groups.cjs');const {parse}=require('../../group-import.js');const {startOnline}=require('../online-server.cjs');const {createSync}=require('../sync.cjs');
test('groups persist, canonicalize links, separate privacy and import atomically',()=>{
 const db=openDatabase(':memory:');const groups=groupStore(db.db);
 const row={name:'Улаанбаатар',url:'https://m.facebook.com/groups/123?ref=share',privacy:'public',members:'12',notes:'Хотын бүлэг'};
 assert.deepEqual(groups.importRows([row,row]),{added:1,skipped:1});assert.equal(groups.list()[0].url,'https://www.facebook.com/groups/123/');
 assert.throws(()=>groups.importRows([{...row,url:'https://facebook.com/groups/456',privacy:'private'},{...row,url:'https://evil.test/groups/666'}]));assert.equal(groups.list().length,1);
 groups.save({...groups.list()[0],privacy:'private',notes:'Updated'});assert.equal(groups.list()[0].privacy,'private');assert.equal(groups.list()[0].members,12);
 assert.throws(()=>groups.save({...row,url:'javascript:alert(1)'}));db.db.close();
});
test('CSV handles BOM, quoted delimiters, newlines, escaped quotes and string IDs',()=>{
 const data=parse('\uFEFFName,URL,Notes\r\n"A, B",https://facebook.com/groups/12345678901234567890/,"first\nsecond ""quote"""');
 assert.equal(data.rows[0][0],'A, B');assert.equal(data.rows[0][2],'first\nsecond "quote"');assert(data.rows[0][1].includes('12345678901234567890'));assert.equal(parse('name\turl\nA\tB').rows[0][1],'B');assert.throws(()=>parse('name,url\n"unclosed'));
});
test('authenticated sync uploads captured IDs and groups; read key cannot write; conflicts preserve records',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'aurant-online-'));const readKey='r'.repeat(40),writeKey='w'.repeat(40);
 const remote=startOnline({port:0,directory,readKey,writeKey});await new Promise(r=>remote.server.on('listening',r));const base='http://127.0.0.1:'+remote.server.address().port;
 const local=openDatabase(':memory:'),groups=groupStore(local.db);const row=local.save({name:'Туул',portfolio:'Aurant',categories:['Travel'],bio:'Хөдөө явах дуртай'});local.capture(row.id,'12345678901234567890');groups.save({name:'Бүлэг',url:'https://facebook.com/groups/88/',privacy:'private'});
 const client=createSync(directory,()=>({pages:local.list(),groups:groups.list(),bios:local.bios()}));
 try{
 assert.equal((await fetch(base+'/snapshot')).status,401);
 client.configure({endpoint:base,key:writeKey});await client.send();assert.equal(client.status().lastError,'');assert.equal(client.status().revision,1);
 let response=await fetch(base+'/snapshot',{headers:{Authorization:'Bearer '+readKey,Origin:'https://mnanalyze.com'}});assert.equal(response.headers.get('access-control-allow-origin'),'https://mnanalyze.com');let snap=await response.json();assert.equal(snap.data.pages[0].page_id,'12345678901234567890');assert(snap.data.pages[0].url.endsWith('12345678901234567890'));assert.equal(snap.data.groups[0].privacy,'private');
 assert.equal((await fetch(base+'/snapshot',{method:'PUT',headers:{Authorization:'Bearer '+readKey},body:'{}'})).status,403);
 assert.equal((await fetch(base+'/snapshot',{headers:{Authorization:'Bearer '+readKey,Origin:'https://evil.test'}})).status,403);
 local.save({...row,bio:'Гэртээ ном унших дуртай'});await client.send();assert.equal(client.status().revision,2);
 const other={writer:'another-device',revision:2,data:{pages:[],groups:[],bios:[]}};assert.equal((await fetch(base+'/snapshot',{method:'PUT',headers:{Authorization:'Bearer '+writeKey},body:JSON.stringify(other)})).status,409);
 const savedConfig=JSON.parse(fs.readFileSync(path.join(directory,'online-sync.json'),'utf8'));const retry={writer:savedConfig.writer,revision:1,data:{pages:local.list(),groups:groups.list(),bios:local.bios()}};assert.equal((await fetch(base+'/snapshot',{method:'PUT',headers:{Authorization:'Bearer '+writeKey},body:JSON.stringify(retry)})).status,200);
 assert(!JSON.stringify(client.status()).includes(writeKey));
 }finally{client.close();await new Promise(r=>remote.server.close(r));remote.db.close();local.db.close();fs.rmSync(directory,{recursive:true,force:true});}
});
test('local API exposes group persistence and serves the shared scripts',async()=>{
 const {start}=require('../server.cjs');const directory=fs.mkdtempSync(path.join(os.tmpdir(),'aurant-group-api-'));const app=start({port:0,directory});await new Promise(r=>app.server.on('listening',r));const base='http://127.0.0.1:'+app.server.address().port;
 try{const html=await(await fetch(base)).text();const token=html.match(/const token='([^']+)'/)[1];const headers={'Content-Type':'application/json','X-Workforce-Token':token};assert.equal((await fetch(base+'/platform.js')).status,200);assert.equal((await fetch(base+'/group-import.js')).status,200);assert.equal((await fetch(base+'/api/groups/save',{method:'POST',headers,body:JSON.stringify({name:'Нээлттэй бүлэг',url:'https://facebook.com/groups/999/',privacy:'public'})})).status,200);const data=await(await fetch(base+'/api/state',{headers})).json();assert.equal(data.groups[0].name,'Нээлттэй бүлэг');assert.equal(data.sync.configured,false);assert.equal((await fetch(base+'/api/groups/save',{method:'POST',body:'{}'})).status,403);}finally{await new Promise(r=>app.server.close(r));app.store.db.close();fs.rmSync(directory,{recursive:true,force:true});}
});
