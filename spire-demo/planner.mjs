import {retaliationRule,applyRetaliation} from './retaliation.mjs';
import {facingDamage} from './facing.mjs';
import {potionTiming} from './potion-timing.mjs';
import {spendingRoutes} from './routes.mjs';
import {mechanicsReview} from './mechanics.mjs';
import {setupLinks} from './setup-links.mjs';
import {encounterBrief,deckSnapshot,visibleState} from './encounters.mjs';
import { actionsFor, factsFor, makeQuestion } from './actions.mjs';

export const POLICY_VERSION = 'jev-visible-v23-retaliation';
const amount = (powers, name) => (powers ?? []).filter(p => p.name?.toLowerCase() === name.toLowerCase()).reduce((n,p) => n + Number(p.amount ?? 0), 0);
const number = (text, regex, fallback = 0) => Number(text.match(regex)?.[1] ?? fallback);
const nameOf = c => (c.name ?? '').replace(/\+$/, '').toLowerCase();
const supportedCards = new Set(['beckon','strike','defend','bash','uppercut','setup strike','inflame','shrug it off','rage','bludgeon','whirlwind','stomp','dismantle','rampage','anger','breakthrough','offering','slimed','twin strike','conflagration','bully','unrelenting','mind blast','perfected strike','thunderclap','impervious','dominate','vicious','molten fist','stone armor','armaments','feel no pain','giant rock','toxic','iron wave','pommel strike','taunt','battle trance','toric toughness','pyre','drum of battle','relax','flame barrier','hemokinesis','restlessness','bloodletting','colossus','expect a fight',"pact's end"]);
const supportedPotions = new Set(['fysh oil','strength potion','flex potion','weak potion','fortifier','block potion','energy potion','fire potion','swift potion','dexterity potion','speed potion']);
const knownPlayerPowers = new Set(['strength','dexterity','weak','frail','vulnerable','rage','plating','metallicize','free attack','vicious','feel no pain']);
const knownEnemyPowers = new Set(['strength','weak','vulnerable','slippery','plow','artifact']);
const knownRelics = new Set(['BURNING_BLOOD','VAJRA','GORGET','ORNAMENTAL_FAN','ANCHOR','STRAWBERRY','PEAR','MANGO','BAG_OF_PREPARATION','POTION_BELT','ARCANE_SCROLL','TUNING_FORK']);

function initial(s) {
  const warnings = [];
  for (const p of s.player.status ?? []) if (!knownPlayerPowers.has(p.name.toLowerCase())) warnings.push(`Unmodeled player power: ${p.name}`);
  for (const e of s.battle.enemies) for (const p of e.status ?? []) if (!knownEnemyPowers.has(p.name.toLowerCase()) && retaliationRule(p)?.damage==null) warnings.push(`Unmodeled enemy power: ${p.name}`);
  for (const r of s.player.relics ?? []) if (!knownRelics.has(r.id)) warnings.push(`Unmodeled relic: ${r.name}`);
  const fan = (s.player.relics ?? []).find(r => r.id === 'ORNAMENTAL_FAN');
  const fanProgress = Number.isInteger(fan?.counter) ? fan.counter : null;
  if (fan && fanProgress === null) warnings.push('Ornamental Fan counter unavailable: forecast omits its extra block.');
  return {
    retaliationEvents:[],
    retaliationModifiers:(s.player.status??[]).some(p=>!['strength','dexterity','weak','frail','no energy gain','no draw','free attack'].includes(p.name.toLowerCase())),
    colossus:amount(s.player.status,'Colossus')>0,
    noEnergyGain:amount(s.player.status,'No Energy Gain')>0,
    exhaustCount:s.player.exhaust_pile_count ?? s.player.exhaust_pile?.length ?? 0,
    noDraw:amount(s.player.status,'No Draw')>0,
    unmovable:amount(s.player.status,'Unmovable')>0,
    ringing: (s.player.status??[]).some(p=>p.name==='Ringing' || /cannot play more than \d+ cards each turn/i.test(p.description??'')),
    energy: s.player.energy, hp: s.player.hp, block: s.player.block ?? 0,
    hand: structuredClone(s.player.hand).map(c => ({ ...c, sourceIndex: c.index })),
    potions: structuredClone(s.player.potions ?? []), enemies: structuredClone(s.battle.enemies),
    dexterityDelta: 0, frailFactor: amount(s.player.status,'Frail') > 0 ? .75 : 1,
    strengthDelta: 0, weakFactor: amount(s.player.status,'Weak') > 0 ? .75 : 1,
    feelNoPain:amount(s.player.status,'Feel No Pain'),
    vicious:amount(s.player.status,'Vicious'),
    rage: amount(s.player.status,'Rage'), plating: amount(s.player.status,'Plating'), metallicize: amount(s.player.status,'Metallicize'),
    attacks: 0, fan: Boolean(fan), fanProgress, steps: [], warnings,
    // Unknown interactions stop search expansion; never invent complete outcomes.
    unsupported: false, boundary: null, freeAttack: amount(s.player.status,'Free Attack') > 0,
    originalVulnerable:Object.fromEntries(s.battle.enemies.map(e=>[e.entity_id,amount(e.status,'Vulnerable')])),
    drawCount:s.player.draw_pile_count ?? 0, deck:s.player.deck ?? [],
    fork:(s.player.relics ?? []).find(r=>r.id==='TUNING_FORK')?.counter ?? null, stunned:[],
    cardDamage: 0, removedCharges: 0, extraStrength: 0,
  };
}

