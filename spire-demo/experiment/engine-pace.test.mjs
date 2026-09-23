import test from 'node:test';
import assert from 'node:assert/strict';
import {paceEvidence} from './engine-pace.mjs';
test('pace uses matched observed target and explicit countdown, not inferred future damage',()=>{
 const state={battle:{round:3,enemies:[{entity_id:'a',hp:120,status:[{description:'In 4 turns, you will be eaten and die.'}]},{entity_id:'new',hp:50}]}};
 const e=paceEvidence(state,{turnHistory:[{round:1,enemies:[{id:'a',hp:160}]}]});
 assert.equal(e.targets[0].observedNetHpRemovedPerRound,20);
 assert.equal(e.targets[0].deadlines[0].requiredHpPerTurn,30);
 assert.equal(e.targets[1].observedNetHpRemovedPerRound,null);
 assert.deepEqual(e.targets[1].deadlines,[]);
});
test('no prior completed round means unknown pace; no battle means no evidence',()=>{
 assert.equal(paceEvidence({},{}),null);
 const state={battle:{round:1,enemies:[{entity_id:'a',hp:100,status:[]}]}};
 assert.equal(paceEvidence(state,{turnHistory:[{round:1,enemies:[{id:'a',hp:100}]}]}).targets[0].observedNetHpRemovedPerRound,null);
});
