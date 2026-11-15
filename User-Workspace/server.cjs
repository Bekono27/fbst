const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {randomBytes}=require('node:crypto');
const {openDatabase}=require('./database.cjs');
const {Engine}=require('./engine.cjs');
function start({port=4173,directory=path.join(__dirname,'data'),chromium}={}) {
  fs.mkdirSync(directory,{recursive:true});
  const store=openDatabase(path.join(directory,'workforce.sqlite'));
  const engine=new Engine(store,directory,chromium);
  const token=randomBytes(32).toString('hex');
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    const host='127.0.0.1:'+server.address().port;
    if(req.headers.host!==host) {res.writeHead(403);return res.end();}
    function json(code,data) {res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
    try {
      const pathname=new URL(req.url,'http://'+host).pathname;
      if(req.method==='GET' && pathname==='/') {
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
        return res.end(fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace('__LOCAL_TOKEN__',token));
      }
      if(!pathname.startsWith('/api/')) return json(404,{error:'Олдсонгүй.'});
      if(req.headers['x-workforce-token']!==token || (req.headers.origin && req.headers.origin!=='http://'+host)) return json(403,{error:'Холболтын эрхгүй.'});
      if(req.method==='GET' && pathname==='/api/state') return json(200,{pages:store.list(),bios:store.bios(),busy:engine.busy,active:engine.active,browser:!!engine.context});
      let raw='';
      for await(const chunk of req) {raw+=chunk;if(raw.length>1000000) throw Error('Файл хэт том байна.');}
      const body=raw?JSON.parse(raw):{};
      if(req.method!=='POST') return json(405,{error:'Дэмжигдээгүй үйлдэл.'});
      switch(pathname) {
        case '/api/import': return json(200,{count:store.importRecords(body.records)});
        case '/api/save': return json(200,store.save(body));
        case '/api/bios': store.saveBios(body.bios); return json(200,{ok:true});
        case '/api/browser': await engine.open(); return json(200,{ok:true});
        case '/api/create': return json(202,await engine.run(body.id));
        case '/api/capture': return json(200,await engine.capture(body.id));
        case '/api/record-id':
          if(engine.busy) throw Error('Ажиллагаа дуусахыг хүлээнэ үү.');
          return json(200,store.capture(body.id,String(body.pageId||''),body.url||''));
        case '/api/reset':
          if(engine.busy || body.confirmedAbsent!==true || store.get(body.id)?.status!=='review') throw Error('Meta дээр хуудас үүсээгүйг эхлээд шалгана уу.');
          return json(200,store.state(body.id,'draft','Хэрэглэгч үүсээгүйг шалгасан.'));
        default: return json(404,{error:'Олдсонгүй.'});
      }
    } catch(error) {json(400,{error:error.message});}
  });
  server.on('error',error=>{
    console.error(error.code === 'EADDRINUSE'
      ? '4173 порт ашиглагдаж байна. Өмнөх Workforce цонхоо шалгана уу.'
      : 'Үйлчилгээ эхэлсэнгүй: '+error.message);
    process.exitCode=1;
  });
  server.listen(port,'127.0.0.1',()=>{
    const url='http://127.0.0.1:'+server.address().port;
    console.log('Workforce: '+url);
    if (process.platform === 'win32' && process.argv.includes('--open')) {
      require('node:child_process').execFile('cmd.exe',['/d','/s','/c','start "" '+url],error=>{
        if(error) console.log('Хөтөч дээр энэ хаягийг нээнэ үү: '+url);
      });
    }
  });
  return {server,store,engine};
}
if(require.main===module) start();
module.exports={start};
