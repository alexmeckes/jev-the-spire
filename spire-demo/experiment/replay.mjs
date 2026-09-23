// Recorded-state adviser trial. This file never sends game commands.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {reviewQuestion} from '../deliberation.mjs';
import {compactRequest} from '../compact-request.mjs';
import {consultLuna,advisoryReview} from './luna.mjs';
const [file,output]=process.argv.slice(2);if(!file||!output)throw Error('Usage: node replay.mjs session.jsonl output.json');
const rows=(await readFile(file,'utf8')).trim().split('\n').map(JSON.parse);
const event=rows.find(r=>r.kind==='decision'&&r.outcome==='executed'&&r.state?.state_type==='boss'&&r.state.run?.act===2&&r.candidates?.length>1);
if(!event)throw Error('No eligible Act 2 boss decision');
const payload=compactRequest(reviewQuestion(event.state,event.candidates,{answers:{move:event.answer}},event.memory??[]));
await mkdir('.private/spire-luna',{recursive:true});
const adviser=await consultLuna(payload,event.answer);
const config=await readFile('.private/typesafe.cfg','utf8');const key=process.env.TYPESAFE_API_KEY??config.match(/^api_key\s*=\s*"?([^"\r\n]+)"?/m)?.[1]?.trim();if(!key)throw Error('Missing Jev credentials');
const started=Date.now();const response=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(advisoryReview(payload,event.answer,adviser.advice)),signal:AbortSignal.timeout(30000)});
if(!response.ok)throw Error(`Jev HTTP ${response.status}`);
const result=await response.json();const choice=result.answers?.move?.choice;if(!event.candidates.some(c=>c.id===choice))throw Error('Invalid Jev final choice');
const report={mode:'recorded-state-only',source:file,time:event.time,adviser,baseline:{choice:event.answer.choice,label:event.chosen.label},assisted:{choice,label:event.candidates.find(c=>c.id===choice).label,latencyMs:Date.now()-started,usage:result.usage},changed:choice!==event.answer.choice,note:'No commands executed. A changed decision does not establish improved survival or win rate. One sample, without an unassisted rerun control.'};
await writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
