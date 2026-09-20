// Surface timing opportunities from supplied text; never choose or consume a potion.
export function potionTiming(state) {
 if(!state.battle)return null;
 const p=state.player??{};
 return {
  round:state.battle.round,energy:p.energy,block:p.block,hp:p.hp,max_hp:p.max_hp,
  playable_cards:(p.hand??[]).filter(c=>c.can_play).map(c=>({name:c.name,cost:c.cost,description:c.description})),
  enemy_intents:(state.battle.enemies??[]).filter(e=>e.hp>0).map(e=>({enemy:e.entity_id,hp:e.hp,intents:e.intents??[]})),
  potions:(p.potions??[]).map(potion=>{
   const rule=[potion.description,...(potion.keywords??[]).map(k=>k.description)].filter(Boolean).join(' ');
   const checks=[];
   if(/next (?:card|attack).*extra time/i.test(rule)) checks.push('Before consuming, select the exact affordable next card to repeat and compare its immediate doubled benefit. The next qualifying play consumes the effect: avoid an intervening setup card unless repeating that setup is intentionally better. Repeating a future-trigger power supplies no immediate block or kill without its trigger.');
   if(/random|choose|fill.*potion/i.test(rule)) checks.push('This reveals new options. Compare using before spending remaining energy or block-card opportunities so revealed cards or buffs can still help. Re-observe the result; do not assume which option appears.');
   if(/strength|dexterity/i.test(rule)) checks.push('Compare using before the attacks or block cards it enhances. Determine duration from the supplied rules; no retroactive benefit to cards already played.');
   if(/regen|regenerat|heal.*(?:turn|combat)|(?:turn|combat).*heal/i.test(rule)) checks.push('Compare use now against saving: delayed healing needs enough remaining turns and missing HP. Late use may yield few ticks; do not count a tick before an incoming lethal hit unless its timing explicitly allows it.');
   if(/this turn|end of.*turn|until.*turn/i.test(rule)) checks.push('Identify specific useful triggers before expiry. Compare their energy and play limits before spending the potion; no available trigger can mean zero payoff.');
   if(/triple.*block|double.*block/i.test(rule)) checks.push('Use the current Block as the multiplier base. Compare after gaining block, then check whether that block will absorb damage before expiring.');
   if(/draw|energy/i.test(rule)) checks.push('Name the continuation enabled by the energy or draw before other actions exhaust its useful window. Unknown draws are not guaranteed.');
   return {slot:potion.slot,name:potion.name,description:potion.description,keywords:potion.keywords??[],checks};
  }),
  comparison:'For each carried potion compare use now, later in this turn, and saving for another fight. Lasting effects may gain more value early in a long fight; burst defense and multipliers need their own timing. Estimate only supported benefits and give a concrete reason for deferring. Do not use every potion on turn one or spend it merely because combat is ending.'
 };
}
