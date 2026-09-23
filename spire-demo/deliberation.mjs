import {orderingEvidence,orderingInstruction} from './order-review.mjs';
import {immediateChoiceQuestion} from './immediate-choices.mjs';
import {targetFocusReview} from './target-focus.mjs';
import {deadlineReview} from './deadline-review.mjs';
import {deckAssessment,deckAssessmentInstruction} from './deck-assessment.mjs';
import {powerTimingReview} from './power-timing.mjs';
import {decisionFocus} from './decision-focus.mjs';
import {compactRequest} from './compact-request.mjs';
import {decisionQuestion} from './planner.mjs';
export const DELIBERATION_VERSION='jev-visible-review-v24-card-order';
const upgradeValueReview = 'Evaluate upgrade and other setup effects by their marginal payoff. In combat, identify a specific eligible target from the visible hand, whether it is already upgraded, and whether remaining energy and card-play limits allow using it after setup. Separate immediate block or damage from the upgrade benefit; if the target cannot be played now, future payoff depends on retaining or redrawing it and the fight lasting long enough. Do not assume a combat upgrade permanently improves the deck. Use supplied upgrade text for exact gains; if unavailable, mark the gain uncertain rather than inventing it. For card rewards and purchases, count existing copies and already-upgraded cards, compare the added copy against skipping or other purchases, and account for drawing the setup card instead of needed damage or defense. Another copy needs an unmet need and useful targets, not merely a synergy label. Compare spending that energy on direct damage, defense or scaling. These are tradeoffs, not a ban on setup cards.';
const mechanicsInstruction = 'When visible rules make facing matter, inspect forecast.facingProjection when available (incoming uses its conservative upper bound), forecast.facingReview and the last targeted action in each proposed sequence. Choose the final orientation for the lowest survivable total from all remaining attackers, not automatically the last damage target. Reserve a cheap targeted card or legal targeted potion for turning when needed before spending all energy; compare its cost with block, kills and retaliation. If both sides attack, compare both totals; if only one attacks, consider facing that attacker. Re-observe displayed intents after turning before ending. Do not assume area attacks turn you, or multiply already-adjusted displayed damage by the back-attack bonus again. '+
 'Before a random exhaust or transformation, inventory the other playable cards it may remove or change. Compare playing an affordable useful card first against losing it, including a zero-cost card consuming a remaining paid attack. Damage absorbed from an exhausted attack may favor the opposite order: evaluate the exact supplied rule, without assuming which random target is chosen. '+
 'Apply mechanics_review to each candidate using the supplied rules and recent observations: check triggers, positioning, damage modifiers, death effects and play limits. Explain to yourself how the proposed sequence changes those conditions before choosing. When ending is lethal and no known attack sequence kills, compare energy-then-draw continuations before spending all energy on damage. A prefix forecast assumes ending immediately; it does not prove its continuation fails. Unmodeled effects are uncertainty, not evidence that an unknown damage action is safer than a known energy prefix.';
