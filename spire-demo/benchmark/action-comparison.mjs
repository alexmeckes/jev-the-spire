// Comparable projections, not an oracle or action filter. Unsupported values stay null.
export function actionComparison(candidates){
 const end=candidates.find(c=>c.command.action==='end_turn');
 if(!end)return null;
 const view=c=>({id:c.id,first_action:c.command,sequence:c.plan?.map(a=>a.label),damage:c.forecast?.damage??null,block:c.forecast?.block??null,hpLoss:c.forecast?.hpLoss??null,hpAfter:c.forecast?.hpAfter??null,energyLeft:c.forecast?.energyLeft??null,handHpPenalty:c.forecast?.endTurnCardHpLoss??null,survives:c.forecast?.survives??null,boundary:c.forecast?.boundary??null,quality:c.forecast?.quality??'unknown'});
 return {ending:view(end),alternatives:candidates.filter(c=>c!==end).map(view),scope:'Same existing prefix forecasts, assuming ending after each prefix. Read original warnings and visible rules. Null is unknown. This table does not assert optimality or remove any choice.'};
}
export const comparisonInstruction=' Explicitly compare the action_comparison ending row with at least one affordable alternative. Identify HP paid, damage or hand penalties prevented, and a concrete use for added energy before choosing. If both forecasts are lethal, that alone does not make actions equivalent: avoid an extra HP payment with no usable payoff, and prefer preventing avoidable HP loss when there is no offsetting visible downside. Do not invent a rescue. Unknown effects and useful continuations must be checked against the original rules; a short prefix is not a forced end turn.';
