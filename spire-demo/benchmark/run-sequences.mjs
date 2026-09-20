import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {sequenceCases,stepLab} from './sequence-lab.mjs';
import {deliberate} from '../deliberation.mjs';
import {simpleDeliberate} from './simple.mjs';
import {decisionCandidates} from '../planner.mjs';
import {encounterMemory} from '../encounters.mjs';
const repeats=3,dir=new URL(`../../.private/spire-benchmark/sequences-${new Date().toISOString().replaceAll(':','-')}/`,import.meta.url);
await mkdir(dir,{recursive:true});
const sources=[...(await readdir(new URL('../',import.meta.url))).filter(x=>x.endsWith('.mjs')&&!x.endsWith('.test.mjs')), ...(await readdir(new URL('./',import.meta.url))).filter(x=>x.endsWith('.mjs')).map(x=>'benchmark/'+x)];
const hashes={};for(const file of sources){const raw=await readFile(new URL('../'+file,import.meta.url));hashes[file]=createHash('sha256').update(raw).digest('hex');await writeFile(new URL(file.replaceAll('/','_'),dir),raw);}
await writeFile(new URL('cases.json',dir),JSON.stringify(sequenceCases,null,2));
const config=await readFile(new URL('../../.private/typesafe.cfg',import.meta.url),'utf8').catch(()=>'');
const key=process.env.TYPESAFE_API_KEY??config.match(/^api_key\s*=\s*"?([^"\r\n]+)"?/m)?.[1]?.trim();
const results=[];let totalTokens=0;
for(let repeat=0;repeat<repeats;repeat++)for(let i=0;i<sequenceCases.length;i++){
 const fixture=sequenceCases[i];
 for(const policy of (i+repeat)%2?['simple','current']:['current','simple']){
  let state=structuredClone(fixture.state),terminal=null;const calls=[],steps=[],events=[];let error;
  try{
   for(let j=0;j<10&&!terminal;j++){
    const candidates=decisionCandidates(state),recent=encounterMemory(state,events);
    const answer=await (policy==='current'?deliberate:simpleDeliberate)({state,candidates,recent,ask:async request=>{
     if(totalTokens>=1500000)throw Error('Lab input-token budget reached');
     const res=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(request),signal:AbortSignal.timeout(45000)});
     if(!res.ok)throw Error('TypeSafe HTTP '+res.status);
     const response=await res.json();totalTokens+=response.usage?.input_tokens??0;calls.push({request,response});return response;
    }});
    const chosen=candidates.find(c=>c.id===answer.answers?.move?.choice);if(!chosen)throw Error('Invalid choice');
    const next=stepLab(state,chosen.command);
    steps.push({state,candidates,chosen,after:next.state,terminal:next.terminal});
    events.unshift({kind:'decision',outcome:'executed',state,chosen,candidates,deliberation:{assessments:answer.deliberation?.assessments??{}}});
    state=next.state;terminal=next.terminal;
   }
   if(!terminal)throw Error('Lab step bound reached');
  }catch(e){error=e.message;}
  const row={fixture:fixture.id,policy,repeat,terminal,error,hp:state.player.hp,enemyHp:state.battle.enemies[0].hp,actions:steps.map(x=>x.chosen.plan?.[0]?.label??x.chosen.label),calls:calls.length,inputTokens:calls.reduce((n,c)=>n+(c.response.usage?.input_tokens??0),0)};
  results.push(row);
  await writeFile(new URL(`${fixture.id}.${policy}.${repeat}.json`,dir),JSON.stringify({row,steps,calls},null,2),{mode:0o600});
  await writeFile(new URL('results.json',dir),JSON.stringify({hashes,results,totalTokens,scope:'Controlled synthetic deterministic turn tests, not live games or win-rate estimates.'},null,2));
  console.log(JSON.stringify(row));
 }
}
console.log('Saved '+dir.pathname);