const killReview = 'Before choosing block, compare affordable focused kill sequences. Read departedMinions as well: a supported leader kill removes those minions and their attacks without killing them. Do not assume other summons leave, or identify a leader from its name alone. Read defeatedEnemies and attackRemoved: killing one attacker prevents its displayed attack and removes future pressure, even if other enemies survive. Compare resulting HP loss and surviving enemies, not block totals or damage spread. Reserve energy for the kill before optional defense; use remaining energy to block other attackers. A kill is not automatically best when it triggers retaliation/revival or leaves lethal incoming damage. Unknown forecasts require checking visible rules, not dismissal. Jev must choose the tradeoff; no action is forced.';
const timingReview = 'Read potion_timing before spending cards or ending: compare use now, later this turn, and saving for each carried potion. Name the actions or healing ticks that benefit and whether delaying loses those opportunities. Lasting buffs and delayed healing deserve consideration at the beginning of combat, not only when HP becomes critical. Do not automatically consume: a short safe fight may justify saving, temporary buffs require follow-up, and block multipliers require block first and damage before expiry. Compare complete affordable known-hand sequences as well as short prefixes: identify whether spending energy on defense prevents a lethal attack or instead strands an attack that defeats the current form. Conditional protection applies only when its stated target condition holds. A visible revival means defeating that form requires re-observation, not assumed combat victory; do not invent next-phase stats. Evaluate HP-for-energy cards by net benefit: identify specific additional playable attacks, block or draw the energy enables, subtract the HP cost, and compare resulting survival and progress. An HP payment can preserve more HP through added defense or a kill; it can also be lethal or wasted when the hand cannot use the energy. For rewards and purchases, assess whether the current deck repeatedly runs out of energy with useful cards remaining rather than automatically favoring or rejecting HP-cost cards. Check setup_dependencies for visible prerequisite/payoff sequences. Exhaust before playing a card whose bonus requires exhausting this turn, preserving that payoff card and its energy. Compare draw early enough to use the results against spending the last energy on draw; draw can still have exhaust or other immediate benefits, so do not ban it. Before spending energy on block cards, compare using visible Dexterity or other block-enhancing potions first: these do not retroactively increase block already gained. Temporary buffs need usable triggers before expiry. Evaluate healing-over-time consumables early enough for their visible ticks to matter; do not assume healing occurs before a lethal hit without a stated timing rule. On turns with zero incoming attacks, distinguish useful draw, upgrades, retained block or other visible triggers from block that expires unused; compare damage and durable scaling using the same energy. For visible damage caps or charges, compare actual HP damage and charges removed per energy, not printed attack damage. Explain benefit through the supplied rules, without assuming every extra card play is good.';
export function perspectiveQuestion(state,candidates,recent=[]) {
 const base=decisionQuestion(state,candidates);
 const descriptions=base.questions.move.criteria;
 const criteria=Object.fromEntries(candidates.map(c=>[c.id,'Candidate '+c.id+'; see candidate_details in shared state.']));
 const focus=decisionFocus(state);
 const payload={...base,state:{...base.state,decision_focus:focus.name,recent_observations:recent,candidate_details:descriptions},questions:{
  move:{...base.questions.move,criteria},
  encounter:{type:'choice',criteria,instructions:'Infer the encounter mechanics from current visible rules and observations. Compare turnHistory and progress: is the current approach actually reducing enemy HP fast enough, or losing ground? Assess the unfinishedPlan before changing direction; revise it when new evidence warrants it. Which candidate best responds to this particular situation? Derive target priorities and timing yourself. Do not assume unseen phases or future intents.'},
  synergy:{type:'choice',criteria,instructions:'Inspect the full current deck and relic rules. Identify the largest current gap in reliable damage, defense, draw, energy or scaling from the actual deck and recent fights; favor choices that address it without assuming future rewards. Which candidate best supports interactions that the deck actually has, accounting for energy, draw consistency and missing capabilities? For rewards, purchases, upgrades and removals, compare the resulting deck including skipping when offered. Do not assume a named archetype or future card rewards. For combat, assess how the available cards work together.'},
  survival:{type:'choice',criteria,instructions:'Select the action or plan that best preserves survival. Evaluate next-turn viability: surviving at 1 HP is not sufficient if no plausible continuation wins. Compare remaining enemy HP, observed attack patterns, draw-pile composition without order, and defensive consistency. Future draws and intents remain uncertain, not guaranteed. Account for killing or stunning enemies to prevent attacks, not just block. Consider whether passive defense loses to enemy scaling. Read unknown mechanics from state; forecasts marked partial omit effects.'},
  pressure:{type:'choice',criteria,instructions:'Select the action or plan that best advances winning this fight or run. Focus fire, scaling, boss thresholds, setup and deck synergy matter. Avoid repeatedly blocking while enemies become stronger. Respect survival constraints.'},
  tempo:{type:'choice',criteria,instructions:'Compare ending the turn with every currently legal productive card or potion. Unused energy and playable attacks warrant scrutiny. Inspect retaliation, self-damage, death effects and resource costs before deciding more play is useful; do not assume an unknown forecast means a bad action. Choose the candidate that best uses this turn.'},
  resources:{type:'choice',criteria,instructions:'Select the best use of energy, cards and consumables for winning the run. Avoid wasted energy, unused beneficial free attacks, unnecessary potions and deck bloat. Spend resources when doing so prevents serious damage or wins a fight. Before a discard/redraw potion, identify cards to replace and how the new hand can help with remaining energy and card-play restrictions. Do not use it when its selection will be empty or replacements cannot help.'},
 }};
 for(const [role,instructions] of Object.entries(focus.instructions)) payload.questions[role].instructions=instructions+' Choose only a supplied candidate ID.';
 if(state.state_type==='card_reward'){
  payload.state.deck_assessment=deckAssessment(state);
  payload.questions.deck_need={type:'choice',criteria:{damage:'Reliable damage and ending fights',defense:'Reliable protection',draw:'Draw and hand consistency',energy:'Playable energy demands',scaling:'Sustained damage or defense over longer fights',balanced:'No clear single bottleneck'},instructions:deckAssessmentInstruction+' Select the best-supported bottleneck from the supplied deck and observations; do not infer it from a desired offered card.'};
  for(const role of ['move','synergy','resources'])payload.questions[role].instructions+=' '+deckAssessmentInstruction;
  return payload;
 }
 const focusReview=targetFocusReview(state);
 if(focusReview)for(const role of ['move','pressure','encounter','survival','tempo'])payload.questions[role].instructions+=' '+focusReview;
 const deadline=deadlineReview(state);
 if(deadline)for(const role of ['move','survival','encounter','tempo','resources'])payload.questions[role].instructions+=' '+deadline;
 const powerReview=powerTimingReview(state);
 if(powerReview)for(const role of ['move','synergy','pressure','tempo','resources'])payload.questions[role].instructions+=' '+powerReview;
 for(const role of ['move','survival','pressure','encounter']) payload.questions[role].instructions+=' '+killReview+' '+mechanicsInstruction;
 for(const role of ['synergy','tempo','resources']) payload.questions[role].instructions+=' '+upgradeValueReview+' '+timingReview;
 return payload;
}
export function reviewQuestion(state,candidates,assessment,recent=[]) {
 const base=decisionQuestion(state,candidates);
 const focus=decisionFocus(state);
 const valid=new Set(candidates.map(c=>c.id));
 if(assessment.answers?.deck_need && (assessment.answers.deck_need.type!=='choice' || !['damage','defense','draw','energy','scaling','balanced'].includes(assessment.answers.deck_need.choice)))throw Error('Invalid deck need assessment');
 const recommendations=Object.fromEntries(Object.entries(assessment.answers??{}).filter(([role])=>role!=='deck_need').map(([role,a])=>{
  if(a.type!=='choice'||!valid.has(a.choice))throw Error('Invalid Jev assessment choice');
  return [role,{choice:a.choice,label:candidates.find(c=>c.id===a.choice).label,confidence:a.confidence}];
 }));
 if(!recommendations.move)throw Error('Missing initial Jev choice');
 if(state.state_type==='card_reward')return {...base,state:{...base.state,deck_assessment:deckAssessment(state),deck_need_hypothesis:assessment.answers?.deck_need??null,decision_focus:focus.name,jev_recommendations:recommendations,recent_observations:recent,review_note:'Same-model recommendations are fallible, not votes or independent evidence.'},questions:{move:{...base.questions.move,instructions:deckAssessmentInstruction+' '+focus.instructions.move+' '+focus.instructions.synergy+' '+focus.review+' Choose only a supplied candidate ID.'}}};
 return {...base,state:{...base.state,decision_focus:focus.name,end_turn_check:{energy:state.player?.energy,playable_cards:(state.player?.hand??[]).filter(c=>c.can_play).map(c=>({name:c.name,cost:c.cost,description:c.description})),note:'Before ending with playable cards, compare their concrete benefits and risks. DeathBlow and delayed death effects can be lethal even after reducing normal enemy HP to zero.'},jev_recommendations:recommendations,recent_observations:recent,
   review_note:'These recommendations are fallible assessments from the SAME model, not independent evidence or votes. Disagreement does not imply uncertainty about the game rules.'},
  questions:{move:{...base.questions.move,instructions:base.questions.move.instructions+' '+(focus.instructions.move??'')+' '+focus.review+' '+mechanicsInstruction+' '+killReview+' '+upgradeValueReview+' '+timingReview+' '+powerTimingReview(state)+' '+deadlineReview(state)+' '+targetFocusReview(state)+' Review the recommendations against the actual state and rules. Correct the initial choice if another action better wins the run. Do not blindly vote or defer to a recommendation. Treat encounter and deck-synergy recommendations as hypotheses. Check them against visible rules, the current deck, and this run’s observations. Compare observed HP and enemy Strength trends; surviving one turn is not sufficient if the approach is losing the encounter. Reconcile the prior unfinished plan with the new observation before choosing another setup action. If changing a still-legal plan, explicitly compare the defense and future protection sacrificed for extra damage or draw, and whether that damage reaches a kill or visible stun. Compare what changed and whether the replacement actually improves survival or progress. Compare cheaper lethal attacks against overkill that consumes energy needed for defense. Include visible end-of-turn status-card effects; partial forecasts can omit lethal damage. Check whether setup actually triggers soon enough to help; a power with no available trigger may do nothing before lethal damage. Do not prefer a numeric forecast over an unknown defensive option merely because it is numeric. Check missed kills/stuns, target focus, avoidable HP loss, wasted potions, free attacks, and ending early. Repeated short-term defense can still lose to scaling. Choose from ALL supplied candidates; none have been removed.'}}};
}
export async function deliberate({state,candidates,ask:rawAsk,recent=[],onStage=()=>{},immediateChoices=false}) {
 const ask=async payload=>{
  const request=compactRequest(immediateChoices ? immediateChoiceQuestion(payload,candidates) : payload);
  const result=await rawAsk(request);
  if(immediateChoices)for(const [role,answer] of Object.entries(result.answers??{})){
   if(answer.type!=='choice'||!Object.hasOwn(request.questions[role]?.criteria??{},answer.choice))throw Error('Invalid immediate-choice response');
  }
  return result;
 };
 if(candidates.length<=1) return {...await ask(decisionQuestion(state,candidates)),deliberation:null};
 onStage('Jev is assessing the encounter and deck synergy');
 const first=await ask(perspectiveQuestion(state,candidates,recent));
 onStage('Jev is reviewing its recommendations');
 let final=await ask(reviewQuestion(state,candidates,first,recent));
 if(final.answers?.move?.type!=='choice'||!candidates.some(c=>c.id===final.answers.move.choice))throw Error('Invalid Jev final choice');
 const totals={input_tokens:(first.usage?.input_tokens??0)+(final.usage?.input_tokens??0),output_tokens:(first.usage?.output_tokens??0)+(final.usage?.output_tokens??0)};
 const delayedHealingAvailable=candidates.some(c=>c.command.action==='use_potion' && /regen|heal/i.test((state.player?.potions??[]).find(p=>p.slot===c.command.slot)?.description??''));
 let endTurnReviewed=false;
 if(candidates.find(c=>c.id===final.answers.move.choice)?.command.action==='end_turn' && ((state.player?.hand??[]).some(c=>c.can_play)||delayedHealingAvailable)){
  onStage('Jev is checking unused playable cards before ending');
  const check=reviewQuestion(state,candidates,first,recent);
  check.state.proposed_end_turn={choice:final.answers.move.choice,confidence:final.answers.move.confidence};
  check.questions.move.instructions+=' Your final choice was end turn while a playable card or healing potion remains available. Compare using any carried healing-over-time potion now against postponing another tick: inspect missing HP and remaining enemy HP. Do not wait for lethal danger to evaluate delayed healing. Saving is allowed when justified by actual benefit and future value. Independently compare at least one concrete playable action against ending now, including current free attacks, removable damaging Status cards, setup and remaining energy. Check retaliation and self-damage from visible rules. Change the choice if an action offers a better outcome; keeping end turn is valid when justified by the state. If visible positioning rules allow targeting to change facing, compare a cheap targeted action toward the largest attacker before ending. This may prevent more damage than block even without a kill; use observed changes and keep unknown amounts uncertain. Do not assume a short prefix forces ending afterward.';
  final=await ask(check);endTurnReviewed=true;
  if(final.answers?.move?.type!=='choice'||!candidates.some(c=>c.id===final.answers.move.choice))throw Error('Invalid Jev end-turn review');
  totals.input_tokens+=final.usage?.input_tokens??0;totals.output_tokens+=final.usage?.output_tokens??0;
 }
 let merchantReviewed=false;
 if(['shop','fake_merchant'].includes(state.state_type) && candidates.find(c=>c.id===final.answers.move.choice)?.command.action==='proceed' && candidates.some(c=>c.command.action==='shop_purchase')){
  onStage('Jev is checking affordable purchases before leaving');
  const check=reviewQuestion(state,candidates,first,recent);
  check.state.proposed_shop_exit={gold:state.player?.gold,choice:final.answers.move.choice};
  check.questions.move.instructions+=' You proposed leaving with affordable stock. Compare one concrete affordable purchase basket against leaving: actual prices, remaining gold, relic benefits, useful potions, removal, and deck weaknesses. Gold carried past the boss provides no combat benefit. Saving requires a visible opportunity or a reason these purchases do not help; do not invent future stock. Pick the first purchase of a worthwhile basket, or retain leave if the offered stock is poor. All candidates remain legal.';
  final=await ask(check);merchantReviewed=true;
  if(final.answers?.move?.type!=='choice'||!candidates.some(c=>c.id===final.answers.move.choice))throw Error('Invalid Jev merchant review');
  totals.input_tokens+=final.usage?.input_tokens??0;totals.output_tokens+=final.usage?.output_tokens??0;
 }
 let orderReviewed=false,orderReview=null;
 const ordering=orderingEvidence(state,candidates.find(c=>c.id===final.answers.move.choice));
 if(ordering){
  onStage('Jev is checking card order before acting');
  const check=reviewQuestion(state,candidates,first,recent);
  check.state.card_order_review=ordering;
  check.questions.move.instructions+=' '+orderingInstruction;
  const previous=final.answers.move.choice;
  final=await ask(check);
  if(final.answers?.move?.type!=='choice'||!candidates.some(c=>c.id===final.answers.move.choice))throw Error('Invalid Jev card-order review');
  orderReviewed=true;orderReview={before:previous,after:final.answers.move.choice,changed:previous!==final.answers.move.choice,pairs:ordering.pairs.length};
  totals.input_tokens+=final.usage?.input_tokens??0;totals.output_tokens+=final.usage?.output_tokens??0;
 }
 return {...final,usage:totals,
  deliberation:{version:DELIBERATION_VERSION,choiceRepresentation:immediateChoices?'immediate-with-plan-evidence-v1':'plans',focus:decisionFocus(state).name,calls:2+Number(endTurnReviewed)+Number(merchantReviewed)+Number(orderReviewed),endTurnReviewed,merchantReviewed,orderReviewed,orderReview,initial:first.answers.move,assessments:first.answers,changed:first.answers.move.choice!==final.answers.move.choice,models:[first.model,final.model]}};
}
