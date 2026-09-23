import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {decisionCandidates} from '../planner.mjs';
import {rageOrderEvidence} from './rage-order.mjs';
import {freshCases} from '../benchmark/fresh-suite.mjs';
import {encounterMemory} from '../encounters.mjs';
const root=new URL('../../',import.meta.url),pool=JSON.parse(await readFile(new URL('.private/spire-rage/pool.json',root)));
const hash=x=>createHash('sha256').update(x.id).digest('hex');pool.sort((a,b)=>hash(a).localeCompare(hash(b)));
const selected=[],counts={};
for(const s of pool){if((counts[s.session]??0)>=2)continue;counts[s.session]=(counts[s.session]??0)+1;selected.push({...s,candidates:decisionCandidates(s.state),evidence:rageOrderEvidence(s.state)});if(selected.length===8)break;}
for(const t of freshCases){const f=JSON.parse(await readFile(new URL('spire-demo/fixtures/'+t.fixture+'.json',root)));selected.push({id:t.fixture,state:f.state,candidates:decisionCandidates(f.state),recent:encounterMemory(f.state,f.history??[]),test:t});}
await writeFile(new URL('.private/spire-rage/inputs.json',root),JSON.stringify(selected));console.log(JSON.stringify({pool:pool.length,selected:selected.length,recordedRageFirst:pool.filter(x=>x.recorded.startsWith('Rage')).length,examples:selected.filter(x=>x.evidence).map(x=>({id:x.id,recorded:x.recorded,ragePlans:x.candidates.filter(c=>c.label.startsWith('Rage')).length,comparison:x.evidence.comparisons.map(c=>({attack:c.attack,blockBefore:c.rageFirst?.block,blockAfter:c.rageAfter?.block,error:c.error}))}))}));
