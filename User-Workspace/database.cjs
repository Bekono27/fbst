const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('node:crypto');
const defaultBios = ['Хөдөө явах дуртай','Ээжийн цай хамгийн амттай','Өглөө эрт босдог','Гэртээ ном унших дуртай','Ууланд алхах сайхан','Өдөр бүр хөгжим сонсдог','Найзуудтайгаа уулзах дуртай','Намрын өнгөнд дуртай','Гэрийн хоол хамгийн сайхан','Голын эрэг дээр суух дуртай','Бороотой өдөр цай ууна','Орой болгон алхдаг'];
function validBio(bio) {
  return typeof bio === 'string' && /^[А-Яа-яӨөҮүЁё\s.,!?–-]+$/u.test(bio) && bio.trim().split(/\s+/).length >= 3 && bio.trim().split(/\s+/).length <= 8 && bio.length <= 100;
}
function pageIdFromURL(value) {
  try {
    const url = new URL(value);
    if (!/(^|\.)facebook\.com$/.test(url.hostname)) return '';
    const id = url.searchParams.get('asset_id') || url.searchParams.get('page_id') || (url.pathname === '/profile.php' ? url.searchParams.get('id') : null);
    if (id && /^\d+$/.test(id)) return id;
    return url.pathname.match(/^\/(\d+)\/?$/)?.[1] || '';
  } catch { return ''; }
}
function openDatabase(filename) {
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, portfolio TEXT NOT NULL,
      categories TEXT NOT NULL, bio TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
      page_id TEXT UNIQUE, url TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '',
      chosen_category TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS bios (text TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY, record_id TEXT, status TEXT, message TEXT, created_at TEXT);
  `);
  if (!db.prepare("SELECT value FROM settings WHERE key='initialized'").get()) {
    for (const bio of defaultBios) db.prepare('INSERT OR IGNORE INTO bios VALUES (?)').run(bio);
    db.prepare("INSERT INTO settings VALUES ('initialized','1')").run();
  }
  const list = () => db.prepare('SELECT * FROM pages ORDER BY updated_at DESC').all().map(row => ({...row,categories:JSON.parse(row.categories)}));
  const get = id => list().find(row => row.id === id);
  function state(id,status,message,extra={}) {
    const current = get(id);
    if (!current) throw Error('Бүртгэл олдсонгүй.');
    db.prepare('UPDATE pages SET status=?,message=?,page_id=?,url=?,chosen_category=?,updated_at=? WHERE id=?')
      .run(status,message,extra.page_id || current.page_id,extra.url || current.url,extra.chosen_category || current.chosen_category,new Date().toISOString(),id);
    db.prepare('INSERT INTO events(record_id,status,message,created_at) VALUES(?,?,?,?)').run(id,status,message,new Date().toISOString());
    return get(id);
  }
  for (const row of list()) {
    if (['opening','filling','submitting'].includes(row.status)) state(row.id,'review','Ажил тасалдсан. Meta дээр үүссэн эсэхийг шалгана уу.');
  }
  function save(data) {
    const old = data.id && get(data.id);
    if (data.id && !old) throw Error('Бүртгэл олдсонгүй.');
    if (old && ['opening','filling','submitting','review'].includes(old.status)) throw Error('Эхлээд өмнөх ажиллагааг шалгана уу.');
    const name = String(data.name || '').trim(), portfolio = String(data.portfolio || '').trim();
    const categories = [...new Set((data.categories || []).map(v => String(v).trim()).filter(Boolean))];
    if (!name || name.length > 100 || !portfolio || !categories.length || categories.length > 10 || !validBio(data.bio)) throw Error('Нэр, бизнесийн багц, ангилал болон 3–8 үгтэй монгол танилцуулгаа шалгана уу.');
    const id = old?.id || randomUUID();
    db.prepare(`INSERT INTO pages(id,name,portfolio,categories,bio,updated_at) VALUES(?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,portfolio=excluded.portfolio,categories=excluded.categories,bio=excluded.bio,updated_at=excluded.updated_at`)
      .run(id,name,portfolio,JSON.stringify(categories),data.bio.trim(),new Date().toISOString());
    return get(id);
  }
  function capture(id,value,url='') {
    if (!/^\d+$/.test(value)) throw Error('Хуудасны дугаар зөвхөн цифрээс бүрдэнэ.');
    if (url && !/^https:\/\/([a-z0-9-]+\.)*facebook\.com\//i.test(url)) throw Error('Facebook холбоос оруулна уу.');
    const other = list().find(row => row.page_id === value && row.id !== id);
    if (other) throw Error('Энэ дугаар өөр бүртгэлд байна.');
    return state(id,'complete','Хуудасны дугаар хадгалагдлаа.',{page_id:value,url});
  }
  function importRecords(records) {
    if (!Array.isArray(records) || records.length > 10000) throw Error('Бүртгэлийн жагсаалтаа шалгана уу.');
    db.exec('BEGIN');
    let count=0;
    try {
      for (const record of records) {
        if (list().some(row => row.name === record.name && row.portfolio === record.portfolio)) continue;
        const created=save({...record,id:undefined});
        if (record.page_id) capture(created.id,String(record.page_id),record.url || '');
        count++;
      }
      db.exec('COMMIT');
      return count;
    } catch(error) {db.exec('ROLLBACK');throw error;}
  }
  return {db,list,get,state,save,capture,importRecords,bios:()=>db.prepare('SELECT text FROM bios').all().map(row=>row.text),
    saveBios(values) {
      if (!Array.isArray(values) || !values.length || values.length > 100 || !values.every(validBio)) throw Error('3–8 үгтэй монгол танилцуулга оруулна уу.');
      db.exec('BEGIN');
      try { db.exec('DELETE FROM bios'); for(const bio of new Set(values)) db.prepare('INSERT INTO bios VALUES(?)').run(bio); db.exec('COMMIT'); }
      catch(error) { db.exec('ROLLBACK'); throw error; }
    }};
}
module.exports = {openDatabase,validBio,pageIdFromURL};
