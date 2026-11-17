(function(root){
 const provinces=['Архангай','Баян-Өлгий','Баянхонгор','Булган','Говь-Алтай','Говьсүмбэр','Дархан-Уул','Дорноговь','Дорнод','Дундговь','Завхан','Орхон','Өвөрхангай','Өмнөговь','Сүхбаатар','Сэлэнгэ','Төв','Увс','Ховд','Хөвсгөл','Хэнтий'];
 const districts=['Багануур','Багахангай','Баянгол','Баянзүрх','Налайх','Сонгинохайрхан','Сүхбаатар дүүрэг','Хан-Уул','Чингэлтэй'];
 const latin=['Arkhangai','Bayan-Ulgii','Bayankhongor','Bulgan','Govi-Altai','Govisumber','Darkhan-Uul','Dornogovi','Dornod','Dundgovi','Zavkhan','Orkhon','Uvurkhangai','Umnugovi','Sukhbaatar','Selenge','Tuv','Uvs','Khovd','Khuvsgul','Khentii'];
 const key=v=>String(v||'').trim().toLowerCase().replace(/[–—_]/g,'-').replace(/\s+/g,' ');
 const aliases=new Map(latin.map((v,i)=>[key(v),provinces[i]]));
 function region(value){
  const raw=String(value||'').trim();if(!raw)return 'Тодорхойгүй';
  let v=key(raw).replace(/\s+(aimag|province|аймаг)$/,'');
  if(['улс','national','nationwide','mongolia','монгол','монгол улс'].includes(v))return 'Улсын хэмжээнд';
  if(['ub','улаанбаатар','ulaanbaatar'].includes(v))return 'Улаанбаатар';
  const districtNames=['Baganuur','Bagakhangai','Bayangol','Bayanzurkh','Nalaikh','Songinokhairkhan','Sukhbaatar','Khan-Uul','Chingeltei'];
  if(/ (district|дүүрэг)$/.test(v)){const stem=v.replace(/ (district|дүүрэг)$/,'');const i=districtNames.findIndex(n=>key(n)===stem);if(i>=0)return districts[i];const mn=districts.find(n=>key(n).replace(/ дүүрэг$/,'')===stem);if(mn)return mn;}
  const canonical=[...provinces,...districts].find(n=>key(n)===v);
  return canonical||aliases.get(v)||raw;
 }
 function bucket(value){const v=region(value);return provinces.includes(v)?'Аймаг':districts.includes(v)||v==='Улаанбаатар'?'Улаанбаатар ба дүүрэг':v==='Улсын хэмжээнд'?'Улсын хэмжээнд':v==='Тодорхойгүй'?'Тодорхойгүй':'Бусад бүс / сэдэв';}
 function members(value){if(value==null||String(value).trim()==='')return null;const s=String(value).trim().replace(/[,\s]/g,'');if(!/^\d+$/.test(s)||!Number.isSafeInteger(Number(s)))throw Error('Гишүүдийн тоо бүхэл тоо байх ёстой.');return Number(s);}
 function csv(rows){
  const headers=['Name','Type','Region','Size','Source','Link','Privacy','Notes','Search URL'];
  const esc=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  return '\uFEFF'+[headers,...rows.map(g=>[g.name,'group',region(g.region),g.members,g.source||'',g.url,g.privacy,g.notes||'',g.search_url||''])].map(r=>r.map(esc).join(',')).join('\r\n');
 }
 const api={provinces,districts,region,bucket,members,csv};if(typeof module!=='undefined')module.exports=api;else root.GroupTools=api;
})(typeof window!=='undefined'?window:globalThis);
