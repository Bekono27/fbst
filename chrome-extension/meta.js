(()=>{
 if(globalThis.__aurantMetaBridge)return;
 globalThis.__aurantMetaBridge=true;
 let busy=false,stopped=false,pending=null,generation=0;
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const visible=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden';};
 const text=el=>(el.getAttribute('aria-label')||el.innerText||el.textContent||'').trim();
 const all=(selector,root=document)=>[...root.querySelectorAll(selector)].filter(visible);
 function guard(){
  if(stopped)throw Error('Холболт салсан.');
  if(location.origin!=='https://business.facebook.com'||/login|checkpoint|captcha/i.test(location.pathname))throw Error('Meta нэвтрэлт эсвэл баталгаажуулалт шаардлагатай.');
  if(/confirm you're human|verify you are human|temporarily blocked/i.test(document.body.innerText))throw Error('Meta баталгаажуулалт шаардлагатай.');
 }
 async function message(type,data={}){const r=await chrome.runtime.sendMessage({type,...data});if(!r||r.error)throw Error(r?.error||'Extension холболт тасарлаа.');return r;}
 async function until(fn,label,timeout=12000){const end=Date.now()+timeout;while(Date.now()<end){guard();const r=fn();if(r)return r;await wait(250);}throw Error(label+' олдсонгүй.');}
 function unique(elements,label){if(elements.length>1)throw Error(label+' олон байна; буруу үйлдлээс сэргийлж зогслоо.');return elements[0];}
 function byText(value,root=document){
  return all('*',root).filter(el=>text(el)===value&&!all('*',el).some(child=>text(child)===value));
 }
 function button(pattern,root=document){return unique(all('button,[role="button"],[role="menuitem"],a',root).filter(el=>pattern.test(text(el))),'Товч');}
 function search(){return unique(all('input').filter(el=>/Search for a business asset|Бизнесийн хөрөнгө хайх/i.test(el.placeholder||el.getAttribute('aria-label')||'')),'Бизнесийн хайлт');}
 function field(pattern,root=document){
  const inputs=all('input,textarea,[role="combobox"]',root);
  return unique(inputs.filter(el=>{
   const ids=(el.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean);
   const names=[el.getAttribute('aria-label'),el.placeholder,...ids.map(id=>document.getElementById(id)?.textContent),...[...(el.labels||[])].map(l=>l.textContent)].filter(Boolean);
   if(names.some(s=>pattern.test(s.trim())))return true;
   const parent=el.closest('label');return parent&&pattern.test(parent.textContent.trim());
  }),'Маягтын талбар');
 }
 function fill(el,value){
  if(!el||el.disabled||el.getAttribute('aria-disabled')==='true')throw Error('Талбар идэвхгүй.');
  el.focus();
  const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
  if(!setter)throw Error('Талбарын төрөл дэмжигдээгүй.');
  setter.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
 }
 function enabled(el){return el&&!el.disabled&&el.getAttribute('aria-disabled')!=='true';}
 function pageId(raw){try{const u=new URL(raw,location.href);if(u.protocol!=='https:'||!/(^|\.)facebook\.com$/.test(u.hostname))return '';const id=u.searchParams.get('asset_id')||u.searchParams.get('page_id')||(u.pathname==='/profile.php'?u.searchParams.get('id'):'')||u.pathname.match(/^\/(\d+)\/?$/)?.[1];return /^\d+$/.test(id||'')?id:'';}catch{return '';}}
 function capture(record){
  const ids=new Map();
  for(const a of all('a[href]').filter(el=>text(el)===record.name)){const id=pageId(a.href);if(id)ids.set(id,'https://www.facebook.com/'+id);}
  const heading=all('h1,h2,h3,[role="heading"]').some(el=>text(el)===record.name);
  if(heading){const id=pageId(location.href);if(id)ids.set(id,'https://www.facebook.com/'+id);}
  if(ids.size>1)throw Error('Ижил нэртэй олон Page ID байна. Гараар шалгана уу.');
  if(ids.size===1){const [id,url]=[...ids][0];return {pageId:id,url};}return null;
 }
 async function execute(job){
  let submitted=false;
  const row=job.record;
  async function stage(stageName,messageText){guard();await message('progress',{jobId:job.id,stage:stageName,message:messageText});}
  async function click(el,stageName='opening',messageText='Meta дээр ажиллаж байна.'){
   if(!enabled(el)||!visible(el))throw Error('Товч идэвхгүй эсвэл харагдахгүй байна.');
   await stage(stageName,messageText);guard();
   if(!el.isConnected||!enabled(el))throw Error('Meta интерфэйс өөрчлөгдсөн.');el.click();
  }
  try{
   guard();
   if(job.kind==='capture'){
    await stage('opening','Page ID хайж байна.');
    return {...await until(()=>capture(row),'Нэртэй тохирох Page ID',12000)};
   }
   if(job.kind!=='create')throw Error('Дэмжигдээгүй ажил.');
   if(field(/^(Page name|Хуудасны нэр)$/i))throw Error('Өмнөх үүсгэх маягт нээлттэй байна. Үр дүнг шалгаад хаана уу.');
   await stage('opening','Бизнесийн багцын цэсийг хайж байна.');
   if(!search()){
    let selector=button(/Select (a )?(business asset|business|portfolio)|Switch (business|portfolio)|Business portfolio selector|Бизнесийн багц сонгох/i);
    if(!selector){
     const candidates=all('button,[role="button"]').map(el=>{
      const r=el.getBoundingClientRect(),name=text(el);
      const popup=el.hasAttribute('aria-haspopup')||el.hasAttribute('aria-expanded'),avatar=!!el.querySelector('img,image,[role="img"]'),icon=!!el.querySelector('svg,i');
      return {el,score:(popup?4:0)+(avatar?4:0)+(icon?1:0),ok:enabled(el)&&r.left>=0&&r.left<340&&r.top>=20&&r.top<190&&r.width>=100&&r.width<=380&&r.height>=28&&r.height<=100&&name.length>0&&name.length<160&&(popup||avatar&&icon)&&!/create|publish|delete|remove|post|notification|settings|search|үүсгэх|устгах/i.test(name)};
     }).filter(x=>x.ok).sort((a,b)=>b.score-a.score);
     if(!candidates.length||candidates.length>1&&candidates[0].score===candidates[1].score)throw Error('Бизнесийн багцын сонгогчийг ялгаж таньсангүй.');
     selector=candidates[0].el;
    }
    await click(selector);
   }
   const searchBox=await until(search,'Бизнесийн багцын цэс');
   await stage('opening','Багц сонгож байна: '+row.portfolio);fill(searchBox,'');
   const portfolio=await until(()=>{
    const matches=byText(row.portfolio);
    // Prefer the left-hand entry, not the matching heading in the details pane.
    const sorted=matches.sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);
    if(!sorted.length)return null;
    const left=sorted.filter(el=>el.getBoundingClientRect().left<sorted[0].getBoundingClientRect().left+24);
    return unique(left,'Бизнесийн багц');
   },row.portfolio);
   await click(portfolio);
   const manage=await until(()=>button(/Manage Pages|Хуудсуудыг удирдах/i),'Manage Pages');
   await until(()=>{
    for(let el=manage.parentElement;el&&el!==document.body;el=el.parentElement){
     if(el.contains(searchBox))return false;
     if(byText(row.portfolio,el).length)return el;
    }return false;
   },'Сонгосон багцын баталгаажуулалт');
   await click(manage);
   const createNew=await until(()=>button(/^Create a new Facebook Page$|^Шинэ Facebook хуудас үүсгэх$/i),'Create a new Facebook Page');
   await click(createNew);
   const name=await until(()=>field(/^(Page name|Хуудасны нэр)$/i),'Page name');
   const scope=name.closest('[role="dialog"]')||document;
   await stage('filling','Нэр, ангилал, танилцуулгыг бөглөж байна.');
   fill(name,row.name);
   const category=field(/^(Category|Ангилал)$/i,scope)||unique(all('input[role="combobox"]',scope),'Ангилал');
   fill(category,row.category);
   const option=await until(()=>unique(all('[role="option"]').filter(el=>text(el)===row.category),'Ангиллын сонголт'),'Ангиллын сонголт');
   await click(option,'filling','Ангилал сонгож байна.');
   fill(field(/^(Bio|Танилцуулга)(\s*[-·]?\s*Optional)?$/i,scope),row.bio);
   await click(await until(()=>button(/^Next$|^Дараах$/i,scope),'Next'),'filling','Мэдээллийг баталгаажуулж байна.');
   const create=await until(()=>button(/^Create Page$|^Create Facebook Page$|^Хуудас үүсгэх$/i),'Create Page');
   const confirmScope=create.closest('[role="dialog"]')||document;
   const unchecked=all('input[type="checkbox"],[role="checkbox"]',confirmScope).some(el=>el.tagName==='INPUT'?!el.checked:el.getAttribute('aria-checked')!=='true');
   if(unchecked)throw Error('Meta нөхцөлийг уншиж гараар зөвшөөрөх шаардлагатай.');
   // Server durably marks uncertainty BEFORE the externally visible click.
   await stage('submitting','Page үүсгэх хүсэлт илгээж байна.');submitted=true;
   guard();if(!enabled(create)||!create.isConnected)throw Error('Create Page товч өөрчлөгдсөн.');
   create.click();
   await until(()=>capture(row)||button(/^Done$|^Дуусгах$/i),'Үүсгэлтийн үр дүн',30000);
   const done=button(/^Done$|^Дуусгах$/i);if(done)await click(done,'submitting','Page ID цуглуулж байна.');
   const result=await until(()=>capture(row),'Page ID',15000);
   return result;
  }catch(e){return {review:submitted||job.kind==='capture',message:e.message};}
 }
 chrome.runtime.onMessage.addListener(message=>{if(message.type==='stop'){stopped=true;generation++;pending=null;}if(message.type==='resume'){stopped=false;generation++;pending=null;}});
 async function tick(){
  if(busy||stopped)return;busy=true;const epoch=generation;
  try{
   if(pending){await message('result',pending);pending=null;}
   const {job}=await message('poll');
   if(job){const result=await execute(job);if(epoch===generation&&!stopped){pending={jobId:job.id,...result};await message('result',pending);pending=null;}}
  }catch{/* The local job lease expires to review; never replay a creation. */}
  finally{busy=false;}
 }
 setInterval(tick,3000);void tick();
})();