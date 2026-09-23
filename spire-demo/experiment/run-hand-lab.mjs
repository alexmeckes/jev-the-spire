import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {assay} from './hand-lab.mjs';
const root=new URL('../../',import.meta.url);
const inputPath=new URL('.private/spire-engine-pace/2026-09-22T11-02-48.203Z/inputs.json',root);
const inputs=JSON.parse(await readFile(inputPath));
const dir=new URL('.private/spire-hand-lab/'+new Date().toISOString().replaceAll(':','-')+'/',root);await mkdir(dir,{recursive:true});
const results=[];
for(const s of inputs.filter(x=>x.state.state_type==='card_reward')){
 const state=s.state;
 results.push({id:s.id,offers:state.card_reward.cards,deck:state.player.deck,omittedRelics:state.player.relics,rows:assay(state.player.deck,state.card_reward.cards)});
}
await writeFile(new URL('results.json',dir),JSON.stringify({samplesPerVariant:256,seed:22092026,energy:3,handSize:5,scope:'Normalized opening hand; one neutral target. No relics, potions, upgrades during combat, reshuffles, future turns, enemy rules or learned policy. Search uses the complete hypothetical shuffled pile, so it has perfect information: these are optimistic supported-effect capacities, not Jev decisions or expected live output. Damage and block are separate maxima, not simultaneous. Search may be capped and is not guaranteed globally optimal. Unsupported cards occupy slots but are not simulated; never treat their omitted contribution as zero actual value. Intervals quantify shuffle noise only.',results},null,2));
for(const f of ['hand-lab.mjs','run-hand-lab.mjs'])await writeFile(new URL(f,dir),await readFile(new URL(f,import.meta.url)));
console.log(dir.pathname);
for(const s of results){console.log(s.id);for(const r of s.rows)console.log(JSON.stringify({name:r.name,damage:r.meanSupportedDamage,block:r.meanSupportedBlock,damageDelta:r.damageDelta,unknown:r.meanUnsupportedSlots,draw:r.drawCardPresentRate}));}
