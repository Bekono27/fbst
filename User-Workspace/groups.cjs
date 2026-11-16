const {randomUUID}=require('node:crypto');
function groupStore(db){
 db.exec(`CREATE TABLE IF NOT EXISTS groups(id TEXT PRIMARY KEY,name TEXT NOT NULL,url TEXT NOT NULL UNIQUE,group_id TEXT NOT NULL,privacy TEXT NOT NULL,members INTEGER,notes TEXT NOT NULL,updated_at TEXT NOT NULL);`);
 const list=()=>db.prepare('SELECT * FROM groups ORDER BY updated_at DESC').all();
 function normalize(data){
  const name=String(data.name||'').trim(),privacy=String(data.privacy||'').toLowerCase();
  if(!name||name.length>200||!['public','private','unknown'].includes(privacy))throw Error('Бүлгийн нэр, нээлттэй эсвэл хаалттай төрлийг шалгана уу.');
  let u;try{u=new URL(data.url);}catch{throw Error('Бүлгийн холбоос буруу байна.');}
  const slug=u.pathname.match(/^\/groups\/([a-zA-Z0-9._-]+)\/?$/)?.[1];
  if(u.protocol!=='https:'||!['facebook.com','www.facebook.com','m.facebook.com'].includes(u.hostname)||!slug)throw Error('https://www.facebook.com/groups/… холбоос оруулна уу.');
  const members=data.members===''||data.members==null?null:Number(data.members);
  if(members!==null&&(!Number.isSafeInteger(members)||members<0))throw Error('Гишүүдийн тоо бүхэл тоо байна.');
  const notes=String(data.notes||'').trim();if(notes.length>5000)throw Error('Тэмдэглэл хэт урт байна.');
  return {name,privacy,url:'https://www.facebook.com/groups/'+slug+'/',group_id:/^\d+$/.test(slug)?slug:'',members,notes};
 }
 function save(data){
  const g=normalize(data),old=data.id&&db.prepare('SELECT id FROM groups WHERE id=?').get(data.id);
  if(data.id&&!old)throw Error('Бүлэг олдсонгүй.');
  const existing=db.prepare('SELECT id FROM groups WHERE url=?').get(g.url);
  if(existing&&existing.id!==data.id)throw Error('Энэ бүлэг бүртгэлтэй байна.');
  const id=data.id||randomUUID();
  db.prepare(`INSERT INTO groups VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,url=excluded.url,group_id=excluded.group_id,privacy=excluded.privacy,members=excluded.members,notes=excluded.notes,updated_at=excluded.updated_at`).run(id,g.name,g.url,g.group_id,g.privacy,g.members,g.notes,new Date().toISOString());
  return list().find(g=>g.id===id);
 }
 function importRows(rows){
  if(!Array.isArray(rows)||!rows.length||rows.length>10000)throw Error('1–10000 мөр оруулна уу.');
  const valid=rows.map((r,i)=>{try{return normalize(r);}catch(e){throw Error((i+2)+' мөр: '+e.message);}});
  let added=0,skipped=0;db.exec('BEGIN');
  try{for(const r of valid){if(db.prepare('SELECT id FROM groups WHERE url=?').get(r.url)){skipped++;continue;}save(r);added++;}db.exec('COMMIT');return {added,skipped};}catch(e){db.exec('ROLLBACK');throw e;}
 }
 return {list,save,importRows};
}
module.exports={groupStore};
