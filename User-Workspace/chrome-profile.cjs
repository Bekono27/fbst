const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
function selectProfile(cache){
 const matches=Object.entries(cache||{}).filter(([key,p])=>/^(Default|Profile \d+)$/.test(key)&&String(p.name||'').trim().toLowerCase()==='bektas');
 if(matches.length!==1)throw Error('Expected exactly one Chrome profile named bektas. Found '+matches.length+'. No alternate profile opened.');
 return matches[0][0];
}
function openBektas(url){
 if(!process.env.LOCALAPPDATA)throw Error('Windows Chrome profile directory unavailable.');
 const root=path.join(process.env.LOCALAPPDATA,'Google','Chrome','User Data');
 const state=JSON.parse(fs.readFileSync(path.join(root,'Local State'),'utf8'));
 const profile=selectProfile(state.profile?.info_cache);
 if(!fs.existsSync(path.join(root,profile)))throw Error('The bektas profile folder is missing.');
 const executable=[process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA].filter(Boolean).map(base=>path.join(base,'Google','Chrome','Application','chrome.exe')).find(p=>fs.existsSync(p));
 if(!executable)throw Error('Google Chrome was not found. No alternate browser opened.');
 const child=spawn(executable,['--user-data-dir='+root,'--profile-directory='+profile,url],{detached:true,stdio:'ignore',shell:false});
 child.on('error',()=>console.error('Could not open bektas. Open the local app in that Chrome profile manually.'));
 child.unref();
 console.log('AURANT dashboard opened in Chrome profile: bektas. Meta automation uses its separate saved browser.');
}
module.exports={openBektas,selectProfile};
