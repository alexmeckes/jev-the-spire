import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {strengthSupport,strengthDeliberate} from './strength-support.mjs';
import {deliberate} from '../deliberation.mjs';
import {decisionCandidates} from '../planner.mjs';
const c=(name,cost,description)=>({name,cost:String(cost),description});
test('offered Strength is not existing support; payoff and source both required',()=>{
 const s={player:{deck:[c('Strike',1,'Deal 6 damage.')]},card_reward:{cards:[c('Inflame',1,'Gain 2 Strength.')]}};
 assert.equal(strengthSupport(s).eligible,false);s.player.deck.push(c('Inflame',1,'Gain 2 Strength.'));assert.equal(strengthSupport(s).eligible,true);s.player.deck.shift();assert.equal(strengthSupport(s).eligible,false);
});
test('conditional Strength retains rule; payoff alone does not activate preference',()=>{
 const s={player:{deck:[c('Rupture',1,'Whenever you lose HP on your turn, gain 1 Strength.'),c('Twin Strike',1,'Deal 5 damage twice.')]}};
 assert.match(strengthSupport(s).sources[0].rule,/Whenever/);assert.equal(strengthSupport(s).repeatedAttacks.length,1);
});
test('unsupported deck receives byte-identical baseline requests',async()=>{
 const state=JSON.parse(readFileSync(new URL('../fixtures/deck-reward.json',import.meta.url))).state;
 state.player.deck=[c('Strike',1,'Deal 6 damage.')];state.player.relics=[];
 const candidates=decisionCandidates(state);
 async function capture(fn){const calls=[];await fn({state,candidates,recent:{},ask:async p=>{calls.push(p);return {answers:Object.fromEntries(Object.entries(p.questions).map(([k,q])=>[k,{type:'choice',choice:Object.keys(q.criteria)[0],confidence:.5}])),usage:{input_tokens:0,output_tokens:0}};}});return calls;}
 assert.deepEqual(await capture(strengthDeliberate),await capture(deliberate));
});
