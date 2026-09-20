// Frozen before evaluation. Successful first actions are demonstrated in source logs.
// No future draw or subsequent model choice is assumed.
export const freshCases=[
 ['fresh-block','defense','22 HP versus 28 incoming; Defend+ adds 8 block, leaving 2 HP. Strike spends the only energy; Regen alone heals at most 5 and cannot save it.'],
 ['fresh-kill-attacker','kill','25 HP and 5 block versus 30 incoming. Free Pommel Strike kills the 1-HP attacker, removes 6 incoming, leaves 6 HP without relying on its draw.'],
 ['fresh-finish-fight','kill','13 HP versus 18 incoming; Perfected Strike kills the last 19-HP enemy. Other prefixes may still win and are not called failures.'],
 ['fresh-taunt','defense','5 HP and 10 block versus 21 incoming. Taunt adds 7 block, leaving 1 HP; Strike spends the only energy without killing.'],
].map(([fixture,category,rationale])=>({fixture,category,rationale,check:'fresh-visible-survival'}));
export function gradeFresh(test,chosen){
 const c=chosen.command;
 let status='review-only';
 if(c.action==='end_turn')status='fail';
 if(c.action==='play_card'){
  if(test.fixture==='fresh-block')status=c.card_index===0?'pass':'fail';
  if(test.fixture==='fresh-taunt')status=c.card_index===2?'pass':'fail';
  if(test.fixture==='fresh-kill-attacker'&&c.target==='TOUGH_EGG_3')status='pass';
  // Other targets draw unknown cards: no guaranteed survival, but not proven death.
  if(test.fixture==='fresh-finish-fight'&&c.card_index===0)status='pass';
 }
 return {status,scope:'First action establishes demonstrated survival/kill, commits to visible lethal, or needs continuation review. No full-run win claim.'};
}
