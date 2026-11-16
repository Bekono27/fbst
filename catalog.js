(function(){
 const catalog=window.AurantCatalog;let page=0;const size=24;
 $('group-region').onchange=groupRender;
 function renderDrafts(){const query=$('draft-search').value.trim().toLowerCase(),rows=catalog.drafts.filter(r=>[r.name,r.bio].join(' ').toLowerCase().includes(query));const pages=Math.max(1,Math.ceil(rows.length/size));page=Math.min(page,pages-1);$('draft-grid').replaceChildren();
  for(const row of rows.slice(page*size,(page+1)*size)){const card=document.createElement('article');card.className='draft-card';const label=document.createElement('span');label.className='draft-tag';label.textContent='ҮҮСГЭСЭН НООРОГ';const name=document.createElement('h2');name.textContent=row.name;const bio=document.createElement('p');bio.textContent=row.bio;card.append(label,name,bio);$('draft-grid').append(card);}
  $('draft-count').textContent=rows.length+' ноорог · '+(page+1)+' / '+pages;$('draft-prev').disabled=page===0;$('draft-next').disabled=page>=pages-1;$('draft-import').disabled=!isLocal||!connected;
 }
 $('draft-search').oninput=()=>{page=0;renderDrafts();};$('draft-prev').onclick=()=>{page--;renderDrafts();};$('draft-next').onclick=()=>{page++;renderDrafts();};window.addEventListener('aurant-state',renderDrafts);
 $('draft-import').onclick=()=>{$('roster-dialog').showModal();};
 // The existing portfolio/category form validates these before local records are created.
 $('roster-form').onsubmit=event=>{event.preventDefault();perform(async()=>{const f=$('roster-form').elements;const records=catalog.drafts.map(r=>({name:r.name,bio:r.bio,portfolio:f.portfolio.value,categories:f.categories.value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean)}));const result=await api('import',{records});$('roster-dialog').close();await refresh();tell(result.count+' ноорог локал санд нэмлээ. Facebook хуудас үүсгээгүй.');});};
 const importButton=document.createElement('button');importButton.textContent='Лавлахыг локал санд оруулах';importButton.disabled=!isLocal||!connected;$('group-import').after(importButton);window.addEventListener('aurant-state',()=>{importButton.disabled=!isLocal||!connected;});
 importButton.onclick=()=>perform(async()=>{const result=await api('groups/import',{records:catalog.groups.map(g=>({name:g.name,url:g.url,privacy:g.privacy,region:GroupTools.region(g.region),source:'Эх spreadsheet',notes:'',members:null}))});await refresh();tell(result.added+' бүлэг нэмсэн, '+result.skipped+' давхардсан холбоос алгассан.');});
 renderDrafts();groupRender();if(!isLocal)changeSection('accounts');
 const opening=$('opening'),main=document.querySelector('main');let seen=false;try{seen=sessionStorage.getItem('aurant-intro-v1')==='seen';}catch{}
 if(!seen&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const previous=document.activeElement;let timer;const close=()=>{clearTimeout(timer);opening.hidden=true;main.inert=false;document.removeEventListener('keydown',escape);previous?.focus();try{sessionStorage.setItem('aurant-intro-v1','seen');}catch{}};const escape=e=>{if(e.key==='Escape')close();};opening.hidden=false;main.inert=true;$('opening-skip').onclick=close;$('opening-skip').focus();document.addEventListener('keydown',escape);timer=setTimeout(close,5000);}
})();