function cost(card, m) {
  if (m.freeAttack && card.type === 'Attack') return 0;
  if (card.cost === 'X') return m.energy;
  const value = Number(card.cost);
  if (!Number.isFinite(value)) return Infinity;
  return Math.max(0, value - (nameOf(card) === 'stomp' ? m.attacks : 0));
}

function available(m, rootState) {
  const virtual = { ...rootState, player: { ...rootState.player, energy:m.energy, hand:m.hand.map((c,i) => ({
    ...c, index:i, can_play: cost(c,m) <= m.energy && (c.can_play || (/energy/i.test(c.unplayable_reason ?? '') && !/BlockedByHook/i.test(c.unplayable_reason ?? ''))),
  })), potions:m.potions }, battle:{...rootState.battle,enemies:m.enemies} };
  return actionsFor(virtual);
}

function hit(m, enemy, value, attack) {
  if (enemy.hp <= 0) return;
  let damage = Math.max(0, value);
  if (attack && amount(enemy.status,'Vulnerable') > 0) damage = Math.floor(damage * 1.5);
  for(const power of enemy.status??[]) {
    const cap=(power.description??'').match(/Reduce all damage taken and HP (?:loss|lost)(?:\s+.*?)?\s+to (\d+)/i);
    if(cap)damage=Math.min(damage,Number(cap[1]));
  }
  const blocked = Math.min(enemy.block ?? 0, damage);
  enemy.block = (enemy.block ?? 0) - blocked; damage -= blocked;
  const slippery = (enemy.status ?? []).find(p => p.name.toLowerCase() === 'slippery' && p.amount > 0);
  if (damage > 0 && slippery) { damage = 1; slippery.amount--; m.removedCharges++; }
  const lost = Math.min(enemy.hp, damage); enemy.hp -= lost; m.cardDamage += lost;
  const plow=(enemy.status??[]).find(p=>p.name.toLowerCase()==='plow');
  if(plow && enemy.hp<=plow.amount && !m.stunned.includes(enemy.entity_id)) {
    m.stunned.push(enemy.entity_id);
    enemy.status=enemy.status.filter(p=>!['plow','strength'].includes(p.name.toLowerCase()));
  }
}

function applyPower(enemy, name, n) {
  if(enemy.hp<=0)return false;
  enemy.status ??= [];
  const artifact=enemy.status.find(p=>p.name.toLowerCase()==='artifact'&&p.amount>0);
  if(artifact){artifact.amount--;return false;}
  const existing = enemy.status.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (existing) existing.amount += n;
  else enemy.status.push({name,amount:n});
  return true;
}

