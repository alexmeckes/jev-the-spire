import test from 'node:test';
import assert from 'node:assert/strict';
import {actionsFor} from './actions.mjs';
test('user exclusion blocks Sword of Stone acquisition but keeps alternatives and exits',()=>{
 const sword={index:0,name:'Sword of Stone',id:'SWORD_OF_STONE',type:'relic'};
 const other={index:1,name:'Other relic',type:'relic'};
 const event=actionsFor({state_type:'event',event:{options:[{index:0,title:'Grab the Sword',description:'Obtain the Sword of Stone.'},{index:1,title:'Dive into the Water',description:'Gain 111 Gold. Lose 7 HP.'}]}});
 assert.deepEqual(event.map(a=>a.command.index),[1]);
 for(const [screen,items] of [['rewards','items'],['treasure','relics'],['relic_select','relics']]){
  const s={state_type:screen,[screen]:{[items]:[sword,other],can_proceed:true,can_skip:true}};
  assert.ok(!actionsFor(s).some(a=>a.command.index===0));assert.ok(actionsFor(s).some(a=>a.command.index===1));
  s[screen][items]=[sword];assert.equal(actionsFor(s).length,1);
 }
 for(const screen of ['shop','fake_merchant']){
  const shop={items:[{...sword,relic_name:sword.name,category:'relic',is_stocked:true,can_afford:true},{...other,category:'relic',is_stocked:true,can_afford:true}]};
  const s={state_type:screen,...(screen==='shop'?{shop}:{fake_merchant:{shop}})};
  assert.deepEqual(actionsFor(s).filter(a=>a.command.action==='shop_purchase').map(a=>a.command.index),[1]);
 }
});
