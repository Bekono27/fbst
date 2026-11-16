let section='pages',groupEdit=null,importData=null,online=null;
const isLocal=!token.startsWith('__LOCAL_');
const tell=message=>$('platform-notice').textContent=message;
async function perform(fn){document.querySelectorAll('.platform-error').forEach(e=>e.remove());try{await fn();}catch(e){tell(e.message);const dialog=document.querySelector('dialog[open]');if(dialog){const p=document.createElement('p');p.className='platform-error';p.setAttribute('role','alert');p.textContent=e.message;dialog.prepend(p);}}}
function downloadJSON(rows,name){const u=URL.createObjectURL(new Blob([JSON.stringify(rows,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function groupRender(){
 const combined=new Map((window.AurantCatalog?.groups||[]).map(g=>[g.url.toLowerCase(),g]));for(const g of state.groups||[])combined.set(g.url.toLowerCase(),g);const groups=[...combined.values()],q=$('group-search').value.toLowerCase();
 $('group-title').textContent=section==='private'?'Хаалттай бүлгүүд':section==='unknown'?'Бүлгийн лавлах · Баталгаажаагүй':'Нээлттэй бүлгүүд';
 const rows=groups.filter(g=>g.privacy===section&&(!$('group-region').value||(g.region||g.notes)===$('group-region').value)&&[g.name,g.url,g.notes].join(' ').toLowerCase().includes(q));
 $('group-count').textContent=rows.length+' бүлэг';$('group-rows').replaceChildren();
 for(const g of rows){const tr=$('group-rows').insertRow(),first=cell(tr,g.name),a=document.createElement('a');a.textContent=g.url;if(/^https:\/\/(www\.)?facebook\.com\/groups\//i.test(g.url))a.href=g.url;a.target='_blank';a.rel='noopener noreferrer';first.append(document.createElement('br'),a);cell(tr,g.members??'—');cell(tr,g.notes||'—');cell(tr,g.updated_at?new Date(g.updated_at).toLocaleString('mn-MN'):'Эх файлаас');const actions=cell(tr,'');if(isLocal&&!g.source_row)button(actions,'Засах',()=>editGroup(g));}
 if(!rows.length){const c=$('group-rows').insertRow().insertCell();c.colSpan=5;c.textContent='Бүлэг алга. Файлаас мэдээлэл оруулна уу.';}
 $('group-add').disabled=$('group-import').disabled=!isLocal||!connected;
 const sync=state.sync||{};$('sync-status').textContent=isLocal?(sync.configured?(sync.lastError|| (sync.working?'Синк хийж байна.':sync.lastSuccess?'Сүүлийн синк: '+new Date(sync.lastSuccess).toLocaleString('mn-MN'):'Сервер холбогдсон. Эхний синк хүлээгдэж байна.')):'Онлайн сервер хараахан холбогдоогүй.'):online?'Онлайн мэдээлэл уншиж байна.':'Онлайн серверийн хаяг болон унших түлхүүрээр холбогдоно уу.';
 $('sync-now').hidden=!isLocal;$('sync-refresh').hidden=isLocal;
}
function changeSection(next){section=next;$('page-panel').hidden=next!=='pages';$('group-panel').hidden=!['public','private','unknown'].includes(next);$('sync-panel').hidden=next!=='sync';for(const name of ['automation','proxies','reports','accounts'])$(name+'-panel').hidden=next!==name;for(const b of document.querySelectorAll('[data-tab]'))b.classList.toggle('primary',b.dataset.tab===next);groupRender();}
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>changeSection(b.dataset.tab);
window.addEventListener('aurant-state',groupRender);$('group-search').oninput=groupRender;
function editGroup(g){groupEdit=g?.id||null;const f=$('group-form');f.reset();for(const k of ['name','url','members','notes'])f.elements[k].value=g?.[k]??'';f.elements.privacy.value=g?.privacy||section;$('group-dialog').showModal();}
$('group-add').onclick=()=>editGroup();
$('group-form').onsubmit=e=>{e.preventDefault();perform(async()=>{const f=$('group-form').elements;await api('groups/save',{id:groupEdit,...Object.fromEntries(['name','url','privacy','members','notes'].map(k=>[k,f[k].value]))});$('group-dialog').close();await refresh();groupRender();tell('Бүлэг хадгалагдлаа.');});};
$('group-export').onclick=()=>downloadJSON((state.groups||[]).filter(g=>g.privacy===section),'groups-'+section+'.json');
$('group-import').onclick=()=>$('group-file').click();
$('group-file').onchange=()=>perform(async()=>{const file=$('group-file').files[0];$('group-file').value='';if(!file)return;if(file.size>5000000)throw Error('Файл 5 MB-аас бага байна.');const text=await file.text();
 if(file.name.toLowerCase().endsWith('.json')){const rows=JSON.parse(text);if(!Array.isArray(rows))throw Error('JSON жагсаалт шаардлагатай.');importData={headers:['name','url','privacy','members','notes'],rows:rows.map(r=>[r.name,r.url,r.privacy||section,r.members??'',r.notes||''])};}else importData=GroupImport.parse(text);
 $('mapping-fields').replaceChildren();const aliases={name:['name','group name','нэр','бүлгийн нэр'],url:['url','link','group url','холбоос'],privacy:['privacy','type','төрөл'],members:['members','member count','гишүүд'],notes:['notes','тэмдэглэл']};
 for(const [key,names] of Object.entries(aliases)){const label=document.createElement('label');label.textContent={name:'Нэр',url:'Холбоос',privacy:'Төрөл',members:'Гишүүд',notes:'Тэмдэглэл'}[key];const select=document.createElement('select');select.name=key;const blank=new Option('Сонгоогүй','');select.add(blank);importData.headers.forEach((h,i)=>select.add(new Option(h,String(i))));const match=importData.headers.findIndex(h=>names.includes(h.trim().toLowerCase()));if(match>=0)select.value=String(match);select.required=['name','url'].includes(key);label.append(select);$('mapping-fields').append(label);}
 $('mapping-preview').textContent=importData.rows.length+' мөр. Эхний мөр: '+importData.rows[0].join(' | ');$('mapping-dialog').showModal();
});
$('mapping-form').onsubmit=e=>{e.preventDefault();perform(async()=>{const f=$('mapping-form').elements;const records=importData.rows.map(row=>{const r={};for(const k of ['name','url','privacy','members','notes'])r[k]=f[k].value===''?'':row[Number(f[k].value)]??'';const p=r.privacy.trim().toLowerCase();r.privacy=!p?section:({'нээлттэй':'public','хаалттай':'private','public':'public','private':'private'}[p]||p);return r;});const result=await api('groups/import',{records});$('mapping-dialog').close();await refresh();groupRender();tell(result.added+' нэмсэн, '+result.skipped+' давхардсан мөр алгассан.');});};
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
