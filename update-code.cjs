const {execFileSync}=require('node:child_process');
const root=__dirname;
function git(args){return execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}).trim();}
try{
 if(git(['rev-parse','--show-toplevel']).replace(/\\/g,'/').toLowerCase()!==root.replace(/\\/g,'/').toLowerCase())throw Error('Use a Git clone of this repository.');
 const remote=git(['remote','get-url','origin']);
 if(!/^(https:\/\/github\.com\/Bekono27\/fbst(?:\.git)?|git@github\.com:Bekono27\/fbst(?:\.git)?)$/i.test(remote))throw Error('Unexpected repository origin; update skipped.');
 if(git(['branch','--show-current'])!=='main')throw Error('Switch to main to update.');
 if(git(['status','--porcelain']))throw Error('Local code changes found; update skipped to preserve them.');
 git(['fetch','origin','main']);
 git(['merge','--ff-only','origin/main']);
 console.log('AURANT code is up to date. Local database and browser session preserved.');
}catch(e){console.log('Automatic code update skipped: '+(e.status!==undefined?'Git is unavailable, offline, or the histories diverged.':e.message));}
