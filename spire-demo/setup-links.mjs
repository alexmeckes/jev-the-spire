// Visible hand dependencies only; these are possible sequences for Jev to assess.
// Do not predict the selected exhaust target, drawn cards, or hidden counters.
export function setupLinks(state) {
 const hand=state.player?.hand??[];
 const sources=hand.filter(c=>c.can_play && /(?:^|[.!]\s+)Exhaust \d+ cards?\./i.test(c.description??''));
 const consumers=hand.filter(c=>/if you have Exhausted a card this turn/i.test(c.description??''));
 const exhaustLinks=sources.flatMap(source=>consumers.filter(c=>c.index!==source.index).map(target=>{
  const sourceCost=Number(source.cost),targetCost=Number(target.cost);
  const remaining=Number.isFinite(sourceCost)&&Number.isFinite(targetCost)?state.player.energy-sourceCost-targetCost:null;
  return {
   setup:{index:source.index,name:source.name,cost:source.cost,rule:source.description},
   payoff:{index:target.index,name:target.name,cost:target.cost,rule:target.description},
   energyAfterBoth:remaining,
   note:'Possible exhaust-before-payoff sequence. Preserve the payoff card when selecting the exhaust target. Reserve its energy before spending on other cards. Re-observe after selection and draw; unknown draws are not included. Check legality and other costs from visible rules. This does not assert that the condition is already active.'
  };
 }));
 const replayLinks=hand.filter(c=>c.can_play && /this turn, your next Attack is played an extra time/i.test(c.description??'')).flatMap(source=>hand.filter(c=>c.type==='Attack' && c.index!==source.index).map(target=>({
  setup:{index:source.index,name:source.name,cost:source.cost,rule:source.description},
  payoff:{index:target.index,name:target.name,cost:target.cost,rule:target.description},
  energyAfterBoth:Number.isFinite(Number(source.cost))&&Number.isFinite(Number(target.cost))?state.player.energy-Number(source.cost)-Number(target.cost):null,
  note:'Play the next-Attack modifier BEFORE its intended attack. Playing it after the last affordable attack gives no benefit this turn. Check both plays fit the energy and card-play limits. Repeated attacks can change their own damage or trigger other rules between plays; do not assume simply doubling printed damage.'
 })));
 return [...exhaustLinks,...replayLinks];
}
