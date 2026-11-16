const {execFile}=require('node:child_process');
const REPO='Bekono27/fbst', FILE='public-records.json';
function gh(args,input) {
 return new Promise((resolve,reject)=>{
  const child=execFile('gh',args,{timeout:30000,maxBuffer:8*1024*1024,windowsHide:true},(error,stdout)=>{
   if(error)return reject(Error('GitHub publishing failed. Check gh auth status and repository Contents write access.'));
   try{resolve(JSON.parse(stdout||'{}'));}catch{reject(Error('Invalid GitHub response.'));}
  });
  child.stdin.on('error',()=>{});child.stdin.end(input);
 });
}
function publicRecords(snapshot) {
 return {pages:(snapshot.pages||[]).filter(p=>p.status==='complete'&&/^\d+$/.test(String(p.page_id||''))).map(p=>({
 id:String(p.page_id),page_id:String(p.page_id),name:p.name,bio:p.bio,status:'complete',
 url:'https://www.facebook.com/'+p.page_id,updated_at:p.updated_at
 })),groups:(snapshot.groups||[]).filter(g=>g.privacy==='public'&&/^https:\/\/www\.facebook\.com\/groups\/[\w.-]+\/$/.test(g.url)).map(g=>({
 id:g.id,name:g.name,url:g.url,group_id:g.group_id,privacy:'public',members:g.members,updated_at:g.updated_at
 }))};
}
function mergeRecords(remote,incoming) {
 const merge=(a,b,key)=>{const m=new Map((a||[]).map(r=>[key(r),r]));for(const r of b)m.set(key(r),r);return [...m.values()].sort((a,b)=>key(a).localeCompare(key(b)));};
 return {pages:merge(remote.pages,incoming.pages,p=>String(p.page_id)),groups:merge(remote.groups,incoming.groups,g=>g.url)};
}
function createGithubSync(snapshot,{enabled=process.env.AURANT_PUBLISH==='1',request=gh}={}) {
 let busy=false,lastSuccess='',lastError='',lastDigest='';
 async function send(){
  if(!enabled||busy)return status();
  busy=true;
  try{
   const incoming=publicRecords(snapshot()),digest=JSON.stringify(incoming);
   if(digest===lastDigest)return status();
   const file=await request(['api','repos/'+REPO+'/contents/'+FILE+'?ref=main']);
   const remote=JSON.parse(Buffer.from(file.content,'base64').toString('utf8'));
   const merged=mergeRecords(remote,incoming);
   if(JSON.stringify(merged)!==JSON.stringify({pages:remote.pages,groups:remote.groups})){
    await request(['api','--method','PUT','repos/'+REPO+'/contents/'+FILE,'--input','-'],JSON.stringify({
     message:'Update public Page and group records',branch:'main',sha:file.sha,
     content:Buffer.from(JSON.stringify({...merged,updated_at:new Date().toISOString()},null,2)+'\n').toString('base64')
    }));
   }
   lastDigest=digest;lastSuccess=new Date().toISOString();lastError='';
  }catch(e){lastError=e.message;}finally{busy=false;}
  return status();
 }
 function status(){return {enabled,busy,lastSuccess,lastError};}
 const timer=enabled?setInterval(send,60000):null;timer?.unref();
 if(enabled)void send();
 return {send,status,close(){if(timer)clearInterval(timer);}};
}
module.exports={publicRecords,mergeRecords,createGithubSync};
