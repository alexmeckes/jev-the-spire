// Skipping a card screen does not necessarily remove its parent reward in STS2MCP.
// Match the actual reward descriptor as well as its floor and slot.
export function rewardState(state,events) {
 if(state.state_type!=='rewards')return state;
 const same=e=>e.state?.run?.act===state.run?.act&&e.state?.run?.floor===state.run?.floor;
 const executed=events.filter(e=>e.outcome==='executed'&&same(e));
 const skipped=[];
 for(let i=0;i<executed.length;i++){
  if(executed[i].chosen?.command.action!=='skip_card_reward')continue;
  const opening=executed.slice(i+1).find(e=>['claim_reward','proceed'].includes(e.chosen?.command.action));
  if(opening?.chosen.command.action!=='claim_reward')continue;
  const item=opening.state.rewards?.items?.find(x=>x.index===opening.chosen.command.index&&x.type==='card');
  if(item)skipped.push(JSON.stringify(item));
 }
 return {...state,rewards:{...state.rewards,items:(state.rewards?.items??[]).filter(x=>!skipped.includes(JSON.stringify(x)))}};
}