function apply(m0, a) {
  const m = structuredClone(m0);
  m.steps.push(a);
  if (a.command.action === 'end_turn') { m.boundary = 'end_turn'; return m; }
  const potion = a.command.action === 'use_potion';
  const item = potion ? m.potions.find(p => p.slot === a.command.slot) : m.hand[a.command.card_index];
  if (!item) return null;
  const name = nameOf(item), text = item.description ?? '';
  if (!(potion ? supportedPotions : supportedCards).has(name)) {
    m.boundary = 'unsupported'; m.unsupported = true;
    m.warnings.push(`Re-observe after ${item.name}; full consequences are not modeled.`);
    return m;
  }
  const replayCount = !potion ? number(text,/\bReplay (\d+)\b/i) : 0;
  // Only the fully understood plain Strike replay is modeled. Other replayed
  // effects may draw, change costs, exhaust, or alter targets between plays.
  if(replayCount && (name!=='strike' || !/^Deal \d+ damage\.\s*Replay \d+\.?$/i.test(text.trim()) || replayCount>10 || m.freeAttack || m.ringing)) {
    m.unsupported=true;m.boundary='unsupported';
    m.warnings.push('Replay effects require a fresh observation; this card or play-limit interaction is not modeled.');
    return m;
  }
  const spent = potion ? 0 : cost(item,m);
  if (spent > m.energy) return null;
  m.energy -= spent;
  if (potion) m.potions = m.potions.filter(p => p.slot !== item.slot);
  else m.hand.splice(a.command.card_index,1);
  if(name!=='beckon')m.hp -= number(text,/Lose (\d+) HP/i);
  if (m.hp <= 0) { m.boundary = 'player_dead'; return m; }
  if(name==='restlessness') {
    if(m.hand.length===0) {
      if(!m.noEnergyGain)m.energy+=(text.match(/\[[^\]]*energy_icon[^\]]*\]/g)??[]).length;
      if(!m.noDraw){m.boundary='draw';m.warnings.push('Empty-hand condition met; re-observe unknown drawn cards.');}
    } else m.warnings.push('Empty-hand condition not met: this play grants no draw or energy and gives up retaining the card.');
    return m;
  }
  if(name==="pact's end" && m.exhaustCount<number(text,/If you have (\d+) or more/i,3)) {
    m.warnings.push('Exhaust-pile threshold not met: this card deals no damage.');
    return m;
  }
  const isAttack = !potion && item.type === 'Attack';
  const targets = item.target_type === 'AnyEnemy' ? m.enemies.filter(e => e.entity_id === a.command.target) : m.enemies.filter(e => e.hp > 0);
  for(let replay=0;replay<=replayCount;replay++){
  if(replay && (m.hp<=0 || targets.every(e=>e.hp<=0)))break;
  let retaliationHits=0;
  const damageMatch = name==='flame barrier' ? null : name==='mind blast' ? [null,String(m.drawCount)] : text.match(/Deal (\d+) damage/i);
  if (damageMatch) {
    let dmg = Number(damageMatch[1]);
    if (isAttack) {
      // Hand descriptions already include the player's current Strength/Weak.
      // Add only the change from simulated setup actions, never Strength twice.
      dmg += Math.floor(m.strengthDelta * m.weakFactor);
      if (m.weakFactor !== 1 && (m.strengthDelta || targets.some(e => amount(e.status,'Vulnerable')))) {
        m.warnings.push('Weak/Vulnerable rounding may differ by 1 damage per hit.');
      }
    }
    for (const e of targets) {
      const hits = name === 'whirlwind' ? spent : name==='twin strike' ? 2 : name==='conflagration' ? number(text,/damage to ALL enemies (\d+) times/i,4) : name === 'dismantle' && amount(e.status,'Vulnerable') > 0 ? 2 : 1;
      retaliationHits=hits;
      const bonus=name==='bully' ? number(text,/Deals (\d+) additional damage/i)*(amount(e.status,'Vulnerable')-(m.originalVulnerable[e.entity_id]??0)) : 0;
      for (let i=0; i<hits && e.hp>0; i++) hit(m,e,dmg+bonus,isAttack);
    }
  }
  if(isAttack){
    applyRetaliation(m,targets,item,retaliationHits);
    if(m.unsupported||m.hp<=0)return m;
  }
  if (isAttack) {
    m.attacks++; m.block += m.rage;
    if(m.freeAttack) { m.freeAttack=false; m.boundary='free_attack_consumed'; m.warnings.push('Re-read card costs after consuming Free Attack.'); }
    if (m.fan && m.fanProgress !== null && (m.fanProgress + m.attacks) % 3 === 0) m.block += 4;
  }
  }
  if(!potion && item.type==='Skill' && m.fork!==null) { m.fork++; if(m.fork%10===0)m.block+=7; }
  if(name==='flame barrier')m.warnings.push('Immediate block included; retaliation damage and any kills during enemy attacks are omitted. Incoming may be overestimated.');
  if(name==='fortifier')m.block*=3;
  if(name==='colossus')m.colossus=true;
  if(name==='expect a fight'){if(!m.noEnergyGain)m.energy+=m.hand.filter(c=>c.type==='Attack').length;m.noEnergyGain=true;}
  if(name==='unrelenting')m.freeAttack=true;
  // Rage's text describes block on subsequent attacks, not block on cast.
  if(name==='pyre')m.warnings.push('Pyre grants energy at the start of future turns, not when played; no immediate energy or protection is forecast.');
  if(name==='relax')m.warnings.push('Relax draw and energy arrive next turn, not now. They cannot rescue lethal incoming damage this turn.');
  if(name==='toric toughness')m.warnings.push('Only immediate Toric Toughness block is included; later-turn block does not prevent damage this turn.');
  if(name==='stone armor')m.plating+=number(text,/Gain (\d+) Plating/i);
  if (name === 'feel no pain') m.feelNoPain+=number(text,/gain (\d+) Block/i);
  else if (name === 'rage') m.rage += number(text,/gain (\d+) Block/i);
  else {
    const baseBlock=number(text,/Gain (\d+) Block/i);
    if(baseBlock) m.block += baseBlock + (!potion ? Math.floor(m.dexterityDelta*m.frailFactor) : 0);
  }
  if(potion && ['dexterity potion','speed potion','fysh oil'].includes(name)) {
    m.dexterityDelta += number(text,/(?:Gain|and) (\d+) Dexterity/i);
    m.warnings.push('Dexterity affects subsequent block cards, not existing block. Temporary Dexterity only benefits cards played before it expires.');
    if(m.frailFactor!==1)m.warnings.push('Frail rounding on simulated Dexterity may differ by 1 block.');
  }
  if(name==='flex potion')m.warnings.push('Temporary Strength applies only to attacks before this turn ends; no future-turn benefit is forecast.');
  const gainStrength = name==='dominate'?0:number(text,/Gain (\d+) Strength/i);
  m.strengthDelta += gainStrength; m.extraStrength += gainStrength;
  if (name === 'energy potion' || name === 'bloodletting') {
    const icons = (text.match(/\[[^\]]*energy_icon[^\]]*\]/g) ?? []).length;
    const gain = number(text,/Gain (\d+) Energy/i,icons);
    if (!gain) { m.unsupported = true; m.warnings.push('Energy gain amount could not be parsed.'); }
    if(!m.noEnergyGain)m.energy += gain;
    if(name==='bloodletting' && m.hand.length===0)m.warnings.push('Bloodletting leaves an empty hand: added energy cannot play another card without a separate draw or card-generation effect. HP cost is paid immediately.');
  }
  if(name==='bloodletting' && /Gain \d+ Tainted/i.test(text)) {
    m.unsupported=true;m.boundary='unsupported';
    m.warnings.push('Bloodletting energy and HP cost are included, but added Tainted consequences require a fresh observation.');
  }
  if (name === 'offering' && !m.noEnergyGain) m.energy += number(text,/Gain (\d+) Energy/i,(text.match(/\[[^\]]*energy_icon[^\]]*\]/g)??[]).length);
  if (!potion && /(?:^|[.!]\s*)Exhaust\.?$/i.test(text.trim())) {m.block+=m.feelNoPain;m.exhaustCount++;}
  if(name==='armaments'){m.boundary='upgrade';m.warnings.push('Armaments block is included; re-observe card upgrades before continuing.');}
  for (const e of targets) {
    const weak = number(text,/Apply (\d+) Weak/i), vuln = number(text,/Apply (\d+) Vulnerable/i);
    if (weak) applyPower(e,'Weak',weak);
    let applied=false;
    if (vuln) applied=applyPower(e,'Vulnerable',vuln);
    if(name==='molten fist' && amount(e.status,'Vulnerable')>0)applied=applyPower(e,'Vulnerable',amount(e.status,'Vulnerable'));
    if(name==='dominate'){
      const gain=number(text,/Gain (\d+) Strength/i)*amount(e.status,'Vulnerable');
      m.strengthDelta+=gain;m.extraStrength+=gain;
    }
    if(applied && m.vicious>0 && !m.noDraw){m.boundary='draw';m.warnings.push('Vicious draws unknown cards: re-observe before continuing.');}

  }
  if(name==='vicious')m.vicious+=number(text,/draw (\d+) card/i,1);
  if (name!=='vicious' && name!=='relax' && !m.noDraw && /Draw \d+ cards?/i.test(text)) { m.boundary = 'draw'; m.warnings.push('Stops before unknown drawn cards; re-observe before continuing.'); }
  if(name==='battle trance')m.noDraw=true;
  if(!potion && m.unmovable && /Gain \d+ Block/i.test(text) && name!=='rage' && name!=='feel no pain'){m.boundary='block_modifier_consumed';m.warnings.push('Re-read live block values after Unmovable: first-card doubling must not be reused.');}
  if(!potion && /\bBound\b/.test(text)){m.boundary='bound_card_played';m.warnings.push('Bound card played: re-observe remaining card legality before continuing.');}
  if(!potion && m.ringing){m.boundary='card_play_limit';m.warnings.push('A visible power limits card plays; re-observe legality after this card instead of assuming remaining plays.');}
  // A departure is not a kill: do not trigger the minion's on-death effects.
  const minionRule=e=>(e.status??[]).some(p=>/^Minions abandon combat without their leader\.?$/i.test((p.description??'').trim()));
  const leaders=m.enemies.filter(e=>!minionRule(e));
  const leaderDeathUncertain=leaders.some(e=>(e.status??[]).some(p=>/when killed|upon dying|on death|when this dies|would be defeated|reviv|resurrect|transform/i.test(p.description??'')));
  if(leaders.length===1 && leaders[0].hp<=0 && !leaderDeathUncertain && !m.unsupported){
    for(const e of m.enemies.filter(e=>e.hp>0 && minionRule(e))){e.hp=0;e.departedWithLeader=leaders[0].entity_id;}
  }
  if (m.enemies.every(e => e.hp <= 0)) {
    const deathEffects=m.enemies.filter(e=>!e.departedWithLeader).flatMap(e=>(e.status??[]).filter(p=>/when killed|upon dying|on death|when this dies|would be defeated|revives?/i.test(p.description??'')));
    m.boundary=deathEffects.length?'death_effect':'combat_won';
    if(deathEffects.length){m.deathUnresolved=true;m.warnings.push('Enemy death triggers remain unresolved: do not assume victory or survival. Re-observe the death effect.');}
  }
  if (m.hp <= 0) m.boundary = 'player_dead';
  return m;
}

