import { createHash } from 'node:crypto';

export function fingerprint(state) {
  return createHash('sha256').update(JSON.stringify(state)).digest('hex');
}

// Every selectable answer is constructed from the current game state. Jev
// chooses an ID; it never supplies arbitrary HTTP endpoints or action arguments.
export function actionsFor(s) {
  const out = [];
  const add = (action, args = {}, label = action, details = {}) =>
    out.push({ id: `a${out.length}`, command: { action, ...args }, label, details });
  const list = (items, action, field = 'index', filter = () => true) => {
    for (const x of items ?? []) if (filter(x)) add(action, { [field]: x.index }, x.name ?? x.title ?? x.description ?? `${action} ${x.index}`, x);
  };
  const proceed = (allowed) => { if (allowed) add('proceed', {}, 'Continue to the map'); };
  const combat = ['monster', 'elite', 'boss'].includes(s.state_type);
  if (combat) {
    if (!s.battle?.is_play_phase || s.battle?.turn !== 'player') return [];
    const enemies = (s.battle.enemies ?? []).filter(e => e.hp > 0);
    const targeted = (item, action, args) => {
      if (item.target_type === 'AnyEnemy') {
        for (const e of enemies) add(action, { ...args, target: e.entity_id }, `${item.name} → ${e.name}`, item);
      } else if (action === 'use_potion' && ['AnyPlayer', 'AnyAlly'].includes(item.target_type)) {
        // STS2MCP's singleplayer potion handler resolves these to player.Creature.
        add(action, args, item.name, item);
      } else if (['None', 'Self', 'AllEnemies', 'RandomEnemy'].includes(item.target_type)) {
        add(action, args, item.name, item);
      }
    };
    for (const c of s.player?.hand ?? []) if (c.can_play) targeted(c, 'play_card', { card_index: c.index });
    for (const p of s.player?.potions ?? []) if (p.can_use_in_combat) targeted(p, 'use_potion', { slot: p.slot });
    add('end_turn', {}, 'End turn');
  } else switch (s.state_type) {
    case 'crystal_sphere': {
      const sphere=s.crystal_sphere??{};
      for(const tool of ['big','small']) if(sphere['can_use_'+tool+'_tool'] && sphere.tool!==tool)
        add('crystal_sphere_set_tool',{tool},'Select '+tool+' divination tool');
      if(['big','small'].includes(sphere.tool) && sphere['can_use_'+sphere.tool+'_tool'])
        for(const c of sphere.cells??[]) if(c.is_clickable)
          add('crystal_sphere_click_cell',{x:c.x,y:c.y},`Reveal tile (${c.x}, ${c.y}) with ${sphere.tool} tool`);
      if(sphere.can_proceed)add('crystal_sphere_proceed',{},'Finish divination');
      break;
    }
    case 'map':
      for (const n of s.map?.next_options ?? []) add('choose_map_node', { index: n.index }, `Travel to ${n.type} (column ${n.col})`, n);
      break;
    case 'event':
      if (s.event?.in_dialogue) add('advance_dialogue', {}, 'Advance dialogue');
      else list(s.event?.options, 'choose_event_option', 'index', x => !x.is_locked);
      break;
    case 'rewards': {
      const beltFull = (s.player?.potions?.length ?? 0) >= (s.player?.max_potion_slots ?? 3);
      list(s.rewards?.items, 'claim_reward', 'index', x => x.type !== 'potion' || !beltFull);
      // Collect rewards before proceeding; choosing a card still allows skipping.
      if (!out.length) proceed(s.rewards?.can_proceed);
      break;
    }
    case 'card_reward':
      list(s.card_reward?.cards, 'select_card_reward', 'card_index');
      if (s.card_reward?.can_skip) add('skip_card_reward', {}, 'Skip: keep the deck lean');
      break;
    case 'rest_site':
      list(s.rest_site?.options, 'choose_rest_option', 'index', x => x.is_enabled);
      proceed(s.rest_site?.can_proceed); break;
    case 'shop': case 'fake_merchant': {
      const shop = s.shop ?? s.fake_merchant?.shop;
      const full = (s.player?.potions?.length ?? 0) >= (s.player?.max_potion_slots ?? 3);
      for (const item of shop?.items ?? []) {
        if (!item.is_stocked || !item.can_afford || (item.category === 'potion' && full)) continue;
        const name = item.card_name ?? item.relic_name ?? item.potion_name ?? item.name ?? (item.category === 'card_removal' ? 'Remove a card' : item.category);
        add('shop_purchase', {index:item.index}, `${name} — ${item.price} gold`, {...item, gold_after_purchase:(s.player?.gold ?? 0)-item.price});
      }
      // The bridge's proceed action first closes the inventory. can_proceed
      // only describes the button behind it, which is disabled while shopping.
      proceed(shop?.can_proceed || (Array.isArray(shop?.items) && !shop?.error)); break;
    }
    case 'treasure':
      list(s.treasure?.relics, 'claim_treasure_relic');
      if (!out.length) proceed(s.treasure?.can_proceed);
      break;
    case 'hand_select': {
      const h = s.hand_select;
      if (h?.can_confirm) add('combat_confirm_selection', {}, 'Confirm selection');
      if (!h?.can_confirm || /any number/i.test(h?.prompt ?? '')) list(h?.cards, 'combat_select_card', 'card_index', x => !(h?.selected_cards ?? []).some(c => c.index === x.index));
      break;
    }
    case 'card_select': {
      const c = s.card_select;
      const required = c?.prompt?.match(/^Choose (\d+) cards? to Enchant\./i);
      const selected = c?.cards?.filter(x=>x.is_selected).length ?? 0;
      const ready = c?.can_confirm && (!required || selected >= Number(required[1]));
      if (ready) add('confirm_selection', {}, 'Confirm selected cards');
      else list(c?.cards, 'select_card', 'index', x => !x.is_selected);
      if (c?.can_skip) add('cancel_selection', {}, 'Skip selection');
      break;
    }
    case 'bundle_select':
      if (s.bundle_select?.can_confirm) add('confirm_bundle_selection', {}, 'Confirm this bundle');
      else list(s.bundle_select?.bundles, 'select_bundle');
      break;
    case 'relic_select':
      list(s.relic_select?.relics, 'select_relic');
      if (s.relic_select?.can_skip) add('skip_relic_selection', {}, 'Skip relic');
      break;
    // Menus and unknown overlays stop safely instead of abandoning a save,
    // selecting multiplayer, changing profiles, or starting another run.
  }
  return out;
}

