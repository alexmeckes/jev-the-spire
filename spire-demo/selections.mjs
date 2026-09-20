// Some bridge card grids omit is_selected. Successful toggles are observable
// actions; retain them only within the same uninterrupted selection screen.
export function selectionState(state,events=[]){
 const c=state.card_select;
 if(state.state_type!=='card_select'||!c?.cards?.length||c.cards.some(x=>'is_selected' in x))return state;
 const signature=s=>JSON.stringify([s.run?.act,s.run?.floor,s.card_select?.prompt,s.card_select?.cards?.map(x=>[x.index,x.id,x.name])]);
 const key=signature(state),selected=new Set();
 for(const e of events){
  if(e.kind!=='decision'||e.outcome!=='executed')continue;
  if(e.state?.state_type!=='card_select'||signature(e.state)!==key)break;
  if(e.chosen?.command?.action==='confirm_selection')continue;
  if(e.chosen?.command?.action!=='select_card')break;
  const i=e.chosen.command.index;if(selected.has(i))selected.delete(i);else selected.add(i);
 }
 if(!selected.size)return state;
 return {...state,card_select:{...c,selection_source:'Successful selection toggles in this uninterrupted screen',cards:c.cards.map(x=>({...x,is_selected:selected.has(x.index)}))}};
}