function forecast(m, s) {
  let incoming = 0, parsed = true;
  for (const e of m.enemies.filter(e => e.hp > 0)) {
    if(m.stunned.includes(e.entity_id))continue;
    const before = s.battle.enemies.find(x => x.entity_id === e.entity_id);
    for (const intent of e.intents ?? []) {
      if (!/attack|deathblow/i.test(intent.type) && !/attack.*\d+ damage/i.test(intent.description??'')) continue;
      const match = String(intent.label).trim().match(/^(\d+)(?:\s*[x×]\s*(\d+))?$/i);
      if (!match) { parsed = false; continue; }
      let perHit = Number(match[1]);
      if (amount(before?.status,'Weak') === 0 && amount(e.status,'Weak') > 0) perHit = Math.floor(perHit*.75);
      if(m.colossus && amount(e.status,'Vulnerable')>0)perHit=Math.floor(perHit*.5);
      incoming += perHit * Number(match[2] ?? 1);
    }
  }
  const defeatedEnemies = s.battle.enemies.filter(e=>e.hp>0 && m.enemies.some(after=>after.entity_id===e.entity_id && after.hp<=0 && !after.departedWithLeader)).map(e=>({
    id:e.entity_id,name:e.name,
    attackRemoved:(e.intents??[]).reduce((sum,i)=>{
      if(!/attack|deathblow/i.test(i.type??'') && !/attack.*\d+ damage/i.test(i.description??''))return sum;
      const hit=String(i.label??'').trim().match(/^(\d+)(?:\s*[x×]\s*(\d+))?$/i);
      return hit && sum!==null ? sum+Number(hit[1])*Number(hit[2]??1) : null;
    },0),
    deathRules:(e.status??[]).filter(p=>/when killed|upon dying|on death|when this dies|would be defeated|revives?/i.test(p.description??'')).map(p=>p.description),
  }));
  const block = m.block + m.plating + m.metallicize;
  const positioningUnknown = [...(s.player.status??[]),...s.battle.enemies.flatMap(e=>e.status??[])].some(p=>/from behind|orientation/i.test(p.description??''));
  const lethalTurnRule=m.enemies.filter(e=>e.hp>0&&!m.stunned.includes(e.entity_id)).flatMap(e=>e.status??[]).some(p=>/takes? (?:its|their) turn.*(?:you.*die|kill you)/i.test(p.description??''));
  const facingProjection=positioningUnknown?facingDamage(s,m.steps,m.enemies):null;
  const facingEffectsChanged=m.enemies.some(e=>JSON.stringify(e.status)!==JSON.stringify(s.battle.enemies.find(x=>x.entity_id===e.entity_id)?.status));
  const facingUsable=facingProjection&&!facingEffectsChanged&&!m.unsupported;
  if(facingUsable)incoming=facingProjection.incomingMax;
  const uncertain = lethalTurnRule || (positioningUnknown&&!facingUsable) || m.unsupported || m.deathUnresolved || defeatedEnemies.some(e=>e.deathRules.length) || !parsed;
  const endTurnCardDamage = m.enemies.some(e=>e.hp>0) ? m.hand.reduce((sum,c)=>sum+(/At the end of your turn, if this is in your Hand, take (\d+) damage/i.test(c.description??'') ? number(c.description,/take (\d+) damage/i) : 0),0) : 0;
  const endTurnCardHpLoss = m.enemies.some(e=>e.hp>0) ? m.hand.reduce((sum,c)=>sum+number(c.description,/At the end of your turn, if this is in your Hand,\s+lose (\d+) HP/i),0) : 0;
  const projectedLoss = endTurnCardHpLoss + Math.max(0,incoming+endTurnCardDamage-block);
  const loss = Math.max(0,s.player.hp-m.hp) + projectedLoss;
  const warnings = [...new Set(m.warnings)];
  if(lethalTurnRule)warnings.push('A visible rule says the enemy taking its turn kills you regardless of ordinary block. Attack-only HP estimates cannot establish survival; prevent that turn using a supported kill or stated interruption.');
  if(positioningUnknown&&!facingUsable)warnings.push('Position-dependent incoming damage is not modeled; targeting can change orientation. Survival is uncertain.');
  if (!parsed) warnings.push('Some incoming attacks could not be parsed.');
  return {
    ...(facingUsable?{facingProjection}:{}),
    ...(positioningUnknown?{facingReview:{lastTargetedAction:[...m.steps].reverse().find(a=>a.command?.target)??null,note:facingUsable?'Use facingProjection for the candidate final direction; incoming uses its conservative upper bound. Facing evidence comes from executed actions; re-observe after every action.':'Visible rules say targeting changes orientation. Compare the final target with each surviving attacker before ending. Current facing and unmodified attack values are not supplied, so do not multiply displayed intents again or assume exact damage after turning. Reserve an affordable targeted card or potion when a final turn can reduce incoming damage; re-observe live intents after it. Untargeted block or area damage is not evidence of turning.'}}:{}),
    damage: m.unsupported ? null : m.cardDamage,
    block: m.unsupported ? null : block,
    incoming: parsed ? incoming : null,
    endTurnCardDamage, endTurnCardHpLoss,
    defeatedEnemies,
    retaliationEvents:m.retaliationEvents,
    departedMinions:m.enemies.filter(e=>e.departedWithLeader).map(e=>({id:e.entity_id,name:e.name,leader:e.departedWithLeader,reason:'Visible rule: abandons combat without its leader; departure is not a death.'})),
    delayedDeathEffects:m.enemies.filter(e=>!e.departedWithLeader).flatMap(e=>(e.status??[]).filter(p=>/when killed|upon dying|on death|when this dies|would be defeated|revives?/i.test(p.description??'')).map(p=>({enemy:e.name,rule:p.description,note:'Not included in current-turn attack total; death may not end combat.'}))),
    hpLoss: uncertain ? null : loss,
    hpAfter: uncertain ? null : Math.max(0,s.player.hp-loss),
    survives: uncertain ? null : m.hp > projectedLoss,
    bossStunned:m.stunned.length>0, bossThresholds:m.enemies.flatMap(e=>(e.status??[]).filter(p=>p.name.toLowerCase()==='plow').map(p=>({enemy:e.name,damageToStun:Math.max(0,e.hp-p.amount)}))),
    energyLeft:m.unsupported ? null : m.energy, slipperyRemoved:m.removedCharges, strengthGained:m.extraStrength,
    quality:uncertain?'unknown':warnings.length?'partial':'calculated',
    boundary:m.boundary, warnings,
    assumption:'Forecast if this prefix is followed by ending the turn. Known-effects estimate; unmodeled interactions are omitted when marked partial. Displayed damage intents and explicit end-of-turn damage from remaining hand; no prediction of hidden draws or future turns. Extra block from an unavailable Fan counter is omitted.',
  };
}

