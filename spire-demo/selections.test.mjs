import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectionState} from './selections.mjs';
import {actionsFor} from './actions.mjs';
const s={state_type:'card_select',run:{act:1,floor:12},card_select:{prompt:'Choose 2 cards',cards:[{index:0,id:'A'},{index:1,id:'B'}],can_confirm:false}};
const e={kind:'decision',outcome:'executed',state:s,chosen:{command:{action:'select_card',index:0}}};
test('bridge missing selection flags preserves observed toggle without selecting it twice',()=>{
 const fixed=selectionState(s,[e]);assert.equal(fixed.card_select.cards[0].is_selected,true);assert.deepEqual(actionsFor(fixed).map(x=>x.command.index),[1]);
 assert.equal(selectionState(s,[{...e,outcome:'preview'}]),s);
 assert.equal(selectionState(s,[{...e,state:{...s,run:{act:1,floor:13}}}]),s);
 assert.equal(selectionState(s,[e,e]),s);
});

test('enchant confirmation requires the prompted count despite premature bridge flag',()=>{
 const grid={...s,card_select:{prompt:'Choose 3 cards to Enchant.',can_confirm:true,cards:[{index:0,id:'A'},{index:1,id:'B'},{index:2,id:'C'},{index:3,id:'D'}]}};
 const toggle=i=>({kind:'decision',outcome:'executed',state:grid,chosen:{command:{action:'select_card',index:i}}});
 const confirm={...toggle(0),chosen:{command:{action:'confirm_selection'}}};
 assert.equal(actionsFor(grid).some(a=>a.command.action==='confirm_selection'),false);
 const two=selectionState(grid,[confirm,toggle(1),toggle(0)]);
 assert.deepEqual(actionsFor(two).map(a=>a.command.index),[2,3]);
 const three=selectionState(grid,[toggle(2),confirm,toggle(1),toggle(0)]);
 assert.deepEqual(actionsFor(three).map(a=>a.command.action),['confirm_selection']);
});
