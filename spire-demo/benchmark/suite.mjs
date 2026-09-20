// Freeze these criteria before running either policy. Checks are narrow error checks,
// not a claim that every passing action is strategically optimal.
export const cases=[
 ['hemokinesis-lethal','self-harm','avoid-hemokinesis','At 1 HP, paying the visible HP cost kills the player before its attack.'],
 ['empty-hand-bloodletting','energy','avoid-bloodletting','Last-card energy payment has no remaining hand payoff; no rescue is claimed.'],
 ['beckon-play','status','play-beckon','Only playable cards are Beckons; spending the remaining energy removes one 6-HP hand penalty. Still not sufficient to survive.'],
 ['exhaust-threshold','conditional','avoid-pacts','Pact’s End below its visible exhaust threshold has no damage payoff.'],
 ['conditional-draw','conditional',null,'Check empty-hand requirements and No Draw; evaluate manually.'],
 ['flex-timing','potions',null,'Compare the temporary buff before affordable attacks.'],
 ['fortifier','potions','avoid-fortifier','No displayed incoming attack; existing block multiplier offers no immediate protection in this state.'],
 ['potion-timing','potions',null,'Compare lasting buffs before affected cards; no unique best action asserted.'],
 ['weak-potion','potions',null,'Compare Weak and defensive continuations.'],
 ['final-form','kill',null,'Recorded missed kill/form sequencing; revival is not assumed victory.'],
 ['slippery','kill',null,'Remove charges before expensive damage.'],
 ['slippery-again','kill',null,'Compare affordable order of hits.'],
 ['survival','defense',null,'Compare kills and block under low HP.'],
 ['nibbit-sequence','defense',null,'Full sequence survival versus short prefixes.'],
 ['pyre-lethal','setup','avoid-pyre','Future-turn energy does not prevent the displayed lethal attack this turn.'],
 ['relax-lethal','setup',null,'Immediate block versus delayed energy/draw.'],
 ['rocket-lethal','positioning',null,'Facing and energy-then-draw; unknown future draws.'],
 ['waterfall-deathblow','mechanics',null,'Visible self-destruction requires surviving the attack.'],
 ['intangible-loss-wording','mechanics',null,'One-damage cap; damage versus defense cannot be graded by printed damage.'],
 ['direct-hp-loss','status',null,'Unblocked hand penalty versus attack defense.'],
 ['exhaust-payoff','setup',null,'Exhaust before conditional payoff while preserving it.'],
 ['deck-reward','deck',null,'Deck synergy choice is exploratory, not an oracle-scored tactical case.'],
 ['damage-cap','mechanics',null,'Known damage cap and unsupported interactions.'],
 ['beast-free','tempo',null,'Useful free attacks and their risks.'],
].map(([fixture,category,check,rationale])=>({fixture,category,check,rationale}));
export function grade(test,chosen){
 if(!test.check)return {status:'review-only'};
 const label=chosen.label.replace(/\+/g,'').toLowerCase();
 const bad={'avoid-hemokinesis':'hemokinesis','avoid-bloodletting':'bloodletting','avoid-pacts':"pact's end",'avoid-fortifier':'fortifier','avoid-pyre':'pyre'};
 const pass=test.check==='play-beckon'?label.startsWith('beckon'):!label.startsWith(bad[test.check]);
 return {status:pass?'pass':'fail',scope:'Narrow first-action error check; not optimality or win probability.'};
}
