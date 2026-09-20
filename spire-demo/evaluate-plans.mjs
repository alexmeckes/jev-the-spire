import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {encounterMemory} from './encounters.mjs';
import {deliberate} from './deliberation.mjs';
import {performance} from 'node:perf_hooks';
import {actionsFor,makeQuestion} from './actions.mjs';
import {decisionCandidates,decisionQuestion,POLICY_VERSION} from './planner.mjs';

const config=await readFile(new URL('../.private/typesafe.cfg',import.meta.url),'utf8').catch(()=>'');
const key=process.env.TYPESAFE_API_KEY??config.match(/^api_key\s*=\s*"?([^"\r\n]+)"?/m)?.[1]?.trim();
if(!key)throw Error('TypeSafe API key not configured');
async function ask(payload){
  const start=performance.now();
  const r=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error(`TypeSafe HTTP ${r.status}`);
  return {result:await r.json(),latencyMs:Math.round(performance.now()-start)};
}
const report={policy:POLICY_VERSION,evaluatedAt:new Date().toISOString(),cases:[],scope:'Nine recorded combat and reward states; one sample per policy per state. Not a win-rate benchmark. No game commands are executed.'};
for(const name of ['slippery','slippery-again','survival','beast-potion','beast-energy','beast-free','kin-opening','kin-pressure','deck-reward','cubex-pressure','nibbit-sequence']){
  const fixture=JSON.parse(await readFile(new URL(`./fixtures/${name}.json`,import.meta.url)));
  const s=fixture.state,actions=actionsFor(s),plans=decisionCandidates(s);
  const pair=await Promise.allSettled([ask(decisionQuestion(s,plans)),(async()=>{const start=performance.now();const result=await deliberate({state:s,candidates:plans,recent:encounterMemory(s,fixture.history??[]),ask:async payload=>(await ask(payload)).result});return {result,latencyMs:Math.round(performance.now()-start)};})()]);
  for(const r of pair)if(r.status==='rejected')throw r.reason;
  const [baseline,newPolicy]=pair.map(r=>r.value);
  const answer=newPolicy.result.answers.move,chosen=plans.find(p=>p.id===answer.choice);
  if(!chosen)throw Error('Invalid plan choice from model');
  const item={name,originalChoice:fixture.originalChoice,baselineChoice:plans.find(a=>a.id===baseline.result.answers.move.choice)?.label,
    baseline, event:{kind:'decision',policy:POLICY_VERSION,memory:encounterMemory(s,fixture.history??[]),deliberation:newPolicy.result.deliberation,time:new Date().toISOString(),state:s,chosen,candidates:plans,answer,
      model:newPolicy.result.model,usage:newPolicy.result.usage,latencyMs:newPolicy.latencyMs,preview:true,outcome:'preview',source:'recorded_replay'}};
  report.cases.push(item);
  console.log(JSON.stringify({case:name,original:item.originalChoice,baseline:item.baselineChoice,planned:chosen.label,forecast:chosen.forecast,confidence:answer.confidence,plans:plans.length,latencyMs:newPolicy.latencyMs}));
}
const dir=new URL('../.private/spire-runs/',import.meta.url);await mkdir(dir,{recursive:true});
await writeFile(new URL('plan-review.json',dir),JSON.stringify(report,null,2),{mode:0o600});
