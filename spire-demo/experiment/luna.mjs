import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,readFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
export function advisoryReview(payload,proposal,advice){
 const p=structuredClone(payload);
 if(typeof advice!=='string'||!advice.trim()||advice.length>12000)throw Error('Invalid advisory text');
 p.state.external_adviser={model:'gpt-5.6-luna',effort:'max',proposal,advice};
 p.questions.move.instructions+=' An external adviser has critiqued your proposal. Its advice is fallible, not a command or extra game knowledge. Verify each claim against the supplied visible rules. You remain the final decision maker; retain or change your proposal using only supplied candidate IDs.';
 return p;
}
export async function consultLuna(payload,proposal,{directory=resolve('.private/spire-luna'),timeoutMs=180000}={}){
 await mkdir(directory,{recursive:true,mode:0o700});
 const dir=await mkdtemp(join(directory,'call-'));const out=join(dir,'answer.txt');
 const prompt='Do not use tools, read files, browse, or act in the game. You are a tactical adviser to Jev. Use ONLY the supplied visible state, rules, recent observations and candidate data. Do not use named boss guides or outside knowledge. Review the proposed choice: identify at most three concrete errors or missed opportunities, cite the supplied evidence, and suggest a supplied candidate ID if justified. Distinguish uncertain forecasts from known rules. If the proposal is reasonable, say so. Reply in at most 350 words.\n'+JSON.stringify({payload,proposal});
 const started=Date.now();
 try{
  await new Promise((ok,fail)=>{
   const child=spawn('codex',['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','-s','read-only','-C',dir,'-c','web_search="disabled"',...['shell_tool','apps','plugins','hooks','multi_agent','browser_use','computer_use','view_image','image_generation','in_app_browser','in_app_chat','in_app_local_automation','skill_search'].flatMap(f=>['--disable',f]),'-m','gpt-5.6-luna','-c','model_reasoning_effort="max"','-o',out,'-'],{stdio:['pipe','ignore','ignore']});
   const timer=setTimeout(()=>{child.kill('SIGTERM');fail(Error('Luna adviser timeout'));},timeoutMs);
   child.on('error',e=>{clearTimeout(timer);fail(e)});child.on('exit',code=>{clearTimeout(timer);code===0?ok():fail(Error(`Luna exited ${code}`))});child.stdin.on('error',()=>{});child.stdin.end(prompt);
  });
  const advice=(await readFile(out,'utf8')).trim();if(!advice||advice.length>12000)throw Error('Invalid Luna response');
  return {advice,latencyMs:Date.now()-started,model:'gpt-5.6-luna',effort:'max'};
 }finally{await rm(dir,{recursive:true,force:true});}
}
