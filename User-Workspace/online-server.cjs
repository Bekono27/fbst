// Run behind an HTTPS reverse proxy with a persistent data volume.
const http=require('node:http');const fs=require('node:fs');const path=require('node:path');const {DatabaseSync}=require('node:sqlite');const {timingSafeEqual}=require('node:crypto');
function startOnline({port=Number(process.env.PORT||4180),host=process.env.HOST||'127.0.0.1',directory=process.env.DATA_DIR||path.join(__dirname,'data-online'),readKey=process.env.AURANT_READ_KEY,writeKey=process.env.AURANT_WRITE_KEY,origins=(process.env.AURANT_ORIGINS||'https://mnanalyze.com,https://bekono27.github.io').split(',')}={}){
 if(!readKey||!writeKey||readKey.length<32||writeKey.length<32||readKey===writeKey)throw Error('Set distinct AURANT_READ_KEY and AURANT_WRITE_KEY (32+ characters).');
 fs.mkdirSync(directory,{recursive:true});const db=new DatabaseSync(path.join(directory,'online.sqlite'));db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS snapshots(id INTEGER PRIMARY KEY CHECK(id=1),writer TEXT,revision INTEGER,data TEXT,updated_at TEXT);');
 const matches=(value,key)=>{const a=Buffer.from(value||''),b=Buffer.from('Bearer '+key);return a.length===b.length&&timingSafeEqual(a,b);};
 const server=http.createServer(async(req,res)=>{
  const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Vary','Origin');
  if(req.headers.origin){if(!origins.includes(req.headers.origin))return reply(403,{error:'Origin denied'});res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','GET, PUT, OPTIONS');}
  if(req.url!=='/snapshot')return reply(404,{error:'Not found'});
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
  const write=matches(req.headers.authorization,writeKey),read=matches(req.headers.authorization,readKey);
  if(!write&&!read)return reply(401,{error:'Unauthorized'});
  if(req.method==='GET'){const row=db.prepare('SELECT * FROM snapshots WHERE id=1').get();return reply(200,row?{revision:row.revision,updated_at:row.updated_at,data:JSON.parse(row.data)}:{revision:0,updated_at:null,data:{pages:[],groups:[],bios:[]}});}
  if(req.method!=='PUT'||!write)return reply(403,{error:'Read only'});
  try{let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>10*1024*1024)return reply(413,{error:'Too large'});}const body=JSON.parse(raw);
   if(typeof body.writer!=='string'||body.writer.length>100||!Number.isSafeInteger(body.revision)||!body.data||!Array.isArray(body.data.pages)||!Array.isArray(body.data.groups)||!Array.isArray(body.data.bios))return reply(400,{error:'Invalid snapshot'});
   const previous=db.prepare('SELECT writer,revision,data,updated_at FROM snapshots WHERE id=1').get();
   if(previous&&previous.writer===body.writer&&previous.revision===body.revision+1&&previous.data===JSON.stringify(body.data))return reply(200,{revision:previous.revision,updated_at:previous.updated_at});
   if(previous&&(previous.writer!==body.writer||previous.revision!==body.revision)||!previous&&body.revision!==0)return reply(409,{error:'Snapshot conflict'});
   const revision=(previous?.revision||0)+1,updated_at=new Date().toISOString();
   db.prepare('INSERT INTO snapshots VALUES(1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET writer=excluded.writer,revision=excluded.revision,data=excluded.data,updated_at=excluded.updated_at').run(body.writer,revision,JSON.stringify(body.data),updated_at);
   reply(200,{revision,updated_at});
  }catch{reply(400,{error:'Invalid request'});}
 });server.listen(port,host);return {server,db};
}
if(require.main===module)startOnline();module.exports={startOnline};
