import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planCandidates, projectSequence, decisionCandidates} from './planner.mjs';
import {actionsFor} from './actions.mjs';
const fixture=name=>JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`,import.meta.url))).state;

test('recorded Vantom: a 45-damage Bludgeon loses only one HP to Slippery',()=>{
  const s=fixture('slippery');const f=projectSequence(s,['Bludgeon+ → Vantom']);
  assert.equal(f.damage,1);assert.equal(f.slipperyRemoved,1);assert.equal(f.energyLeft,0);
});
test('multi-hit Slippery charges and potion energy are simulated per hit',()=>{
  const s=fixture('slippery');
  const f=projectSequence(s,['Energy Potion','Whirlwind']);
  assert.equal(f.damage,19);assert.equal(f.slipperyRemoved,3);assert.equal(f.energyLeft,0);
});
test('Rage before attacks gains block; Rage after does not retroactively do so',()=>{
  const s=fixture('slippery-again');
  const first=projectSequence(s,['Rage','Strike → Vantom']);
  const last=projectSequence(s,['Strike → Vantom','Rage']);
  assert.equal(first.block-last.block,3);
});
test('potions expose a survival path from the recorded two-HP state',()=>{
  const s=fixture('survival');
  assert.equal(projectSequence(s,['Defend','Uppercut → Vantom']).survives,false);
  const f=projectSequence(s,['Block Potion','Uppercut → Vantom','Strike → Vantom']);
  assert.equal(f.survives,true);assert.equal(f.hpLoss,0);assert.equal(f.incoming,8);
});
test('search retains immediate legal actions and setup-dependent multi-step plans',()=>{
  const s=fixture('slippery'),original=JSON.stringify(s),plans=planCandidates(s);
  for(const a of actionsFor(s))assert.ok(plans.some(p=>JSON.stringify(p.command)===JSON.stringify(a.command)));
  assert.ok(plans.some(p=>p.plan[0].label==='Rage' && p.plan.some(a=>a.label==='Energy Potion') && p.plan.some(a=>a.label==='Whirlwind')));
  assert.ok(plans.length<=64);assert.equal(JSON.stringify(s),original);
});
test('draws stop the projected sequence without looking at hidden draw order',()=>{
  const s=fixture('survival');s.player.hand=[{index:0,name:'Shrug It Off',cost:'1',description:'Gain 8 Block. Draw 1 card.',type:'Skill',target_type:'Self',can_play:true}];
  const f=projectSequence(s,['Shrug It Off']);assert.equal(f.boundary,'draw');assert.equal(f.block,8);
  assert.throws(()=>projectSequence(s,['Shrug It Off','Block Potion']),/draw/);
});
test('unsupported powers and cards have unknown forecasts, never fabricated zero damage',()=>{
  const s=fixture('slippery');s.battle.enemies[0].status.push({name:'Unmodeled shield',amount:1});
  const f=projectSequence(s,['Bludgeon+ → Vantom']);assert.equal(f.quality,'partial');assert.equal(f.damage,1);assert.ok(f.warnings.some(w=>w.includes('Unmodeled shield')));
  const other=fixture('survival');other.player.hand[0].name='Unmodeled attack';assert.equal(projectSequence(other,['Unmodeled attack → Vantom']).damage,null);
});
test('hand selection remains an action choice, never a simulated card play',()=>{
  const s=fixture('survival');s.state_type='hand_select';s.hand_select={cards:[{index:0,name:'Strike'}]};
  assert.equal(decisionCandidates(s)[0].command.action,'combat_select_card');assert.equal(decisionCandidates(s)[0].forecast,undefined);
});

test('second boss retains plans and exposes Plow threshold',()=>{
 const s=fixture('beast-energy'),plans=planCandidates(s);
 assert.ok(plans.some(p=>p.plan.length>1));
 assert.ok(plans.some(p=>p.forecast.damage>0));
 assert.equal(plans.find(p=>p.label==='End turn').forecast.bossThresholds[0].damageToStun,48);
 s.battle.enemies[0].hp=155;
 const f=projectSequence(s,['Strike → Ceremonial Beast']);
 assert.equal(f.bossStunned,true); assert.equal(f.incoming,0);
});
test('Tuning Fork grants block on the tenth skill',()=>{
 const s=fixture('beast-energy');s.player.block=0;s.player.hand.push({index:s.player.hand.length,name:'Defend',cost:'1',description:'Gain 5 Block.',type:'Skill',target_type:'Self',can_play:true});s.player.relics.find(r=>r.id==='TUNING_FORK').counter=9;
 const f=projectSequence(s,['Defend']);assert.equal(f.block,12);
});
test('Free Attack applies Rage block and stops before reusing temporary costs',()=>{
 const s=fixture('beast-free');const f=projectSequence(s,['Mind Blast → Ceremonial Beast']);
 assert.equal(f.energyLeft,1);assert.equal(f.damage,5);assert.equal(f.block,6);
 assert.equal(f.boundary,'free_attack_consumed');
});
test('unknown relic keeps known effects and sequence search with explicit caveats',()=>{
 const s=fixture('beast-energy');s.player.relics.push({id:'UNKNOWN',name:'Mystery'});
 const plans=planCandidates(s);assert.ok(plans.some(p=>p.plan.length>1));
 assert.ok(plans.some(p=>p.forecast.quality==='partial' && p.forecast.damage>0));
});

test('Perfected Strike live damage already includes Strike-count bonus',()=>{
 const s=fixture('beast-potion');assert.equal(projectSequence(s,['Perfected Strike → Ceremonial Beast','Bully → Ceremonial Beast']).damage,24);
});

test('Dominate gains strength from Vulnerable after applying it; follow-up attack uses new strength',()=>{
 const s=fixture('nibbit-sequence');const target=s.battle.enemies[0];const before=target.status.find(p=>p.name==='Vulnerable').amount;
 const f=projectSequence(s,['Dominate → Nibbit']);assert.equal(f.strengthGained,before+1);assert.notEqual(f.quality,'unknown');
});
test('Impervious and Rage-before-Thunderclap have calculated block',()=>{
 const s=fixture('nibbit-sequence');const early=projectSequence(s,['Rage','Thunderclap']);const late=projectSequence(s,['Thunderclap','Rage']);assert.equal(early.block-late.block,3);
 s.player.hand=[{index:0,name:'Impervious',cost:'2',description:'Gain 30 Block. Exhaust.',type:'Skill',target_type:'Self',can_play:true}];assert.equal(projectSequence(s,['Impervious']).block,30);
});
test('Vicious stops planning when Vulnerable triggers unknown draw',()=>{
 const s=fixture('nibbit-sequence');s.player.status.push({name:'Vicious',amount:1});const f=projectSequence(s,['Thunderclap']);assert.equal(f.boundary,'draw');assert.throws(()=>projectSequence(s,['Thunderclap','Defend']),/draw/);
});
test('Artifact blocks Vulnerable and its Vicious draw trigger',()=>{
 const s=fixture('nibbit-sequence');s.player.status.push({name:'Vicious',amount:1});for(const e of s.battle.enemies)e.status.push({name:'Artifact',amount:2});
 assert.notEqual(projectSequence(s,['Thunderclap']).boundary,'draw');
});

test('recorded Infection turn distinguishes lethal overkill from Strike plus Defend',()=>{
 const s=fixture('infection-lethal');
 const overkill=projectSequence(s,['Perfected Strike → Wriggler']);
 assert.equal(overkill.endTurnCardDamage,3);
 assert.equal(overkill.hpAfter,0);assert.equal(overkill.survives,false);
 const safe=projectSequence(s,['Strike → Wriggler','Defend']);
 assert.equal(safe.hpAfter,4);assert.equal(safe.survives,true);
 const double=structuredClone(s);double.player.hand.push({...s.player.hand.find(c=>c.name==='Infection'),index:99});
 assert.equal(projectSequence(double,['Strike → Wriggler','Defend']).endTurnCardDamage,6);
});

test('recorded Kin defense: Stone Armor and Armaments have known immediate protection',()=>{
 const s=fixture('kin-defense');
 assert.equal(projectSequence(s,['Stone Armor']).hpAfter,5);
 const arm=projectSequence(s,['Armaments']);
 assert.equal(arm.hpAfter,4);assert.equal(arm.boundary,'upgrade');
 assert.equal(projectSequence(s,['Strike → Kin Priest']).hpAfter,1);
});
test('Feel No Pain grants no block on cast and triggers on Offering exhaust; icon energy is parsed',()=>{
 const s=fixture('kin-defense');s.player.energy=3;s.player.status=[];
 s.player.hand=[{index:0,name:'Feel No Pain',type:'Power',cost:'1',description:'Whenever a card is Exhausted, gain 3 Block.',target_type:'Self',can_play:true},{index:1,name:'Offering',type:'Skill',cost:'0',description:'Lose 6 HP. Gain [ironclad_energy_icon.png][ironclad_energy_icon.png]. Draw 3 cards. Exhaust.',target_type:'Self',can_play:true}];
 assert.equal(projectSequence(s,['Feel No Pain']).block,0);
 const f=projectSequence(s,['Feel No Pain','Offering']);assert.equal(f.block,3);assert.equal(f.energyLeft,4);assert.equal(f.boundary,'draw');
});

test('Ringing recorded fight never proposes more than one card play',()=>{
 const s=fixture('ringing');const plans=planCandidates(s);
 assert.ok(plans.length>1);
 for(const p of plans)assert.ok(p.plan.filter(x=>x.command.action==='play_card').length<=1);
 assert.throws(()=>projectSequence(s,['Setup Strike → Ceremonial Beast','Strike → Ceremonial Beast']),/card_play_limit/);
});

test('Waterfall Giant death blow is incoming damage, and killing it is not victory',()=>{
 const s=fixture('waterfall-deathblow');const f=projectSequence(s,['End turn']);
 assert.equal(f.incoming,57);assert.equal(f.survives,false);
 const death=projectSequence(fixture('waterfall-lethal'),['Strike → Waterfall Giant']);
 assert.equal(death.boundary,'death_effect');assert.equal(death.survives,null);
 assert.ok(death.delayedDeathEffects.length);
});
test('Toxic stacks contribute damage; Giant Rocks retain concrete attack plans',()=>{
 const f=projectSequence(fixture('myte-toxic'),['End turn']);
 assert.equal(f.endTurnCardDamage,10);assert.equal(f.hpAfter,12);
 const rocks=fixture('giant-rock');const p=projectSequence(rocks,['Giant Rock → Myte','Giant Rock → Myte','Giant Rock → Myte']);
 assert.equal(p.damage,48);assert.equal(p.energyLeft,0);
});

test('Bound cards stop projections for fresh legality rather than chaining restricted cards',()=>{
 const s=fixture('queen-bound');
 const bash=projectSequence(s,['Bash → Queen']);assert.equal(bash.boundary,'bound_card_played');
 assert.throws(()=>projectSequence(s,['Bash → Queen','Primal Force']),/bound_card_played/);
 for(const p of planCandidates(s)){
  const first=p.plan[0];const card=s.player.hand[first.command.card_index];
  if(first.command.action==='play_card'&&/\bBound\b/.test(card?.description??''))assert.equal(p.plan.length,1);
 }
});

test('Unmovable live doubled block is not reused for later cards in a prefix',()=>{
 const s=fixture('unmovable-block');const f=projectSequence(s,['Defend']);
 assert.equal(f.block,14);assert.equal(f.boundary,'block_modifier_consumed');
 assert.throws(()=>projectSequence(s,['Defend','Defend']),/block_modifier_consumed/);
});

test('No Draw suppresses speculative draw boundaries and Taunt has concrete block and debuff',()=>{
 const s=fixture('infection-lethal');s.player.status=[{name:'No Draw',amount:1}];
 s.player.hand=[{index:0,name:'Pommel Strike',type:'Attack',cost:'1',description:'Deal 9 damage. Draw 1 card.',target_type:'AnyEnemy',can_play:true},{index:1,name:'Taunt',type:'Skill',cost:'1',description:'Gain 7 Block. Apply 1 Vulnerable.',target_type:'AnyEnemy',can_play:true}];
 const f=projectSequence(s,['Pommel Strike → Wriggler','Taunt → Wriggler']);
 assert.equal(f.block,7);assert.notEqual(f.boundary,'draw');
});

test('Toric Toughness does not credit future block toward current survival',()=>{
 const s=fixture('infection-lethal');s.player.hp=6;s.player.energy=4;s.player.status=[{name:'Ringing',amount:1}];
 s.player.hand=[{index:0,name:'Toric Toughness',type:'Skill',cost:'2',description:'Gain 5 Block. Gain 5 Block at the start of the next 2 turns. Ringing.',target_type:'Self',can_play:true}];
 s.battle.enemies=[{entity_id:'enemy',name:'Enemy',hp:100,intents:[{type:'Attack',label:'18'}],status:[]}];
 const f=projectSequence(s,['Toric Toughness']);assert.equal(f.block,5);assert.equal(f.survives,false);assert.equal(f.boundary,'card_play_limit');
});

test('Hemokinesis HP cost kills before damage and ignores block',()=>{
 const s=fixture('hemokinesis-lethal');s.player.block=100;
 const f=projectSequence(s,['Hemokinesis+ → Parafright']);
 assert.equal(f.boundary,'player_dead');assert.equal(f.damage,0);assert.equal(f.hpAfter,0);assert.equal(f.survives,false);
 s.player.hp=10;
 const living=projectSequence(s,['Hemokinesis+ → Parafright']);
 assert.equal(living.damage,20);assert.equal(living.hpAfter,8);assert.equal(living.survives,true);
 assert.ok(planCandidates(s).some(p=>p.command.card_index===5),'legal choice remains available to Jev');
});

test('Dexterity potions add block only to subsequent cards, including stacked potions',()=>{
 const s=fixture('potion-timing');
 const labels=planCandidates(s).map(x=>x.label);
 const dex=labels.find(x=>x.startsWith('Dexterity Potion')&&!x.includes(' → '));
 const speed=labels.find(x=>x.startsWith('Speed Potion')&&!x.includes(' → '));
 assert.ok(dex);assert.ok(speed);
 const before=projectSequence(s,[dex,speed,'Defend']);
 const after=projectSequence(s,['Defend',dex,speed]);
 assert.equal(before.block-after.block,7);
 assert.equal(projectSequence(s,[dex,speed]).block,s.player.block);
});

test('Restlessness grants no energy or draw with other cards remaining, and works as last card',()=>{
 const s=fixture('conditional-draw');
 const f=projectSequence(s,['Restlessness+']);
 assert.equal(f.energyLeft,s.player.energy);assert.equal(f.boundary,null);
 assert.match(f.warnings.join(' '),/condition not met/);
 s.player.hand=[{...s.player.hand.find(c=>c.name==='Restlessness+'),index:0}];
 const last=projectSequence(s,['Restlessness+']);assert.equal(last.energyLeft,s.player.energy+3);assert.equal(last.boundary,'draw');
 s.player.status=[{name:'No Draw',amount:1}];
 const blocked=projectSequence(s,['Restlessness+']);assert.equal(blocked.energyLeft,s.player.energy+3);assert.equal(blocked.boundary,null);
});

test('Bloodletting enables energy-blocked defense, paying HP before energy',()=>{
 const s=fixture('infection-lethal');s.player.hp=10;s.player.energy=0;s.player.block=0;s.player.status=[];s.player.potions=[];
 s.player.hand=[{index:0,name:'Bloodletting',type:'Skill',cost:'0',description:'Lose 3 HP. Gain [ironclad_energy_icon.png][ironclad_energy_icon.png].',target_type:'Self',can_play:true},...Array.from({length:2},(_,i)=>({index:i+1,name:'Defend',type:'Skill',cost:'1',description:'Gain 5 Block.',target_type:'Self',can_play:false,unplayable_reason:'EnergyCostTooHigh'}))];
 s.battle.enemies=[{entity_id:'enemy',name:'Enemy',hp:50,block:0,status:[],intents:[{type:'Attack',label:'10'}]}];
 assert.equal(projectSequence(s,['End turn']).survives,false);
 const f=projectSequence(s,['Bloodletting','Defend','Defend']);assert.equal(f.block,10);assert.equal(f.hpAfter,7);assert.equal(f.energyLeft,0);assert.equal(f.survives,true);
 assert.ok(planCandidates(s).some(p=>p.plan.length===3&&p.plan[0].label==='Bloodletting'&&p.forecast.block===10));
 s.player.hp=3;s.player.block=100;
 const lethal=projectSequence(s,['Bloodletting']);assert.equal(lethal.survives,false);assert.equal(lethal.boundary,'player_dead');assert.equal(lethal.energyLeft,0);
 s.player.hp=10;s.player.hand[0].name='Bloodletting+';s.player.hand[0].description+='[ironclad_energy_icon.png]';
 assert.equal(projectSequence(s,['Bloodletting+']).energyLeft,3);
 s.player.hand[0].description+=' Gain 4 Tainted.';
 assert.equal(projectSequence(s,['Bloodletting+']).quality,'unknown');
});

test('Colossus reduction depends on each enemy being Vulnerable',()=>{
 const s=fixture('final-form');
 assert.equal(projectSequence(s,['Colossus+']).incoming,60);
 s.battle.enemies[0].status.push({name:'Vulnerable',amount:1});
 assert.equal(projectSequence(s,['Colossus+']).incoming,30);
});
test('final hand includes an affordable form defeat and never calls revival victory',()=>{
 const s=fixture('final-form');
 const f=projectSequence(s,['Expect a Fight','Setup Strike+ → Test Subject #C8','Bludgeon+ → Test Subject #C8','Strike → Test Subject #C8']);
 assert.equal(f.damage,65);assert.equal(f.boundary,'death_effect');assert.equal(f.survives,null);
 assert.ok(f.delayedDeathEffects.some(x=>/revives/.test(x.rule)));
 assert.ok(planCandidates(s).some(p=>p.forecast.boundary==='death_effect'&&p.forecast.damage===65));
 const defended=projectSequence(s,['Colossus+','Expect a Fight','Setup Strike+ → Test Subject #C8','Bludgeon+ → Test Subject #C8']);
 assert.equal(defended.damage,60);assert.equal(defended.survives,false);
});

test('visible per-hit damage cap applies after Vulnerable and separately to each hit',()=>{
 const s=fixture('damage-cap');s.player.energy=3;s.player.status=[];s.player.potions=[];
 const e=s.battle.enemies[0];e.hp=25;e.status.push({name:'Vulnerable',amount:2});s.battle.enemies=[e];
 s.player.hand=[{index:0,name:'Bludgeon',type:'Attack',cost:'3',description:'Deal 32 damage.',can_play:true,target_type:'AnyEnemy'}];
 const f=projectSequence(s,['Bludgeon → Exoskeleton']);assert.equal(f.damage,9);assert.notEqual(f.boundary,'combat_won');
 s.player.hand=[{index:0,name:'Twin Strike',type:'Attack',cost:'1',description:'Deal 10 damage twice.',can_play:true,target_type:'AnyEnemy'}];
 assert.equal(projectSequence(s,['Twin Strike → Exoskeleton']).damage,18);
});

test('Pacts End respects its visible exhaust threshold before granting area damage',()=>{
 const s=fixture('exhaust-threshold');s.player.status=[];s.player.exhaust_pile_count=2;
 assert.equal(projectSequence(s,["Pact's End+"]).damage,0);
 s.player.exhaust_pile_count=3;
 assert.equal(projectSequence(s,["Pact's End+"]).damage,23);
});

test('visible end-turn HP loss bypasses block and stacks across cards',()=>{
 const s=fixture('direct-hp-loss');
 const f=projectSequence(s,['Defend','Defend']);
 assert.equal(f.block,10);assert.equal(f.endTurnCardHpLoss,6);assert.equal(f.hpLoss,6);assert.equal(f.hpAfter,33);
 s.player.hp=12;s.player.hand.push({...s.player.hand.find(c=>c.name==='Beckon'),index:99});
 const lethal=projectSequence(s,['Defend','Defend']);
 assert.equal(lethal.endTurnCardHpLoss,12);assert.equal(lethal.survives,false);
});

test('Flame Barrier forecasts immediate defense without treating retaliation as a cast attack',()=>{
 const s=fixture('flame-barrier');
 const card=s.player.hand.find(c=>c.name==='Flame Barrier');
 const f=projectSequence(s,['Flame Barrier']);
 assert.equal(f.damage,0);
 assert.equal(f.block,s.player.block+Number(card.description.match(/Gain (\d+) Block/)[1])+(s.player.status.find(p=>p.name==='Plating')?.amount??0));
 assert.notEqual(f.hpLoss,null);
 assert.match(f.warnings.join(' '),/retaliation damage.*omitted/);
});

test('focused kill exposes removed attack and remaining threat instead of valuing block alone',()=>{
 const s=fixture('flame-barrier');
 s.player.hp=10;s.player.block=0;s.player.energy=1;s.player.status=[];s.player.relics=[];
 s.player.hand=[{index:0,name:'Strike',type:'Attack',cost:'1',description:'Deal 6 damage.',target_type:'AnyEnemy',can_play:true},{index:1,name:'Defend',type:'Skill',cost:'1',description:'Gain 5 Block.',target_type:'Self',can_play:true}];
 s.battle.enemies=[{entity_id:'a',name:'Attacker',hp:6,block:0,status:[],intents:[{type:'Attack',label:'12'}]},{entity_id:'b',name:'Other',hp:30,block:0,status:[],intents:[{type:'Attack',label:'3'}]}];
 const kill=projectSequence(s,['Strike → Attacker']),block=projectSequence(s,['Defend']);
 assert.equal(kill.defeatedEnemies[0].attackRemoved,12);assert.equal(kill.incoming,3);assert.equal(kill.hpLoss,3);assert.equal(kill.survives,true);assert.equal(block.survives,false);
 s.battle.enemies[0].status=[{name:'Revival',description:'Revives when killed.'}];
 assert.equal(projectSequence(s,['Strike → Attacker']).survives,null);
});

test('visible per-turn card limit stops prefixes before assuming remaining plays',()=>{
 const s=fixture('card-play-limit');
 const f=projectSequence(s,['Defend+']);
 assert.equal(f.boundary,'card_play_limit');
 assert.match(f.warnings.join(' '),/instead of assuming remaining plays/);
 assert.throws(()=>projectSequence(s,['Defend+','Dismantle → Knowledge Demon']),/Cannot project past card_play_limit/);
});

test('temporary Strength potion helps only attacks played afterward',()=>{
 const s=fixture('flex-timing');
 const before=projectSequence(s,['Flex Potion','Giant Rock+ → Crusher']);
 const after=projectSequence(s,['Giant Rock+ → Crusher','Flex Potion']);
 assert.ok(before.damage>after.damage);
 assert.match(before.warnings.join(' '),/no future-turn benefit/);
 const wasted=projectSequence({...s,player:{...s.player,energy:0}},['Flex Potion']);
 assert.equal(wasted.damage,0);
});

test('recorded Weak Potion reduces each hit and exposes a defensive survival line',()=>{
 const s=fixture('weak-potion');
 const noPotion=projectSequence(s,['Flame Barrier']);
 const withPotion=projectSequence(s,['Weak Potion → Vantom','Flame Barrier']);
 assert.equal(noPotion.incoming,20);assert.equal(withPotion.incoming,14);
 assert.equal(noPotion.survives,false);assert.equal(withPotion.survives,true);
});

test('Relax next-turn resources cannot conceal current-turn lethal damage',()=>{
 const s=fixture('relax-lethal');const f=projectSequence(s,['Relax']);
 assert.equal(f.block,15);assert.equal(f.energyLeft,0);assert.equal(f.incoming,26);assert.equal(f.survives,false);assert.notEqual(f.boundary,'draw');
 assert.match(f.warnings.join(' '),/arrive next turn/);
});

test('Drum of Battle stops at unknown draw without granting its exhaust-only energy',()=>{
 const s=fixture('drum-draw');const f=projectSequence(s,['Drum of Battle']);
 assert.equal(f.energyLeft,2);assert.equal(f.boundary,'draw');
 assert.throws(()=>projectSequence(s,['Drum of Battle','Defend']),/Cannot project past draw/);
});

test('Pyre setup does not grant its future energy immediately or hide lethal incoming',()=>{
 const s=fixture('pyre-lethal');const f=projectSequence(s,['Taunt+ → Lagavulin Matriarch','Pyre+']);
 assert.equal(f.energyLeft,0);assert.equal(f.block,8);assert.equal(f.survives,false);
 assert.match(f.warnings.join(' '),/future turns, not when played/);
});

test('Fortifier triples current block but does not prevent damage on a nonattack turn',()=>{
 const s=fixture('fortifier');const f=projectSequence(s,['Fortifier']);
 assert.equal(f.block,39);assert.equal(f.incoming,0);assert.equal(f.hpLoss,0);
 s.player.block=0;assert.equal(projectSequence(s,['Fortifier']).block,0);
});

test('visible HP loss wording caps each hit before block without inventing kills',()=>{
 const s=JSON.parse(readFileSync(new URL('./fixtures/intangible-loss-wording.json',import.meta.url))).state;
 const f=projectSequence(s,['Rage','Perfected Strike → Soul Fysh','Pommel Strike → Soul Fysh']);
 assert.equal(f.damage,2);assert.deepEqual(f.defeatedEnemies,[]);
});

test('unsupported X-cost play does not promise unspent energy after execution',()=>{
 const s=JSON.parse(readFileSync(new URL('./fixtures/cascade-unknown-energy.json',import.meta.url))).state;
 const f=projectSequence(s,['Cascade']);
 assert.equal(f.energyLeft,null);assert.equal(f.survives,null);assert.equal(f.boundary,'unsupported');
});

test('explicit death on enemy turn cannot be labeled survivable from attack damage alone',()=>{
 const s=JSON.parse(readFileSync(new URL('./fixtures/visible-turn-death.json',import.meta.url))).state;
 const f=projectSequence(s,['End turn']);
 assert.equal(f.survives,null);assert.equal(f.hpAfter,null);
 assert.match(f.warnings.join(' '),/taking its turn kills you/);
 s.battle.enemies[0].status=[];
 assert.equal(projectSequence(s,['End turn']).survives,true);
});

test('playing Beckon removes its hand penalty without charging conditional HP loss on play',()=>{
 const s=JSON.parse(readFileSync(new URL('./fixtures/beckon-play.json',import.meta.url))).state;
 const end=projectSequence(s,['End turn']),played=projectSequence(s,['Beckon','End turn']);
 assert.equal(end.endTurnCardHpLoss,18);assert.equal(played.endTurnCardHpLoss,12);
 assert.equal(played.hpLoss,end.hpLoss-6);assert.equal(played.energyLeft,0);
});

test('last-card Bloodletting exposes HP cost and lack of an energy payoff',()=>{
 const s=JSON.parse(readFileSync(new URL('./fixtures/empty-hand-bloodletting.json',import.meta.url))).state;
 const f=projectSequence(s,['Bloodletting']);
 assert.equal(f.energyLeft,2);assert.equal(f.survives,false);
 assert.match(f.warnings.join(' '),/empty hand/);
 assert.equal(f.hpLoss,13);
});
