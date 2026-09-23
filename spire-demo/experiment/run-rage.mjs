import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deliberate} from '../deliberation.mjs';
import {rageDeliberate} from './rage-order.mjs';
import {decisionCandidates} from '../planner.mjs';
import {encounterMemory} from '../encounters.mjs';
import {cases,grade} from '../benchmark/suite.mjs';
import {freshCases,gradeFresh} from '../benchmark/fresh-suite.mjs';
const root=new URL('../../',import.meta.url),samples=JSON.parse(await readFile(new URL('.private/spire-rage/inputs.json',root)));
const dir=new URL('.private/spire-rage/'+new Date().toISOString().replaceAll(':','-')+'/',root);await mkdir(dir,{recursive:true});
await writeFile(new URL('inputs.json',dir),JSON.stringify(samples));
for(const file of ['rage-order.mjs','run-rage.mjs'])await writeFile(new URL(file,dir),await readFile(new URL(file,import.meta.url)));
const cfg=await readFile(new URL('.private/typesafe.cfg',root),'utf8'),key=process.env.TYPESAFE_API_KEY??cfg.match(/^api_key\s*=\s*"?([^"\r\n]+)"?/m)?.[1]?.trim();
let tokens=0;const results=[];
for(let repeat=0;repeat<2;repeat++)for(const [i,s] of samples.entries())for(const policy of (i+repeat)%2?['rage','current']:['current','rage']){
 const calls=[],start=Date.now();let row={id:s.id,policy,repeat,recorded:s.recorded,eligible:s.eligible};
 try{
  const opts={state:s.state,candidates:s.candidates,recent:s.recent,ask:async payload=>{
   if(tokens>2000000)throw Error('Local benchmark budget reached');
   const r=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('HTTP '+r.status);
   const response=await r.json();tokens+=response.usage?.input_tokens??0;calls.push({request:payload,response});return response;
  }};
  const result=policy==='current'?await deliberate(opts):await rageDeliberate(opts);
  const c=s.candidates.find(c=>c.id===result.answers?.move?.choice);if(!c)throw Error('Invalid choice');
  row={...row,label:c.label,command:c.command,forecast:c.forecast,grade:s.test?(s.id.startsWith('fresh-')?gradeFresh:grade)(s.test,c):{status:'review-only'}};
 }catch(e){row.error=e.message;}
 row.ms=Date.now()-start;results.push(row);
 await writeFile(new URL(`${s.id}.${policy}.${repeat}.json`,dir),JSON.stringify({row,calls}),{mode:0o600});
 await writeFile(new URL('results.json',dir),JSON.stringify({results,tokens,scope:'Frozen recorded choices; no game execution or full-fight win claims.'},null,2));console.log(JSON.stringify({id:s.id,policy,repeat,label:row.label,grade:row.grade,error:row.error}));
 if(row.error)throw Error(row.error);
}
console.log('Saved '+dir.pathname);
