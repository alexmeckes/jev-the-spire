import test from 'node:test';
import assert from 'node:assert/strict';
import {deckAssessment} from './deck-assessment.mjs';
import {deliberate} from './deliberation.mjs';
import {decisionCandidates} from './planner.mjs';
const state={state_type:'card_reward',player:{deck:[{name:'Payoff',cost:'1',description:'Whenever a card is Exhausted, gain 3 Block.'},{name:'Payoff+',cost:'1',description:'Whenever a card is Exhausted, gain 4 Block.'},{name:'Source',cost:'X',description:'Exhaust.'}],relics:[],max_energy:3},card_reward:{cards:[{index:0,name:'Payoff',cost:'1',description:'Whenever a card is Exhausted, gain 3 Block.'}],can_skip:true}};
test('assessment reports actual copies and costs without inventing triggers or unseen deck',()=>{
 const a=deckAssessment(state);assert.equal(a.offers[0].existingCopies,2);assert.deepEqual(a.costs,{'1':2,X:1});assert.equal(a.size,3);
 assert.equal(deckAssessment({}).available,false);assert.deepEqual(state.player.deck.map(c=>c.name),['Payoff','Payoff+','Source']);
});
test('deck hypothesis survives compacting and review without becoming a gameplay candidate',async()=>{
 let calls=0;const candidates=decisionCandidates(state);
 await deliberate({state,candidates,ask:async p=>{
  calls++;assert.equal(p.state.deck_assessment.offers[0].existingCopies,2);
  assert.deepEqual(Object.keys(p.questions.move.criteria),candidates.map(c=>c.id));
  if(calls===1)assert.ok(p.questions.deck_need.criteria.defense);
  else {assert.equal(p.state.deck_need_hypothesis.choice,'defense');assert.ok(!p.state.jev_recommendations.deck_need);}
  return {answers:Object.fromEntries(Object.keys(p.questions).map(k=>[k,{type:'choice',choice:k==='deck_need'?'defense':candidates[0].id}]))};
 }});assert.equal(calls,2);
});
