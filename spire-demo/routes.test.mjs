import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spendingRoutes} from './routes.mjs';
test('visible routes distinguish shops behind an elite from direct shops and disconnected nodes',()=>{
 const s={state_type:'map',player:{gold:500},map:{next_options:[{index:0,col:0,row:1},{index:1,col:1,row:1}],nodes:[{col:0,row:1,type:'Elite',children:[[0,2]]},{col:0,row:2,type:'Shop',children:[]},{col:1,row:1,type:'Shop',children:[]},{col:9,row:1,type:'Shop',children:[]}]}};
 const r=spendingRoutes(s);assert.equal(r.gold,500);assert.equal(r.options[0].shops[0].elitesBeforeShop,1);assert.equal(r.options[1].shops[0].combatsBeforeShop,0);assert.equal(r.options.flatMap(x=>x.shops).length,2);assert.equal(r.options[0].truncated,false);
});