function preference(m,s,kind) {
  const f=forecast(m,s);
  if(f.quality==='unknown')return -10000;
  const safety=f.survives?0:-10000;
  const potionsUsed=m.steps.filter(a=>a.command.action==='use_potion').length;
  if(kind==='setup')return safety+m.energy*8+f.strengthGained*8+m.rage*3+f.slipperyRemoved*4-f.hpLoss*2-potionsUsed*2;
  if(kind==='conserve')return safety+f.damage*2-f.hpLoss*8+f.slipperyRemoved*5-potionsUsed*18;
  if(kind==='defense')return safety-f.hpLoss*20+f.damage+f.strengthGained*2;
  return safety+f.damage*3+f.slipperyRemoved*6-f.hpLoss*5+f.strengthGained*5;
}

// Bounded search proposes options; Jev alone chooses among them. Keep every
// immediate legal action plus diverse continuations for each first action.
export function planCandidates(s, { maxDepth=6, beamWidth=256, maxPlans=64 }={}) {
  const roots=actionsFor(s);
  if(!s.battle || !s.player?.hand)return roots;
  const start=initial(s), singles=roots.map(a=>apply(start,a)).filter(Boolean);
  let frontier=singles, all=[...singles], expanded=0;
  for(let depth=1;depth<maxDepth;depth++) {
    const next=[];
    for(const m of frontier) {
      if(m.boundary)continue;
      for(const a of available(m,s)) {
        if(++expanded>6000)break;
        const child=apply(m,a);if(child)next.push(child);
      }
      if(expanded>6000)break;
    }
    all.push(...next);
    const groups=[];
    // Preserve exploration from each original action, including potions.
    for(const root of roots) {
      const group=next.filter(m=>m.steps[0].id===root.id);
      const kept=[];
      for(const kind of ['attack','defense','setup','conserve']) {
        for(const best of group.toSorted((a,b)=>preference(b,s,kind)-preference(a,s,kind)).slice(0,2))
          if(!kept.includes(best))kept.push(best);
      }
      groups.push(kept);
    }
    frontier=[];
    for(let i=0;i<8;i++) for(const group of groups) if(group[i] && frontier.length<beamWidth)frontier.push(group[i]);
    if(!frontier.length || expanded>6000)break;
  }
  const selected=[...singles], seen=new Set(singles.map(m=>JSON.stringify(m.steps.map(a=>a.command))));
  for(const kind of ['attack','defense','conserve']) for(const root of roots) {
    const group=all.filter(m=>m.steps.length>1 && m.steps[0].id===root.id).toSorted((a,b)=>preference(b,s,kind)-preference(a,s,kind));
    for(const m of group) {
      const key=JSON.stringify(m.steps.map(a=>a.command));
      if(seen.has(key))continue;
      if(selected.length>=Math.max(maxPlans,singles.length))break;
      seen.add(key);selected.push(m);break;
    }
  }
  return selected.map((m,i)=>({
    id:`p${i}`,command:m.steps[0].command,label:m.steps.map(a=>a.label).join(' → '),
    details:m.steps[0].details,
    plan:m.steps.map(a=>({label:a.label,command:a.command})), forecast:forecast(m,s),
  }));
}

