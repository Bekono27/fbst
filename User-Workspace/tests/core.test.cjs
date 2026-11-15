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
