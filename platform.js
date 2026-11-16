let section='pages',groupEdit=null,importData=null,online=null;
const isLocal=!token.startsWith('__LOCAL_');
const tell=message=>$('platform-notice').textContent=message;
async function perform(fn){document.querySelectorAll('.platform-error').forEach(e=>e.remove());try{await fn();}catch(e){tell(e.message);const dialog=document.querySelector('dialog[open]');if(dialog){const p=document.createElement('p');p.className='platform-error';p.setAttribute('role','alert');p.textContent=e.message;dialog.prepend(p);}}}
function downloadJSON(rows,name){const u=URL.createObjectURL(new Blob([JSON.stringify(rows,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
let groupPage=0,groupSignature='',groupFiltered=[];
function combinedGroups(){
 const combined=new Map((window.AurantCatalog?.groups||[]).map(g=>[g.url.toLowerCase(),{...g,source:g.source||'Эх spreadsheet'}]));
 for(const g of state.groups||[])combined.set(g.url.toLowerCase(),{...combined.get(g.url.toLowerCase()),...g,region:g.region||combined.get(g.url.toLowerCase())?.region||'',source:g.source||'Локал бүртгэл'});
 return [...combined.values()].map(g=>({...g,region:GroupTools.region(g.region||''),source:g.source||'Тодорхойгүй'}));
}
function refreshOptions(id,values,first,grouped=false){
 const el=$(id),selected=el.value,signature=values.join('|');
 if(el.dataset.options===signature)return;
 el.dataset.options=signature;el.replaceChildren(new Option(first,''));
 if(grouped){for(const title of ['Улсын хэмжээнд','Аймаг','Улаанбаатар ба дүүрэг','Бусад бүс / сэдэв','Тодорхойгүй']){
 const options=values.filter(v=>GroupTools.bucket(v)===title);if(!options.length)continue;
 const optgroup=document.createElement('optgroup');optgroup.label=title;for(const v of options)optgroup.append(new Option(v,v));el.append(optgroup);
 }}else for(const value of values)el.add(new Option(value,value));
 if(values.includes(selected))el.value=selected;
}
function groupRender(){
 const groups=combinedGroups(),q=$('group-search').value.trim().toLowerCase();
 refreshOptions('group-region',[...new Set(groups.map(g=>g.region))].sort((a,b)=>a.localeCompare(b,'mn')),'Бүх аймаг / дүүрэг',true);
 refreshOptions('group-source-filter',[...new Set(groups.map(g=>g.source))].sort(),'Бүх эх сурвалж');
 $('group-title').textContent=section==='private'?'Хаалттай бүлгүүд':section==='public'?'Нээлттэй бүлгүүд':'Монголын Facebook бүлгийн лавлах';
 const privacy=['public','private'].includes(section)?section:$('group-privacy-filter').value;
 $('group-privacy-filter').disabled=['public','private'].includes(section);
 const minimum=$('group-min').value===''?null:Number($('group-min').value),maximum=$('group-max').value===''?null:Number($('group-max').value);
 const valid=$('group-min').checkValidity()&&$('group-max').checkValidity()&&(minimum===null||maximum===null||minimum<=maximum);
 const rows=valid?groups.filter(g=>(!privacy||g.privacy===privacy)&&(!$('group-region').value||g.region===$('group-region').value)&&(!$('group-source-filter').value||g.source===$('group-source-filter').value)&&[g.name,g.region,g.url,g.notes].join(' ').toLowerCase().includes(q)&&((minimum===null&&maximum===null)||(g.members!=null&&(minimum===null||g.members>=minimum)&&(maximum===null||g.members<=maximum)))):[];
 const sort=$('group-sort').value;
 rows.sort((a,b)=>sort==='region'?a.region.localeCompare(b.region,'mn')||a.name.localeCompare(b.name,'mn'):sort==='name'?a.name.localeCompare(b.name,'mn'):a.members==null?(b.members==null?0:1):b.members==null?-1:sort==='size-asc'?a.members-b.members:b.members-a.members);
 const signature=JSON.stringify([section,q,privacy,$('group-region').value,$('group-source-filter').value,minimum,maximum,sort]);
 if(signature!==groupSignature){groupPage=0;groupSignature=signature;}
 groupFiltered=rows;const pages=Math.max(1,Math.ceil(rows.length/50));groupPage=Math.min(groupPage,pages-1);
 $('group-count').textContent=valid?rows.length+' харагдаж байна / '+groups.length+' нийт · '+(groupPage+1)+' / '+pages:'Доод болон дээд хэмжээг шалгана уу.';
 $('group-rows').replaceChildren();let previous='';
 for(const [i,g] of rows.slice(groupPage*50,(groupPage+1)*50).entries()){
 if(sort==='region'&&g.region!==previous){const header=$('group-rows').insertRow().insertCell();header.colSpan=8;header.textContent=GroupTools.bucket(g.region)+' · '+g.region;header.style.background='#1c304b';previous=g.region;}
 const tr=$('group-rows').insertRow();cell(tr,String(groupPage*50+i+1));cell(tr,g.name);
 cell(tr,'Бүлэг · '+({public:'нээлттэй',private:'хаалттай',unknown:'тодорхойгүй'}[g.privacy]||'тодорхойгүй'));
 cell(tr,g.region);cell(tr,g.members==null?'—':Number(g.members).toLocaleString('en-US'));cell(tr,g.source);
 const linkCell=cell(tr,''),a=document.createElement('a');a.textContent='Нээх ↗';if(/^https:\/\/(www\.)?facebook\.com\/groups\//i.test(g.url))a.href=g.url;a.target='_blank';a.rel='noopener noreferrer';linkCell.append(a);
 const actions=cell(tr,'');if(isLocal&&connected&&(state.groups||[]).some(local=>local.id===g.id))button(actions,'Засах',()=>editGroup(g));
 }
 if(!rows.length){const c=$('group-rows').insertRow().insertCell();c.colSpan=8;c.textContent='Тохирох бүлэг алга.';}
 $('group-prev').disabled=groupPage===0;$('group-next').disabled=groupPage>=pages-1;
 $('group-add').disabled=$('group-import').disabled=!isLocal||!connected;
 const sync=state.sync||{};$('sync-status').textContent=isLocal?(sync.configured?(sync.lastError|| (sync.working?'Синк хийж байна.':sync.lastSuccess?'Сүүлийн синк: '+new Date(sync.lastSuccess).toLocaleString('mn-MN'):'Сервер холбогдсон. Эхний синк хүлээгдэж байна.')):'Онлайн сервер хараахан холбогдоогүй.'):online?'Онлайн мэдээлэл уншиж байна.':'Онлайн серверийн хаяг болон унших түлхүүрээр холбогдоно уу.';
 $('sync-now').hidden=!isLocal;$('sync-refresh').hidden=isLocal;
}
function changeSection(next){section=next;$('page-panel').hidden=next!=='pages';$('group-panel').hidden=!['public','private','unknown'].includes(next);$('sync-panel').hidden=next!=='sync';for(const name of ['automation','proxies','reports','accounts'])$(name+'-panel').hidden=next!==name;for(const b of document.querySelectorAll('[data-tab]'))b.classList.toggle('primary',b.dataset.tab===next);groupRender();}
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>changeSection(b.dataset.tab);
window.addEventListener('aurant-state',groupRender);$('group-search').oninput=groupRender;
for(const id of ['group-region','group-source-filter','group-privacy-filter','group-min','group-max','group-sort'])$(id).oninput=groupRender;
$('group-prev').onclick=()=>{groupPage--;groupRender();};$('group-next').onclick=()=>{groupPage++;groupRender();};
function editGroup(g){groupEdit=g?.id||null;const f=$('group-form');f.reset();for(const k of ['name','url','members','notes','region','source'])f.elements[k].value=g?.[k]??'';f.elements.privacy.value=g?.privacy||(['public','private'].includes(section)?section:'unknown');$('group-dialog').showModal();}
$('group-add').onclick=()=>editGroup();
$('group-form').onsubmit=e=>{e.preventDefault();perform(async()=>{const f=$('group-form').elements;await api('groups/save',{id:groupEdit,...Object.fromEntries(['name','url','privacy','members','notes','region','source'].map(k=>[k,f[k].value]))});$('group-dialog').close();await refresh();groupRender();tell('Бүлэг хадгалагдлаа.');});};
$('group-export').onclick=()=>{const u=URL.createObjectURL(new Blob([GroupTools.csv(groupFiltered)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='mongolia-facebook-groups.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
$('group-import').onclick=()=>$('group-file').click();
$('group-file').onchange=()=>perform(async()=>{const file=$('group-file').files[0];$('group-file').value='';if(!file)return;if(file.size>5000000)throw Error('Файл 5 MB-аас бага байна.');const text=await file.text();
 if(file.name.toLowerCase().endsWith('.json')){const rows=JSON.parse(text);if(!Array.isArray(rows))throw Error('JSON жагсаалт шаардлагатай.');importData={headers:['name','url','privacy','members','notes','region','source'],rows:rows.map(r=>[r.name,r.url,r.privacy||'unknown',r.members??'',r.notes||'',r.region||'',r.source||''])};}else importData=GroupImport.parse(text);
 importData.filename=file.name;
 $('mapping-fields').replaceChildren();const aliases={name:['name','group name','нэр','бүлгийн нэр'],url:['url','link','group url','холбоос'],privacy:['privacy','visibility','нууцлал'],members:['members','member count','size','гишүүд'],notes:['notes','тэмдэглэл'],region:['region','province','state','aimag','district','аймаг','дүүрэг','бүс'],source:['source','эх сурвалж']};
 for(const [key,names] of Object.entries(aliases)){const label=document.createElement('label');label.textContent={name:'Нэр',url:'Холбоос',privacy:'Нууцлал',members:'Гишүүд',notes:'Тэмдэглэл',region:'Аймаг / дүүрэг',source:'Эх сурвалж'}[key];const select=document.createElement('select');select.name=key;const blank=new Option('Сонгоогүй','');select.add(blank);importData.headers.forEach((h,i)=>select.add(new Option(h,String(i))));const match=importData.headers.findIndex(h=>names.includes(h.trim().toLowerCase()));if(match>=0)select.value=String(match);select.required=['name','url'].includes(key);label.append(select);$('mapping-fields').append(label);}
 $('mapping-preview').textContent=importData.rows.length+' мөр. Эхний мөр: '+importData.rows[0].join(' | ');$('mapping-dialog').showModal();
});
$('mapping-form').onsubmit=e=>{e.preventDefault();perform(async()=>{const f=$('mapping-form').elements;const records=importData.rows.map(row=>{const r={};for(const k of ['name','url','privacy','members','notes','region','source'])r[k]=f[k].value===''?'':row[Number(f[k].value)]??'';const p=r.privacy.trim().toLowerCase();r.privacy=!p?'unknown':({'нээлттэй':'public','хаалттай':'private','public':'public','private':'private'}[p]||p);r.region=GroupTools.region(r.region);r.members=GroupTools.members(r.members);r.source=r.source||importData.filename||'CSV';return r;});const result=await api('groups/import',{records});$('mapping-dialog').close();await refresh();groupRender();tell(result.added+' нэмсэн, '+result.skipped+' давхардсан мөр алгассан.');});};
async function readOnline(){if(!online)return;const response=await fetch(online.endpoint+'/snapshot',{headers:{Authorization:'Bearer '+online.key},redirect:'error',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Онлайн холболт алдаа: '+response.status);const snapshot=await response.json();state={...snapshot.data,busy:false};render();for(const b of $('rows').querySelectorAll('button'))b.remove();$('browser').disabled=true;groupRender();$('sync-status').textContent=snapshot.updated_at?'Сүүлийн шинэчлэлт: '+new Date(snapshot.updated_at).toLocaleString('mn-MN'):'Одоогоор синк хийгдээгүй.';tell('Онлайн мэдээлэл шинэчлэгдлээ.');}
$('sync-form').onsubmit=e=>{e.preventDefault();perform(async()=>{const f=$('sync-form').elements,url=new URL(f.endpoint.value);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Серверийн үндсэн HTTPS хаяг шаардлагатай.');if(isLocal){await api('sync/configure',{endpoint:url.origin,key:f.key.value});f.key.value='';await api('sync/run',{});await refresh();groupRender();}else{online={endpoint:url.origin,key:f.key.value};f.key.value='';await readOnline();}});};
$('sync-now').onclick=()=>perform(async()=>{await api('sync/run',{});await refresh();groupRender();});$('sync-refresh').onclick=()=>perform(readOnline);
groupRender();

const githubNotice=document.createElement('p');$('sync-panel').append(githubNotice);
window.addEventListener('aurant-state',()=>{const g=state.github;if(g)githubNotice.textContent=g.enabled?(g.lastError||('GitHub: '+(g.lastSuccess||'Хүлээгдэж байна'))):'GitHub нийтлэх: START-PUBLISHING-WINDOWS.cmd файлыг ажиллуулна уу.';});
if(!isLocal){
 async function readPublicRecords(){
  if(online)return;
  try{
   const response=await fetch('./public-records.json',{cache:'no-store'});
   if(!response.ok)throw Error('Public records unavailable');
   const data=await response.json();
   if(online)return;
   state={...state,pages:data.pages||[],groups:data.groups||[],busy:false};
   render();for(const b of $('rows').querySelectorAll('button'))b.remove();
   $('browser').disabled=true;groupRender();
  }catch{tell('Нийтлэгдсэн мэдээллийг шинэчилж чадсангүй.');}
 }
 void readPublicRecords();setInterval(readPublicRecords,60000);
}