// Offline opt-in: rebuild complete plans with Rage before attacks, preserving
// original card identity as hand indices shift. Baseline candidates are untouched.
export function withRageReorders(s,candidates,{maxExtra=16}={}) {
  const added=[],seen=new Set(candidates.map(c=>JSON.stringify(c.plan?.map(p=>p.command))));
  for(const candidate of candidates){
    if(added.length>=maxExtra)break;
    if(!candidate.plan || candidate.plan.length<2)continue;
    let m=initial(s);const identities=[];let valid=true;
    for(const step of candidate.plan){
      if(m.boundary){valid=false;break;}
      const a=available(m,s).find(a=>JSON.stringify(a.command)===JSON.stringify(step.command));
      if(!a){valid=false;break;}
      identities.push({action:a.command.action,source:a.details?.sourceIndex,target:a.command.target,slot:a.command.slot,name:a.details?.name,type:a.details?.type});
      m=apply(m,a);if(!m){valid=false;break;}
    }
    if(!valid)continue;
    const index=identities.findIndex(a=>a.action==='play_card'&&a.name?.replace(/\+$/,'')==='Rage');
    if(index<1||!identities.slice(0,index).some(a=>a.type==='Attack'))continue;
    const ordered=[identities[index],...identities.filter((_,i)=>i!==index)];m=initial(s);
    for(const id of ordered){
      if(m.boundary){valid=false;break;}
      const a=available(m,s).find(a=>a.command.action===id.action && (id.action==='play_card'?a.details?.sourceIndex===id.source&&a.command.target===id.target:id.action==='use_potion'?a.command.slot===id.slot&&a.command.target===id.target:true));
      if(!a){valid=false;break;}m=apply(m,a);if(!m){valid=false;break;}
    }
    if(!valid)continue;
    const key=JSON.stringify(m.steps.map(a=>a.command));if(seen.has(key))continue;
    seen.add(key);let id='rage-reorder-'+added.length;while(candidates.some(c=>c.id===id))id+='x';
    added.push({id,command:m.steps[0].command,label:m.steps.map(a=>a.label).join(' → '),details:m.steps[0].details,plan:m.steps.map(a=>({label:a.label,command:a.command})),forecast:forecast(m,s),reorderedFrom:candidate.id});
  }
  return [...candidates,...added];
}