export function factsFor(s) {
  const enemies = s.battle?.enemies ?? [];
  let knownAttack = 0, allAttacksParsed = true;
  for (const enemy of enemies.filter(e => e.hp > 0)) for (const intent of enemy.intents ?? []) {
    if (!/attack|deathblow/i.test(intent.type) && !/attack.*\d+ damage/i.test(intent.description??'')) continue;
    const text = String(intent.label ?? '').replace(/\[.*?\]/g, '').trim();
    const match = text.match(/^(\d+)(?:\s*[x×]\s*(\d+))?$/i);
    if (match) knownAttack += Number(match[1]) * Number(match[2] ?? 1);
    else allAttacksParsed = false;
  }
  return {
    displayed_incoming_attack_total: knownAttack,
    all_attack_labels_parsed: allAttacksParsed,
    displayed_block_gap: Math.max(0, knownAttack - (s.player?.block ?? 0)),
    note: 'Arithmetic over displayed attack intents only, not a combat simulation. Powers, redirection, and actions can change damage. Card descriptions are supplied by the game. Never assume hidden draw order.',
  };
}

export function makeQuestion(state, actions) {
  if (!actions.length || actions.length > 255) throw new Error('Unsupported action count');
  return {
    model: 'jev-latest',
    state: { game: 'Slay the Spire 2', objective: 'Win this complete run without human gameplay decisions.', state, facts: factsFor(state) },
    questions: { move: {
      type: 'choice',
      instructions: 'Choose the next legal action that best advances winning the run. Infer how cards and relics interact from their visible rules and the current deck. Compare each choice, including skip when offered, using current capabilities, costs, consistency and needs. Follow the actual selection prompt. No fixed archetype or encounter strategy is prescribed. Choose only a supplied ID.',
      criteria: Object.fromEntries(actions.map(a => [a.id, JSON.stringify({ action: a.command, label: a.label, details: a.details })])),
    } },
  };
}
