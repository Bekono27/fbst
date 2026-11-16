const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {openDatabase,pageIdFromURL,validBio}=require('../database.cjs');
const {Engine}=require('../engine.cjs');
const {start}=require('../server.cjs');
const sample={name:'Туулын аялал',portfolio:'Aurant 3',categories:['Travel'],bio:'Хөдөө явах дуртай'};
test('durable records, duplicate IDs, interruption and update protection',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'workforce-'));
 let store=openDatabase(path.join(dir,'db.sqlite'));
 const a=store.save(sample),b=store.save({...sample,name:'Өөр хуудас'});
 store.capture(a.id,'12345678901234567890','https://www.facebook.com/12345678901234567890');
 assert.throws(()=>store.capture(b.id,'12345678901234567890'));
 store.state(b.id,'submitting','test');store.db.close();
 store=openDatabase(path.join(dir,'db.sqlite'));
 assert.equal(store.get(a.id).page_id,'12345678901234567890');
 assert.equal(store.get(b.id).status,'review');
 assert.throws(()=>store.save({...sample,id:b.id}));
 store.db.close();fs.rmSync(dir,{recursive:true,force:true});
});
test('bio and URL validation',()=>{
 assert(validBio(sample.bio));assert(!validBio('English biography is here'));
 assert(!validBio('Сайн уу'));
 assert.equal(pageIdFromURL('https://business.facebook.com/latest?business_id=10&asset_id=555'),'555');
 assert.equal(pageIdFromURL('https://business.facebook.com/latest?business_id=10'),'');
 assert.equal(pageIdFromURL('https://evilfacebook.com/123'),'');
 assert.equal(pageIdFromURL('https://www.facebook.com/profile.php?id=777'),'777');
});
test('local API enforces session token and stores validated data',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'workforce-api-'));
 const {server,store}=start({port:0,directory:dir});
 await new Promise(r=>server.on('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal((await fetch(base+'/api/state')).status,403);
  const html=await (await fetch(base)).text();
  const token=html.match(/const token='([^']+)'/)[1];
  const headers={'X-Workforce-Token':token,'Content-Type':'application/json'};
  const saved=await fetch(base+'/api/save',{method:'POST',headers,body:JSON.stringify(sample)});
  assert.equal(saved.status,200);
  const data=await (await fetch(base+'/api/state',{headers})).json();
  assert.equal(data.pages[0].name,sample.name);
  assert.equal((await fetch(base+'/api/save',{method:'POST',headers:{...headers,Origin:'https://evil.test'},body:'{}'})).status,403);
 }finally{await new Promise(r=>server.close(r));store.db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('ambiguous submission becomes review and cannot be resubmitted',async()=>{
 const store=openDatabase(':memory:'),row=store.save(sample);
 const engine=new Engine(store,'unused');
 engine.browser=async()=>{throw Error('browser unavailable');};
 await engine.run(row.id);await engine.task;
 assert.equal(store.get(row.id).status,'failed');
 store.state(row.id,'review','uncertain');
 await assert.rejects(()=>engine.run(row.id));
 store.db.close();
});
test('submit timeout does not become retryable failure',async()=>{
 const store=openDatabase(':memory:'),row=store.save(sample);
 let clicks=0;
 const locator={
  first(){return this;},filter(){return this;},or(){return this;},
  async waitFor(){},async count(){return 1;},async fill(){},
  async click(){clicks++;},async isChecked(){return true;},
  async all(){return [];},async innerText(){return 'Aurant 3';},
  getByRole(){return this;},getByLabel(){return this;}
 };
 const engine=new Engine(store,'unused');
 engine.browser=async()=>{};
 engine.page={bringToFront:async()=>{},url:()=> 'https://business.facebook.com/',locator:()=>locator,
 getByText:()=>locator,getByRole:()=>locator};
 engine.collect=async()=>{throw Error('timed out after server accepted');};
 await engine.run(row.id);await engine.task;
 assert(clicks>0);assert.equal(store.get(row.id).status,'review');
 await assert.rejects(()=>engine.run(row.id));
 store.db.close();
});
test('import rolls back the whole batch on invalid records',()=>{
 const store=openDatabase(':memory:');
 assert.throws(()=>store.importRecords([sample,{...sample,name:'second',bio:'bad'}]));
 assert.equal(store.list().length,0);
 assert.equal(store.importRecords([sample,sample]),1);
 store.db.close();
});
test('roster has 200 unique mixed names and bios and is idempotent',()=>{
 const {roster}=require('../roster.cjs');
 const store=openDatabase(':memory:');
 const rows=roster('Aurant 3',['Personal blog'],store.bios());
 assert.equal(rows.length,200);
 assert.equal(new Set(rows.map(r=>r.name)).size,200);
 assert(rows.every(r=>validBio(r.bio)));
 assert(rows.some(r=>r.name==='Batuka'));
 assert(rows.some(r=>r.name==='Batuna'));
 assert(rows.some(r=>/[А-Яа-я]/.test(r.name)&&/[a-z]/i.test(r.name)));
 assert.equal(store.importRecords(rows),200);
 assert.equal(store.importRecords(rows),0);
 assert(store.list().every(r=>r.status==='draft'&&!r.page_id));
 store.db.close();
});
test('reuses its dedicated browser and recovers a closed tab',async()=>{
 const engine=new Engine({},'unused');
 const existing={isClosed:()=>false};
 engine.page=existing;engine.context={};
 assert.equal(await engine.browser(),engine.context);
 assert.equal(engine.page,existing);
 const recovered={url:()=> 'https://business.facebook.com/latest',setDefaultTimeout:()=>{}};
 engine.page={isClosed:()=>true};engine.context={pages:()=>[recovered]};
 await engine.browser();assert.equal(engine.page,recovered);
});
test('import keeps unresolved creation records under review',()=>{
 const store=openDatabase(':memory:');
 store.importRecords([{...sample,status:'submitting'},{...sample,name:'Дууссан бүртгэл',status:'complete'}]);
 assert(store.list().every(row=>row.status==='review'));
 store.db.close();
});
test('ID capture rejects inconsistent links and relinking',()=>{
 const store=openDatabase(':memory:'),row=store.save(sample);
 assert.throws(()=>store.capture(row.id,'123','https://www.facebook.com/456'));
 store.capture(row.id,'123','https://www.facebook.com/123');
 assert.throws(()=>store.capture(row.id,'456','https://www.facebook.com/456'));
 assert.equal(store.get(row.id).page_id,'123');
 assert.equal(pageIdFromURL('http://facebook.com/123'),'');
 store.db.close();
});
test('ID collector checks links after Done and handles duplicate names',async()=>{
 const store=openDatabase(':memory:'),row=store.save(sample);
 let done=false;
 let ids=['123'];
 const wait={first(){return this;},or(){return this;},waitFor:async()=>{}};
 const page={
  url:()=> 'https://business.facebook.com/latest?business_id=555',
  locator:()=>({innerText:async()=>sample.name}),
  getByRole(role){
   if(role==='button') return {isVisible:async()=>!done,click:async()=>{done=true;}};
   if(role==='heading') return {filter(){return this;},count:async()=>0};
   return {...wait,all:async()=>done?ids.map(id=>({isVisible:async()=>true,getAttribute:async()=> 'https://www.facebook.com/'+id})):[]};
  }
 };
 const engine=new Engine(store,'unused');engine.page=page;
 await engine.collect(row.id);
 assert.equal(store.get(row.id).page_id,'123');
 const second=store.save({...sample,name:'Өөр нэр'});ids=['444','777'];
 await engine.collect(second.id);
 assert.equal(store.get(second.id).status,'review');
 assert.equal(store.get(second.id).page_id,null);
 store.db.close();
});