export function projectSequence(s, labels) {
  let m=initial(s);
  for(const label of labels) {
    if(m.boundary)throw new Error(`Cannot project past ${m.boundary}`);
    const action=available(m,s).find(a=>a.label===label);
    if(!action)throw new Error(`Action not available: ${label}`);
    m=apply(m,action);
  }
  return forecast(m,s);
}

export function decisionWarnings(s,c) {
  const notes=[]; const a=c.command;
  const playable=(s.player.hand??[]).filter(x=>x.can_play);
  if(a.action==='end_turn' && playable.length)notes.push(`Ends turn with ${s.player.energy} energy and playable cards: ${playable.map(x=>x.name+' ('+x.cost+')').join(', ')}. Compare their damage and Rage block before ending.`);
  if(a.action==='use_potion' && (s.player.potions??[]).find(p=>p.slot===a.slot)?.name==='Block Potion' && factsFor(s).displayed_incoming_attack_total===0)notes.push('No displayed incoming attack: this Block Potion currently prevents zero attack damage. Save it unless another stated mechanic justifies use.');
  return notes;
}
const isCombat = s => ['monster','elite','boss'].includes(s.state_type);
export function decisionCandidates(s) { return isCombat(s) ? planCandidates(s) : actionsFor(s); }

export function decisionQuestion(s,candidates) {
  s=visibleState(s);
  if(!isCombat(s)){const q=makeQuestion(s,candidates);q.state.encounter=encounterBrief(s);q.state.deck=deckSnapshot(s);q.state.spending_routes=spendingRoutes(s);return q;}
  return {
    model:'jev-latest',
    state:{game:'Slay the Spire 2',objective:'Win the run. Survive the current turn and preserve useful resources.',state:s,encounter:encounterBrief(s),deck:deckSnapshot(s),facts:factsFor(s),policy:POLICY_VERSION,setup_dependencies:setupLinks(s),mechanics_review:mechanicsReview(s),potion_timing:potionTiming(s),
      forecast_scope:'Plans are short prefixes, not complete optimal turns. Forecasts assume ending after the prefix. Null means unknown, not zero. Partial outcomes have explicit caveats. Do not treat displayed card damage as actual damage through enemy powers.'},
    questions:{move:{type:'choice',
      instructions:'Choose the next action or short plan that best advances winning the run. Derive tactics from visible rules, intents, cards and observations. Calculations are aids, not guaranteed outcomes; partial estimates omit stated effects and null means unknown. Evaluate tradeoffs over the encounter, not only the current turn. Only the FIRST action executes, followed by a fresh observation. Choose only among supplied IDs.',
      criteria:Object.fromEntries(candidates.map(c=>[c.id,JSON.stringify({sequence:c.plan,forecast:c.forecast,first_action_rules:c.details.description})])),
    }},
  };
}
