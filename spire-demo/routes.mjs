// Visible graph only; report reachable spending opportunities without choosing a route.
export function spendingRoutes(state) {
 if(state.state_type!=='map')return null;
 const nodes=new Map((state.map?.nodes??[]).map(n=>[`${n.col},${n.row}`,n]));
 return {gold:state.player?.gold,scope:'Visible paths to the first shop on each branch, bounded to 8 examples per next option. Absence is not proof if truncated. Inventory and future rewards are unknown.',options:(state.map?.next_options??[]).map(start=>{
  const queue=[{key:`${start.col},${start.row}`,path:[]}],shops=[];let expanded=0;
  while(queue.length && shops.length<8 && expanded++<1000){
   const {key,path}=queue.shift();if(path.some(n=>`${n.col},${n.row}`===key))continue;
   const node=nodes.get(key);if(!node)continue;
   const next=[...path,{col:node.col,row:node.row,type:node.type}];
   if(node.type==='Shop'){shops.push({rooms:next,combatsBeforeShop:next.slice(0,-1).filter(n=>['Monster','Elite','Boss'].includes(n.type)).length,elitesBeforeShop:next.slice(0,-1).filter(n=>n.type==='Elite').length});continue;}
   for(const child of node.children??[])queue.push({key:child.join(','),path:next});
  }
  return {index:start.index,shops,truncated:queue.length>0};
 })};
}
