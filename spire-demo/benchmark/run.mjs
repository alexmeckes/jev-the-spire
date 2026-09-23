// Read-only model replay: deliberately no bridge/game-control calls.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {planBenefitDeliberate,persistentPlan} from '../plan-benefit.mjs';
import {netDeliberate} from '../experiment/jev-net.mjs';
import {deliberate} from '../deliberation.mjs';
import {simpleDeliberate,comparisonDeliberate} from './simple.mjs';
import {decisionCandidates} from '../planner.mjs';
import {encounterMemory} from '../encounters.mjs';
import {cases,grade} from './suite.mjs';
import {freshCases,gradeFresh} from './fresh-suite.mjs';
const benefits=process.argv.includes('--benefits');
const net=process.argv.includes('--net');
const fresh=process.argv.includes('--fresh');
const repeats=Number(process.argv.find(x=>x.startsWith('--repeats='))?.split('=')[1]??1);
if(!Number.isInteger(repeats)||repeats<1||repeats>5)throw Error('repeats must be 1..5');
const selected=((net||benefits)?[...cases.filter(c=>c.check),...freshCases]:fresh?freshCases:cases).filter(c=>process.argv.includes('--scored-only')?c.check:process.argv.includes('--review-only')?!c.check:true);
const policies=benefits?['current','benefits']:net?['current','net']:process.argv.includes('--comparison')?['simple','comparison']:['current','simple'];
const dry=process.argv.includes('--dry-run');
const stamp=new Date().toISOString().replaceAll(':','-');
const dir=new URL(`../../.private/spire-benchmark/${stamp}/`,import.meta.url);
await mkdir(dir,{recursive:true});
const sources=[...(await readdir(new URL('../',import.meta.url))).filter(p=>p.endsWith('.mjs')&&!p.endsWith('.test.mjs')), 'benchmark/simple.mjs','benchmark/action-comparison.mjs','benchmark/suite.mjs','benchmark/run.mjs','benchmark/fresh-suite.mjs','experiment/jev-net.mjs'];
const hashes={};for(const p of sources){const raw=await readFile(new URL('../'+p,import.meta.url));hashes[p]=createHash('sha256').update(raw).digest('hex');await writeFile(new URL(p.replaceAll('/','_'),dir),raw);}
const config=dry?'':await readFile(new URL('../../.private/typesafe.cfg',import.meta.url),'utf8').catch(()=>'');
const key=process.env.TYPESAFE_API_KEY??config.match(/^api_key\s*=\s*"?([^"\r\n]+)"?/m)?.[1]?.trim();
const results=[];let totalTokens=0;
for(let repeat=0;repeat<repeats;repeat++)for(let i=0;i<selected.length;i++){
 const test=selected[i],raw=await readFile(new URL('../fixtures/'+test.fixture+'.json',import.meta.url),'utf8');
 const fixture=JSON.parse(raw),state=fixture.state,candidates=decisionCandidates(state),recent=encounterMemory(state,fixture.history??[]);
 await writeFile(new URL(test.fixture+'.input.json',dir),JSON.stringify({state,candidates,recent,fixtureHash:createHash('sha256').update(raw).digest('hex')}));
 if(dry){results.push({fixture:test.fixture,candidates:candidates.length,check:test.check});continue;}
 // Alternate order to reduce systematic time/order bias. Same state/actions/memory.
 for(const policy of (i+repeat)%2?[...policies].reverse():policies){
  const calls=[];const start=Date.now();let row={fixture:test.fixture,category:test.category,policy,repeat,rationale:test.rationale};
  try{
   const result=await ({current:deliberate,net:netDeliberate,benefits:planBenefitDeliberate,simple:simpleDeliberate,comparison:comparisonDeliberate}[policy])({state,candidates,recent:policy==='benefits'?{...recent,persistentPlan:persistentPlan(state,fixture.history??[])}:recent,ask:async payload=>{
    if(totalTokens>2000000)throw Error('Benchmark input-token budget reached');
    const r=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(45000)});
    if(!r.ok)throw Error('TypeSafe HTTP '+r.status);
    const response=await r.json();totalTokens+=response.usage?.input_tokens??0;calls.push({request:payload,response});return response;
   }});
   const chosen=candidates.find(c=>c.id===result.answers?.move?.choice);if(!chosen)throw Error('Invalid choice');
   row={...row,choice:chosen.id,label:chosen.label,command:chosen.command,grade:(test.fixture.startsWith('fresh-')?gradeFresh:grade)(test,chosen),usage:result.usage,calls:calls.length};
  }catch(e){row.error=e.message;}
  row.elapsedMs=Date.now()-start;results.push(row);
  await writeFile(new URL(`${test.fixture}.${policy}.${repeat}.json`,dir),JSON.stringify({row,calls},null,2),{mode:0o600});
  await writeFile(new URL('results.json',dir),JSON.stringify({hashes,results,totalTokens,scope:'Paired repeated samples as configured. Narrow first-action checks; no win-rate estimate. No game actions executed.'},null,2));
  console.log(JSON.stringify(row));
 }
}
await writeFile(new URL('results.json',dir),JSON.stringify({hashes,results,totalTokens,dry},null,2));
console.log('Saved '+dir.pathname);
