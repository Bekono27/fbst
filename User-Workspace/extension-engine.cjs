const {randomUUID,randomInt}=require('node:crypto');
class ExtensionEngine {
 constructor(store){this.store=store;this.owner=null;this.tabId=null;this.seen=0;this.job=null;this.lastResult=null;this.busy=false;this.active=null;this.timer=setInterval(()=>this.expire(),5000);this.timer.unref();}
 get context(){return this.owner&&Date.now()-this.seen<90000?{}:null;}
 status(){return {mode:'extension',connected:!!this.context,tabId:this.tabId,busy:this.busy};}
 expire(){if(this.job&&Date.now()>this.job.deadline){this.store.state(this.active,'review','Extension ажиллагаа тасалдсан. Үүссэн эсэхийг Meta дээр шалгана уу.');this.job=null;this.busy=false;this.active=null;}}
 pair(owner,tabId){if(this.busy)throw Error('Ажиллагаа явагдаж байна.');if(!Number.isInteger(tabId)||tabId<0)throw Error('Meta tab буруу.');this.owner=owner;this.tabId=tabId;this.seen=Date.now();return this.status();}
 authorize(owner,tabId){this.expire();if(owner!==this.owner||tabId!==this.tabId)throw Error('Энэ Meta tab холбогдоогүй.');this.seen=Date.now();}
 poll(owner,tabId){this.authorize(owner,tabId);if(!this.job||this.job.delivered)return {job:null};this.job.delivered=true;return {job:{id:this.job.id,kind:this.job.kind,record:this.job.record}};}
 progress(owner,body){this.authorize(owner,body.tabId);if(!this.job||body.jobId!==this.job.id)throw Error('Ажил хүчингүй болсон.');if(!['opening','filling','submitting'].includes(body.stage))throw Error('Төлөв буруу.');if(body.stage==='submitting')this.job.submitted=true;this.store.state(this.active,body.stage,String(body.message||'').slice(0,300));return {ok:true};}
 result(owner,body){this.authorize(owner,body.tabId);if(this.lastResult===body.jobId)return {ok:true};
 if(!this.job||body.jobId!==this.job.id)throw Error('Ажил хүчингүй болсон; дугаарыг гараар шалгана уу.');
 const current=this.job;
 try{
 if(body.pageId){this.store.capture(this.active,String(body.pageId),body.url||'');}
 else this.store.state(this.active,current.submitted||body.review||current.kind==='capture'?'review':'failed',String(body.message||'Хуудасны дугаар олдсонгүй.').slice(0,400));
 }catch(e){this.store.state(this.active,'review','Дугаар хадгалсангүй: '+e.message);}
 this.lastResult=current.id;this.job=null;this.busy=false;this.active=null;return {ok:true};}
 disconnect(owner,tabId){this.authorize(owner,tabId);if(this.job){this.store.state(this.active,'review','Meta tab салсан. Үр дүнг шалгана уу.');}this.job=null;this.active=null;this.busy=false;this.owner=null;this.tabId=null;return {ok:true};}
 async open(){if(!this.context)throw Error('bektas профайл дахь Meta tab дээр AURANT extension-ийг нээж “Энэ Meta tab-ийг холбох” товчийг дарна уу.');return {ok:true};}
 async enqueue(id,kind){this.expire();await this.open();if(this.busy)throw Error('Өмнөх ажил дуусахыг хүлээнэ үү.');const row=this.store.get(id);if(!row)throw Error('Бүртгэл олдсонгүй.');
 if(kind==='create'&&(!['draft','failed'].includes(row.status)||row.page_id))throw Error('Давхар үүсгэлтээс сэргийлж зогсоолоо. Өмнөх үр дүнг шалгана уу.');
 if(kind==='create'&&(!row.categories?.length||!row.portfolio))throw Error('Бизнесийн багц болон ангилал шаардлагатай.');
 this.busy=true;this.active=id;this.job={id:randomUUID(),kind,delivered:false,submitted:false,deadline:Date.now()+240000,record:{id,name:row.name,portfolio:row.portfolio,bio:row.bio,category:row.categories?.length?row.categories[randomInt(row.categories.length)]:''}};
 this.store.state(id,'opening',kind==='create'?'Холбогдсон Meta tab дээр ажил эхэлж байна.':'Холбогдсон Meta tab-аас дугаар хайж байна.');return this.store.get(id);}
 run(id){return this.enqueue(id,'create');}
 capture(id){return this.enqueue(id,'capture');}
 close(){clearInterval(this.timer);}
}
module.exports={ExtensionEngine};
