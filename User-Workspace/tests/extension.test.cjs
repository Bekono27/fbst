const test=require('node:test');
const assert=require('node:assert/strict');
const {ExtensionEngine}=require('../extension-engine.cjs');
function setup(t){
 const row={id:'r',name:'Бат',portfolio:'Aurant 3',bio:'Өглөө эрт босдог',categories:['Community'],status:'draft'};
 const store={get:id=>id==='r'?row:undefined,state(id,status,message){Object.assign(row,{status,message});return row;},capture(id,pageId,url){assert.match(pageId,/^\d+$/);Object.assign(row,{page_id:pageId,url,status:'complete'});return row;}};
 const e=new ExtensionEngine(store);t.after(()=>e.close());return {e,row};
}
test('requires pairing; binds owner and tab; delivers once',async t=>{
 const {e}=setup(t);await assert.rejects(e.run('r'));
 e.pair('extension',1);assert.throws(()=>e.poll('other',1));assert.throws(()=>e.poll('extension',2));
 await e.run('r');await assert.rejects(e.run('r'));assert.ok(e.poll('extension',1).job);assert.equal(e.poll('extension',1).job,null);
});
test('submitted error is review and cannot be retried',async t=>{
 const {e,row}=setup(t);e.pair('extension',1);await e.run('r');const j=e.poll('extension',1).job;
 e.progress('extension',{tabId:1,jobId:j.id,stage:'submitting'});
 e.result('extension',{tabId:1,jobId:j.id,message:'Connection lost'});
 assert.equal(row.status,'review');await assert.rejects(e.run('r'));
});
test('timeout and disconnect retain uncertainty',async t=>{
 const {e,row}=setup(t);e.pair('extension',1);await e.run('r');e.job.deadline=0;e.expire();assert.equal(row.status,'review');
 row.status='draft';await e.run('r');e.disconnect('extension',1);assert.equal(row.status,'review');assert.equal(e.context,null);
});
test('capture completes and result acknowledgement is idempotent',async t=>{
 const {e,row}=setup(t);e.pair('extension',1);await e.capture('r');const j=e.poll('extension',1).job;
 const result={tabId:1,jobId:j.id,pageId:'12345',url:'https://www.facebook.com/12345'};
 e.result('extension',result);e.result('extension',result);assert.equal(row.status,'complete');assert.equal(e.busy,false);await assert.rejects(e.run('r'));
});
