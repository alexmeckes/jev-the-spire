import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rewardComparison,marginalDeliberate} from './reward-marginal.mjs';
import {decisionCandidates} from '../planner.mjs';
const state=()=>JSON.parse(readFileSync(new URL('../fixtures/deck-reward.json',import.meta.url))).state;
test('pairwise comparison needs legal Skip and counts upgraded duplicates',()=>{
 const s=state();s.player.deck=[{name:'Anger'},{name:'Anger+'}];
 const cs=[{id:'a',label:'Anger',command:{action:'select_card_reward'},details:{}},{id:'b',command:{action:'skip_card_reward'}}];
 assert.equal(rewardComparison(s,cs).offers[0].existingCopies,2);assert.equal(rewardComparison(s,cs.slice(0,1)),null);
});
test('negative marginal assessments never remove legal additions in final review',async()=>{
 const s=state(),cs=decisionCandidates(s),skip=cs.find(c=>c.command.action==='skip_card_reward');let calls=0;
 await marginalDeliberate({state:s,candidates:cs,recent:{},ask:async p=>{
  calls++;assert.deepEqual(Object.keys(p.questions.move.criteria),cs.map(c=>c.id));
  const pairs=Object.entries(p.questions).filter(([k])=>k.startsWith('marginal_'));
  if(calls===1){assert.equal(pairs.length,cs.length-1);for(const [,q]of pairs)assert.ok(Object.hasOwn(q.criteria,skip.id));}
  if(calls===2){assert.equal(pairs.length,0);assert.ok(p.state.jev_recommendations.marginal_a0);}
  return {answers:Object.fromEntries(Object.entries(p.questions).map(([k,q])=>[k,{type:'choice',choice:k.startsWith('marginal_')?skip.id:Object.keys(q.criteria)[0],confidence:.5}])),usage:{input_tokens:0,output_tokens:0}};
 }});assert.equal(calls,2);
});
