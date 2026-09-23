// Offline experiment only: replay validation has not met the deployment gate.
import {decisionQuestion} from './planner.mjs';

export const END_TURN_COMPARISON_VERSION = 'visible-end-turn-comparison-v1';
const metrics = ['hpAfter','hpLoss','damage','incoming','block','endTurnCardDamage','endTurnCardHpLoss','energyLeft','survives'];
const delta = (a,b) => Number.isFinite(a) && Number.isFinite(b) ? a-b : null;

// A comparison of existing estimates, never an action filter or a proof of dominance.
export function endTurnComparison(candidates) {
 const end = candidates.find(c=>c.command.action==='end_turn');
 if (!end) return null;
 const baseline = end.forecast ?? {};
 return {version:END_TURN_COMPARISON_VERSION,baseline:end.id,
  scope:'Estimates if each prefix is followed by ending. Unknown draws and later turns are not simulated. Partial forecasts omit listed effects; inspect visible rules before relying on a difference. Higher damage alone does not prove an action better.',
  options:candidates.map(c=>{
   const f=c.forecast??{};
   return {id:c.id,label:c.label,first_action:c.command,sequence:c.plan,
    estimate:Object.fromEntries(metrics.map(k=>[k,f[k]??null])),
    change_vs_ending:{hp:delta(f.hpAfter,baseline.hpAfter),damage:delta(f.damage,baseline.damage)},
    quality:f.quality??'unknown',boundary:f.boundary??null,warnings:f.warnings??['No forecast available'],
    defeatedEnemies:f.defeatedEnemies??[],departedMinions:f.departedMinions??[],delayedDeathEffects:f.delayedDeathEffects??[],
    facingProjection:f.facingProjection??null};
  })};
}

export function endTurnComparisonQuestion(state,candidates,recent=[]) {
 const base=decisionQuestion(state,candidates);
 return {...base,state:{...base.state,recent_observations:recent,end_turn_comparison:endTurnComparison(candidates)},
  questions:{move:{...base.questions.move,instructions:
   'Choose the best next action from ALL supplied candidate IDs. Compare ending now with the numerical alternatives in end_turn_comparison. First check survival and visible self-damage, retaliation, card-play limits, death triggers, facing, exhaust triggers and resource preservation. Then compare progress toward winning. When a play adds damage at the same resulting HP, identify any concrete downside before wasting that opportunity. A playable damaging Status may cost HP if kept: compare removing it with ending. Reject harmful extra plays; unused energy alone is not a reason to play. Partial estimates are evidence to check against the visible rules, not guarantees. Unknown draw prefixes are not complete turns. Do not assume future draws, intents or a match win. Jev makes the final choice; keeping end turn is valid.'}}};
}
