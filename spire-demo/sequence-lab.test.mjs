import test from 'node:test';
import assert from 'node:assert/strict';
import {sequenceCases,stepLab,labActions} from './benchmark/sequence-lab.mjs';
function terminals(state,path=[]){return labActions(state).flatMap(c=>{const r=stepLab(state,c);return r.terminal?[{...r,path:[...path,c]}]:terminals(r.state,[...path,c]);});}
for(const fixture of sequenceCases)test(fixture.id+' independent exhaustive survival and ordering check',()=>{
 const snapshot=JSON.stringify(fixture.state),out=terminals(fixture.state),safe=out.filter(x=>x.terminal!=='died');
 assert.ok(safe.length);assert.ok(out.some(x=>x.terminal==='died'));
 for(const r of safe){
  if(fixture.id.startsWith('flex')){assert.equal(r.path[0].action,'use_potion');assert.equal(r.terminal,'won-combat');assert.equal(r.state.player.hp,5);}
  if(fixture.id.startsWith('speed')){assert.equal(r.path[0].action,'use_potion');assert.equal(r.state.player.block,20);assert.equal(r.state.player.hp,1);}
  if(fixture.id.startsWith('bash')){assert.equal(r.path[0].card_index,1);assert.equal(r.terminal,'won-combat');assert.equal(r.state.player.hp,5);}
 }
 assert.equal(JSON.stringify(fixture.state),snapshot);
});
test('temporary buffs update displayed cards without double counting',()=>{
 let s=stepLab(sequenceCases[0].state,{action:'use_potion',slot:0}).state;
 assert.equal(s.player.hand[0].description,'Deal 11 damage.');
 s=stepLab(s,{action:'play_card',card_index:0,target:'TARGET_0'}).state;
 assert.equal(s.battle.enemies[0].hp,11);assert.equal(s.player.hand[0].index,0);
 assert.throws(()=>stepLab(s,{action:'use_potion',slot:0}),/Invalid potion/);
});
