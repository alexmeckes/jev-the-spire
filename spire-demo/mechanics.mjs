// Extract supplied rules only. No encounter lookup or predictions of hidden phases.
export function mechanicsReview(state) {
 if(!state.battle)return null;
 const rules=[...(state.player?.status??[]).map(p=>({owner:'player',...p})),...state.battle.enemies.flatMap(e=>(e.status??[]).map(p=>({owner:e.entity_id,...p})))].map(p=>({owner:p.owner,name:p.name,amount:p.amount,rule:p.description}));
 return {rules,intents:state.battle.enemies.filter(e=>e.hp>0).map(e=>({enemy:e.entity_id,hp:e.hp,intents:e.intents??[]})),checks:[
  'If an intent explicitly says the enemy will be destroyed after attacking, compare surviving that attack against spending energy on further damage. Do not assume its displayed HP must be depleted again; use the stated destruction timing, without inventing immunity or an automatic win.',
  'For each proposed sequence, identify which supplied triggers fire: attacks, skills, HP payments, exhaust, targeting and enemy death. Apply their timing before judging survival.',
  'Check positioning and target changes against visible rules. Before a targeted attack, compare which living attacker will be behind you afterward, and compare ending the sequence facing each possible target. A small hit on a non-attacking enemy can increase another enemy’s back-attack damage enough to be lethal. Preserve an affordable final targeting action when needed to change facing. Use observed intent changes after each action; do not assume attack totals remain unchanged after turning or applying debuffs.',
  'Use recent observations to distinguish repeated behavior from a guaranteed future intent. Never invent unseen phases or enemy rules.',
  'If visible minion rules say they abandon combat without their leader, compare a leader kill against repeatedly clearing replaceable minions. Account for attacks prevented by the entire combat ending, not only the leader’s own intent. Killing minions can still be necessary to survive; identify a concrete affordable path instead of assuming leader damage is always best.',
  'When a visible revival rule depends on other enemies remaining alive, compare temporary attack prevention with the need to finish the remaining enemies inside the stated revival window. Use observed HP and available damage; repeatedly defeating one target may make no lasting progress. Do not assume unseen revival timers or future draws.',
  'Compare remaining enemies and their visible attacks after a kill, including death effects. If a relevant interaction is unmodeled, survival remains uncertain.',
  'If ending now is lethal and current attacks cannot kill, compare energy and draw before spending the last energy. Evaluate the continuation of a prefix; unknown draws are opportunities, not guaranteed rescue.'
 ],scope:'Only visible rules and session observations; Jev chooses all gameplay.'};
}
