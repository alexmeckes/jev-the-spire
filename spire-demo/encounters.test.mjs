import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {visibleState,deckSnapshot,encounterBrief,encounterMemory} from './encounters.mjs';
import {perspectiveQuestion} from './deliberation.mjs';
import {decisionCandidates} from './planner.mjs';
const fixture=n=>JSON.parse(readFileSync(new URL('./fixtures/'+n+'.json',import.meta.url))).state;
test('draw order and positional metadata never reach model state',()=>{
 const s=fixture('beast-free');s.player.draw_pile=[{name:'Z',index:0},{name:'A',index:1}];
 const a=visibleState(s);assert.deepEqual(a.player.draw_pile.map(c=>c.name),['A','Z']);assert.equal(a.player.draw_pile[0].index,undefined);assert.equal(s.player.draw_pile[0].name,'Z');
 s.player.draw_pile.reverse();assert.deepEqual(visibleState(s),a);
});
test('encounter facts contain only current enemies and current rules',()=>{
 const s=fixture('beast-free');s.battle.enemies[0].status=[];
 const b=encounterBrief(s);assert.equal(b.guidance,undefined);assert.equal(b.targets[0].previouslyObserved,undefined);assert.deepEqual(b.targets[0].currentRules,[]);
});
test('reward assessment includes full deck, duplicate counts and all reward options including skip',()=>{
 const s=fixture('deck-reward'),c=decisionCandidates(s),q=perspectiveQuestion(s,c);
 assert.equal(q.state.deck.size,s.player.deck.length);assert.equal(deckSnapshot(s).cards.reduce((n,c)=>n+c.copies,0),s.player.deck.length);
 assert.deepEqual(Object.keys(q.questions.synergy.criteria),c.map(c=>c.id));assert.ok(c.some(c=>c.command.action==='skip_card_reward'));
});
test('memory excludes unexecuted actions and other floors from same fight',()=>{
 const s=fixture('beast-free');const event={kind:'decision',outcome:'executed',state:s,chosen:{label:'test',command:{action:'end_turn'}}};
 const other=structuredClone(event);other.state.run.floor++;
 const m=encounterMemory(s,[event,other,{...event,outcome:'preview'}]);assert.equal(m.sameFight.length,1);
});

test('encounter memory summarizes observed deterioration and preserves Jev unfinished plan',()=>{
 const f=JSON.parse(readFileSync(new URL('./fixtures/cubex-pressure.json',import.meta.url)));const m=encounterMemory(f.state,f.history);
 assert.ok(m.turnHistory.length>1);assert.ok(m.progress.playerHpChange<0);assert.ok(m.progress.enemies[0].strengthChange>0);
 const e={kind:'decision',outcome:'executed',state:f.state,chosen:{plan:[{label:'Rage'},{label:'Strike'}]}};
 assert.deepEqual(encounterMemory(f.state,[e]).unfinishedPlan.proposedRemaining,['Strike']);
});
