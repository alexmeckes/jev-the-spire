import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deliberate} from '../deliberation.mjs';
import {enginePaceDeliberate} from './engine-pace.mjs';
import {decisionCandidates} from '../planner.mjs';
import {encounterMemory} from '../encounters.mjs';
import {cases,grade} from '../benchmark/suite.mjs';
import {freshCases,gradeFresh} from '../benchmark/fresh-suite.mjs';
const root=new URL('../../',import.meta.url), samples=[];
for(const session of ['2026-09-22T02-55-34.454Z','2026-09-22T08-34-14.523Z','2026-09-22T09-23-10.034Z']){
 const events=(await readFile(new URL('.private/spire-runs/'+session+'.jsonl',root),'utf8')).trim().split('\n').map(JSON.parse);let rewards=0;const rounds=new Set();
 for(const e of events){if(e.kind!=='decision'||e.outcome!=='executed')continue;const s=e.state;
  const reward=s.state_type==='card_reward'&&s.run.act===2&&rewards<2;
  const boss=s.run.act===2&&s.run.floor===33&&[2,4].includes(s.battle?.round)&&!rounds.has(s.battle.round);
  if(!reward&&!boss)continue;if(reward)rewards++;if(boss)rounds.add(s.battle.round);
  samples.push({id:session+'-'+(reward?'reward'+rewards:'round'+s.battle.round),variant:reward?'engine':'pace',state:s,recent:e.memory,candidates:e.candidates,recorded:e.chosen?.label});
 }
}
for(const t of [...cases.filter(c=>c.check),...freshCases]){
 const f=JSON.parse(await readFile(new URL('spire-demo/fixtures/'+t.fixture+'.json',root)));
 samples.push({id:t.fixture,variant:'pace',state:f.state,recent:encounterMemory(f.state,f.history??[]),candidates:decisionCandidates(f.state),test:t});
}
const dir=new URL('.private/spire-engine-pace/'+new Date().toISOString().replaceAll(':','-')+'/',root);await mkdir(dir,{recursive:true});
await writeFile(new URL('inputs.json',dir),JSON.stringify(samples));
for(const file of ['engine-pace.mjs','run-engine-pace.mjs'])await writeFile(new URL(file,dir),await readFile(new URL(file,import.meta.url)));
const cfg=await readFile(new URL('.private/typesafe.cfg',root),'utf8'),key=process.env.TYPESAFE_API_KEY??cfg.match(/^api_key\s*=\s*"?([^"\r\n]+)"?/m)?.[1]?.trim();
let tokens=0;const results=[];
for(let repeat=0;repeat<2;repeat++)for(const [i,s] of samples.entries())for(const policy of (i+repeat)%2?[s.variant,'current']:['current',s.variant]){
 const calls=[],start=Date.now();let row={id:s.id,policy,repeat,recorded:s.recorded};
 try{
  const opts={state:s.state,candidates:s.candidates,recent:s.recent,ask:async payload=>{
   if(tokens>1800000)throw Error('Local benchmark budget reached');
   const r=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('HTTP '+r.status);
   const response=await r.json();tokens+=response.usage?.input_tokens??0;calls.push({request:payload,response});return response;
  }};
  const result=policy==='current'?await deliberate(opts):await enginePaceDeliberate(opts,policy);
  const c=s.candidates.find(c=>c.id===result.answers?.move?.choice);if(!c)throw Error('Invalid choice');
  row={...row,label:c.label,command:c.command,forecast:c.forecast,grade:s.test?(s.id.startsWith('fresh-')?gradeFresh:grade)(s.test,c):{status:'review-only'}};
 }catch(e){row.error=e.message;}
 row.ms=Date.now()-start;results.push(row);
 await writeFile(new URL(`${s.id}.${policy}.${repeat}.json`,dir),JSON.stringify({row,calls}),{mode:0o600});
 await writeFile(new URL('results.json',dir),JSON.stringify({results,tokens,scope:'Frozen recorded choices; no game execution or full-fight win claims.'},null,2));console.log(JSON.stringify({id:s.id,policy,repeat,label:row.label,grade:row.grade,error:row.error}));
 if(row.error)throw Error(row.error);
}
console.log('Saved '+dir.pathname);
