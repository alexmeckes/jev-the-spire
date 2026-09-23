import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {deliberate} from '../deliberation.mjs';
import {horizonDeliberate} from './next-decision.mjs';
const root=new URL('../../',import.meta.url),all=JSON.parse(await readFile(new URL('.private/spire-boss-review/2026-09-22-evidence.json',root)));
const samples=[{id:'opening',...all.find(d=>d.session==='19-20-10.478'&&d.state.battle.round===1)},{id:'fatal-commit',...all.find(d=>d.session==='19-20-10.478'&&d.state.battle.round===12&&d.chosen.command.action==='play_card')}];
if(process.env.SPIRE_REPLAY_CONTROLS==='1'){
 const fatal=samples.find(s=>s.id==='fatal-commit');
 const noUpkeep=structuredClone(fatal);noUpkeep.id='control-no-upkeep';noUpkeep.state.player.status=noUpkeep.state.player.status.filter(p=>p.name!=='Crimson Mantle');
 const enoughHp=structuredClone(fatal);enoughHp.id='control-enough-hp';enoughHp.state.player.hp+=10;
 for(const c of enoughHp.candidates)if(c.forecast?.hpAfter!=null)c.forecast.hpAfter+=10;
 samples.splice(0,samples.length,noUpkeep,enoughHp);
}
const dir=new URL('.private/spire-next-decision/'+new Date().toISOString().replaceAll(':','-')+'/',root);await mkdir(dir,{recursive:true});
await writeFile(new URL('inputs.json',dir),JSON.stringify(samples));
for(const name of ['next-decision.mjs','run-next-decision.mjs'])await writeFile(new URL(name,dir),await readFile(new URL(name,import.meta.url)));
const cfg=await readFile(new URL('.private/typesafe.cfg',root),'utf8'),key=process.env.TYPESAFE_API_KEY??cfg.match(/^api_key\s*=\s*"?([^"\r\n]+)"?/m)?.[1]?.trim();
let tokens=0;const results=[];
for(let repeat=0;repeat<2;repeat++)for(const s of samples)for(const policy of repeat?['treatment','baseline']:['baseline','treatment']){
 const calls=[];let row={id:s.id,repeat,policy};
 try{
 const options={state:s.state,candidates:s.candidates,recent:[],ask:async payload=>{
 if(tokens>600000)throw Error('Local replay token budget reached');
 const r=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(45000)});
 if(!r.ok)throw Error('HTTP '+r.status);const response=await r.json();tokens+=response.usage?.input_tokens??0;calls.push({request:payload,response});return response;
 }};
 const r=policy==='baseline'?await deliberate(options):await horizonDeliberate(options,{setup:s.id==='opening'});
 const c=s.candidates.find(c=>c.id===r.answers?.move?.choice);if(!c)throw Error('Invalid choice');row.label=c.label;row.command=c.command;
 }catch(e){row.error=e.message;}
 results.push(row);await writeFile(new URL(`${s.id}.${policy}.${repeat}.json`,dir),JSON.stringify({row,calls}),{mode:0o600});await writeFile(new URL('results.json',dir),JSON.stringify({results,tokens,scope:'Offline frozen decisions, no known draw order or game actions; not win-rate simulation.'},null,2));console.log(JSON.stringify(row));if(row.error)break;
}
console.log(dir.pathname);
