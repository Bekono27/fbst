const fs=require('node:fs');
const path=require('node:path');
const {randomUUID,createHash}=require('node:crypto');
function endpoint(value){const u=new URL(value);if(u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('Серверийн үндсэн HTTPS хаягийг оруулна уу.');if(u.protocol!=='https:'&&!(u.protocol==='http:'&&u.hostname==='127.0.0.1'))throw Error('HTTPS шаардлагатай.');return u.origin;}
function createSync(directory,snapshot){
 const filename=path.join(directory,'online-sync.json');let config={writer:randomUUID()},lastError='',working=false,lastSuccess='';
 if(fs.existsSync(filename))config={...config,...JSON.parse(fs.readFileSync(filename,'utf8'))};
 const persist=()=>{const temp=filename+'.tmp';fs.writeFileSync(temp,JSON.stringify(config),{mode:0o600});fs.renameSync(temp,filename);};
 function status(){return {configured:!!config.endpoint,endpoint:config.endpoint||'',working,lastError,lastSuccess,revision:config.revision||0};}
 async function send(force=false){
  if(!config.endpoint||working)return status();working=true;
  try{const data=snapshot(),digest=createHash('sha256').update(JSON.stringify(data)).digest('hex');if(!force&&config.digest===digest)return status();
   const response=await fetch(config.endpoint+'/snapshot',{method:'PUT',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.key},body:JSON.stringify({writer:config.writer,revision:config.revision||0,data})});
   if(!response.ok)throw Error(response.status===409?'Өөр төхөөрөмжийн мэдээлэл байна. Автоматаар дарж бичихгүй.':'Онлайн сервер алдаа: '+response.status);
   const result=await response.json();config.revision=result.revision;config.digest=digest;persist();lastSuccess=result.updated_at;lastError='';
  }catch(e){lastError=e.message;}finally{working=false;}return status();
 }
 function configure(data){if(working)throw Error('Синк дуусахыг хүлээнэ үү.');const target=endpoint(data.endpoint);if(typeof data.key!=='string'||data.key.length<32)throw Error('Бичих түлхүүр хамгийн багадаа 32 тэмдэгт байна.');if(config.endpoint&&config.endpoint!==target){config.revision=0;config.digest='';}config.endpoint=target;config.key=data.key;persist();lastError='';return status();}
 const timer=setInterval(()=>send(),10000);timer.unref();return {status,send,configure,close:()=>clearInterval(timer)};
}
module.exports={createSync,endpoint};
