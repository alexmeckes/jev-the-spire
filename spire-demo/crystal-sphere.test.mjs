import {test} from 'node:test';
import assert from 'node:assert/strict';
import {actionsFor} from './actions.mjs';
import {visibleState} from './encounters.mjs';
test('sphere emits only enabled tools and clickable coordinates, with explicit finish gating',()=>{
 const s={state_type:'crystal_sphere',crystal_sphere:{tool:'big',can_use_big_tool:true,can_use_small_tool:true,can_proceed:false,cells:[{x:3,y:2,is_hidden:true,is_clickable:true},{x:1,y:1,is_clickable:false}]}};
 assert.deepEqual(actionsFor(s).map(a=>a.command),[{action:'crystal_sphere_set_tool',tool:'small'},{action:'crystal_sphere_click_cell',x:3,y:2}]);
 Object.assign(s.crystal_sphere,{can_use_big_tool:false,can_use_small_tool:false,can_proceed:true});
 assert.deepEqual(actionsFor(s).map(a=>a.command),[{action:'crystal_sphere_proceed'}]);
});
test('hidden cell metadata never reaches Jev even if bridge supplies it',()=>{
 const s={crystal_sphere:{cells:[{x:0,y:0,is_hidden:true,is_clickable:true,item_type:'secret',is_good:true},{x:1,y:1,is_hidden:false,item_type:'visible'}]}};
 const v=visibleState(s);assert.equal(v.crystal_sphere.cells[0].item_type,undefined);assert.equal(v.crystal_sphere.cells[1].item_type,'visible');assert.equal(s.crystal_sphere.cells[0].item_type,'secret');
});
