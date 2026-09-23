import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {persistentPlan,benefitEvidence,planBenefitDeliberate} from './plan-benefit.mjs';
import {decisionCandidates} from './planner.mjs';
const fixture=n=>JSON.parse(readFileSync(new URL('./fixtures/'+n+'.json',import.meta.url))).state;
test('plan persists across rounds without indices, ignores previews, clears at encounter boundary',()=>{
 const s=fixture('beast-free'),prior=structuredClone(s);prior.battle.round--;prior.player.hp+=5;
 const target=s.battle.enemies[0].entity_id;
 const event={kind:'decision',outcome:'executed',state:prior,chosen:{plan:[{label:'Attack',command:{action:'play_card',card_index:4,target}}]}};
 const defense={...event,chosen:{label:'Defend',command:{action:'play_card',card_index:999}}};
 const plan=persistentPlan(s,[defense,{...event,outcome:'preview'},event]);
 assert.deepEqual(plan.remainingTargets,[target]);assert.equal(plan.playerHpChange,-5);assert.ok(!JSON.stringify(plan).includes('card_index'));
 const other=structuredClone(event);other.state.run.floor--;
 assert.equal(persistentPlan(s,[other,event]),null);
 s.battle.enemies[0].hp=0;assert.deepEqual(persistentPlan(s,[event]).departedTargets,[target]);
 prior.battle.round=s.battle.round+1;assert.equal(persistentPlan(s,[event]),null);
});
test('first-action benefit does not borrow later sequence payoff and unknowns stay unknown',()=>{
 const s=fixture('fortifier'),c=decisionCandidates(s),e=benefitEvidence(s,c);
 const potion=e.actions.find(a=>a.firstAction.action==='use_potion');assert.ok(potion);
 assert.equal(potion.forecast.damage,0);
 assert.match(potion.note,/does not rule out useful setup/);
 const unknown=benefitEvidence(s,[{id:'bad',command:{action:'unknown'},label:'Unsupported'}]);
 assert.equal(unknown.actions[0].forecast,null);assert.equal(unknown.actions[0].hpSavedIfEnding,null);
});
test('benefit review keeps every original choice and preserves caveats in both passes',async()=>{
 const state=fixture('beast-free'),candidates=decisionCandidates(state);let calls=0;
 await planBenefitDeliberate({state,candidates,recent:{persistentPlan:{selectedPlan:['Attack']}},ask:async p=>{
  calls++;assert.ok(p.state.action_benefits);assert.deepEqual(p.state.persistent_plan.selectedPlan,['Attack']);
  for(const q of Object.values(p.questions)){assert.deepEqual(Object.keys(q.criteria),candidates.map(c=>c.id));assert.match(q.instructions,/zero immediate gain is not proof/);}
  return {answers:Object.fromEntries(Object.keys(p.questions).map(role=>[role,{type:'choice',choice:candidates[0].id}]))};
 }});assert.equal(calls,2);
});

test('recorded encounter history preserves observed target progress',()=>{
 const f=JSON.parse(readFileSync(new URL('./fixtures/cubex-pressure.json',import.meta.url)));
 const p=persistentPlan(f.state,f.history);assert.ok(p);assert.equal(p.remainingTargets[0],'CUBEX_CONSTRUCT_0');
 assert.equal(p.targetChanges[0].hpBefore,43);assert.equal(p.targetChanges[0].hpNow,37);
});
