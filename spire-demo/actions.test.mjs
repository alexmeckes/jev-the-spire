import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionsFor, factsFor, fingerprint, makeQuestion } from './actions.mjs';

const combat = () => ({ state_type: 'monster', battle: { turn: 'player', is_play_phase: true, enemies: [
  { entity_id: 'LIVE_0', name: 'Live', hp: 10, intents: [{ type: 'Attack', label: '4 × 3' }] },
  { entity_id: 'DEAD_1', name: 'Dead', hp: 0 },
] }, player: { block: 5, hand: [
  { index: 0, name: 'Strike', target_type: 'AnyEnemy', can_play: true },
  { index: 1, name: 'Expensive', target_type: 'AnyEnemy', can_play: false },
  { index: 2, name: 'Defend', target_type: 'Self', can_play: true },
] } });
test('legal candidates exclude unplayable cards and dead enemies', () => {
  const a = actionsFor(combat());
  assert.deepEqual(a.map(x => x.command), [
    { action: 'play_card', card_index: 0, target: 'LIVE_0' },
    { action: 'play_card', card_index: 2 }, { action: 'end_turn' },
  ]);
});
test('never acts during enemy turns or menu screens', () => {
  const s = combat(); s.battle.turn = 'enemy'; assert.deepEqual(actionsFor(s), []);
  assert.deepEqual(actionsFor({ state_type: 'menu', options: ['abandon_run', 'continue'] }), []);
});
test('state fingerprint changes when hand indices, HP or turn change', () => {
  const s = combat(), original = fingerprint(s);
  s.player.hand.shift(); assert.notEqual(fingerprint(s), original);
});
test('multi-hit damage is multiplied and unknown intents are flagged', () => {
  const s = combat(); assert.equal(factsFor(s).displayed_block_gap, 7);
  s.battle.enemies[0].intents[0].label = '?'; assert.equal(factsFor(s).all_attack_labels_parsed, false);
});
test('selection confirmation prevents toggling already chosen cards', () => {
  assert.deepEqual(actionsFor({ state_type: 'card_select', card_select: { can_confirm: true, cards: [{ index: 0 }] } }).map(a => a.command), [{ action: 'confirm_selection' }]);
});
test('locked events, unaffordable purchases, full potion belt are excluded', () => {
  assert.equal(actionsFor({state_type:'event',event:{options:[{index:0,is_locked:true},{index:1,is_locked:false}]}}).length,1);
  assert.deepEqual(actionsFor({state_type:'shop',player:{potions:[{}, {}, {}],max_potion_slots:3},shop:{items:[{index:0,is_stocked:true,can_afford:false},{index:1,is_stocked:true,can_afford:true,category:'potion'}],can_proceed:true}}).map(a=>a.command),[{action:'proceed'}]);
});
test('Jev answer space contains only generated action IDs', () => {
  const s = combat(), a = actionsFor(s); assert.deepEqual(Object.keys(makeQuestion(s,a).questions.move.criteria), a.map(x=>x.id));
  assert.throws(()=>makeQuestion(s,[]));
});
test('a shop can close its inventory even with the map button disabled', () => {
  assert.deepEqual(actionsFor({state_type:'shop',shop:{items:[],can_proceed:false}}).map(a=>a.command),[{action:'proceed'}]);
  assert.deepEqual(actionsFor({state_type:'shop',shop:{items:[],can_proceed:false,error:'loading'}}),[]);
});
test('singleplayer buff potions remain available at zero energy, including the fatal boss state', () => {
  const s = combat();
  s.player.hp = 2; s.player.block = 5; s.player.energy = 0; s.player.hand = [];
  s.player.potions = ['Strength Potion', 'Block Potion', 'Energy Potion'].map((name, slot) => ({ name, slot, target_type: 'AnyPlayer', can_use_in_combat: true }));
  assert.deepEqual(actionsFor(s).map(a => a.command), [
    {action:'use_potion',slot:0}, {action:'use_potion',slot:1}, {action:'use_potion',slot:2}, {action:'end_turn'},
  ]);
  s.player.potions[0].target_type = 'AnyAlly';
  assert.equal(actionsFor(s)[0].command.action, 'use_potion');
});

test('optional redraw offers cards even when empty selection can be confirmed',()=>{
 const s={state_type:'hand_select',hand_select:{prompt:'Choose any number of cards to replace.',can_confirm:true,cards:[{index:0,name:'Strike'},{index:1,name:'Defend'}],selected_cards:[{index:1}]}};
 assert.deepEqual(actionsFor(s).map(a=>a.command),[{action:'combat_confirm_selection'},{action:'combat_select_card',card_index:0}]);
 s.hand_select.prompt='Select a card to Exhaust.';
 assert.deepEqual(actionsFor(s).map(a=>a.command),[{action:'combat_confirm_selection'}]);
});
