const BASE='http://127.0.0.1:4173';
const isMeta=url=>{try{return new URL(url).origin==='https://business.facebook.com';}catch{return false;}};
chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
async function request(path,body,token){
 const response=await fetch(BASE+'/api/extension/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Workforce-Token':token,'X-Aurant-Extension':chrome.runtime.id},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Local connection failed');return data;
}
async function pair(){
 const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
 if(!tab||!isMeta(tab.url))throw Error('Эхлээд bektas профайл дахь Meta Business Suite tab-аа сонгоно уу.');
 const html=await fetch(BASE+'/',{cache:'no-store',signal:AbortSignal.timeout(10000)}).then(r=>{if(!r.ok)throw Error('Локал апп ажиллахгүй байна.');return r.text();});
 const token=html.match(/const token='([a-f0-9]{64})';/)?.[1];
 if(!token)throw Error('START-WINDOWS.cmd файлыг ажиллуулна уу.');
 await request('pair',{tabId:tab.id},token);
 await chrome.storage.session.set({pair:{token,tabId:tab.id},lastError:''});
 await chrome.scripting.executeScript({target:{tabId:tab.id},files:['meta.js']});
 await chrome.tabs.sendMessage(tab.id,{type:'resume'});
 return {ok:true,tabId:tab.id};
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 (async()=>{
  const popup=sender.url===chrome.runtime.getURL('popup.html')&&!sender.tab;
  if(message.type==='pair'&&popup)return pair();
  const {pair:config}=await chrome.storage.session.get('pair');
  if(message.type==='status'&&popup){const {lastError}=await chrome.storage.session.get('lastError');return {connected:!!config,tabId:config?.tabId,lastError};}
  if(message.type==='disconnect'&&popup){if(config){try{await request('disconnect',{tabId:config.tabId},config.token);}finally{await chrome.storage.session.remove('pair');try{await chrome.tabs.sendMessage(config.tabId,{type:'stop'});}catch{}}}return {ok:true};}
  if(!config||sender.tab?.id!==config.tabId||sender.frameId!==0||!isMeta(sender.url))throw Error('Энэ tab холбогдоогүй.');
  if(!['poll','progress','result'].includes(message.type))throw Error('Unsupported message');
  const body={tabId:config.tabId};
  if(message.type!=='poll')Object.assign(body,{jobId:message.jobId,stage:message.stage,message:message.message,pageId:message.pageId,url:message.url,review:message.review});
  const result=await request(message.type,body,config.token);
  await chrome.storage.session.set({lastError:''});
  return result;
 })().then(reply).catch(async e=>{const {pair:config}=await chrome.storage.session.get('pair');if(config&&sender.tab?.id===config.tabId)await chrome.storage.session.set({lastError:e.message});reply({error:e.message});});
 return true;
});
chrome.tabs.onRemoved.addListener(async tabId=>{
 const {pair:config}=await chrome.storage.session.get('pair');if(config?.tabId===tabId){try{await request('disconnect',{tabId},config.token);}catch{}await chrome.storage.session.remove('pair');}
});
