const status=document.getElementById('status');
async function act(type){try{const r=await chrome.runtime.sendMessage({type});if(r.error)throw Error(r.error);status.textContent=type==='disconnect'?'Салгалаа.':r.connected===false?'Холбогдоогүй.':r.lastError||'Холболт бэлэн. Tab: '+r.tabId;}catch(e){status.textContent=e.message;}}
document.getElementById('pair').onclick=()=>act('pair');
document.getElementById('disconnect').onclick=()=>act('disconnect');
act('status');