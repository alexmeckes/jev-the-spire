#!/usr/bin/env python3
"""Export visible observations and recorded choices; never publish raw run logs."""
import argparse
import json
from pathlib import Path


def card(c):
    return {k: c[k] for k in ('index', 'name', 'type', 'cost', 'description', 'can_play') if k in c}


def enemy(e):
    return {
        **{k: e[k] for k in ('name', 'hp', 'max_hp', 'block')},
        'intents': [i['description'] for i in e.get('intents', [])],
        'status': [{k: s[k] for k in ('name', 'amount', 'description')} for s in e.get('status', [])],
    }


def build(path):
    rows = [json.loads(line) for line in path.open()]
    steps = []
    last_battle = None
    for i, row in enumerate(rows):
        state = row.get('state', {})
        if state.get('run', {}).get('floor') != 48:
            continue
        if state.get('battle'):
            last_battle = state['battle']
        chosen = row.get('chosen')
        if not chosen or row.get('outcome') != 'executed' or state['state_type'] == 'rewards':
            continue
        if state['state_type'] not in ('boss', 'card_select', 'hand_select') or not last_battle:
            continue
        # The initial confirm-only screen is before the first gameplay choice.
        if not steps and chosen['command']['action'] == 'combat_confirm_selection':
            continue
        assert row['model'] == 'jev-1.13.0'
        player = state['player']
        after = rows[i + 1]['state']
        next_player = after['player']
        selection = state.get('card_select') or state.get('hand_select')
        command = chosen['command']
        action = command['action']
        first = (chosen.get('plan') or [{'label': chosen['label']}])[0]['label']
        weights = (row.get('answer') or {}).get('probabilities', {})
        candidates = [
            {'id': c['id'], 'label': c['label'], 'weight': weights.get(c['id']), 'chosen': c['id'] == chosen['id']}
            for c in row['candidates']
        ]
        candidates.sort(key=lambda c: -(c['weight'] if c['weight'] is not None else -1))
        steps.append({
            'decision': i + 1, 'round': last_battle['round'],
            'screen': state['state_type'], 'action': action, 'firstAction': first,
            'selectedCard': command.get('card_index', command.get('index')),
            'player': {k: player.get(k) for k in ('hp', 'max_hp', 'block', 'energy')},
            'status': [{k: s[k] for k in ('name', 'amount', 'description')} for s in player.get('status', [])],
            'hand': [card(c) for c in player.get('hand', [])],
            'potions': [{k: c[k] for k in ('name', 'description') if k in c} for c in player.get('potions', [])],
            'selection': {'prompt': selection['prompt'], 'cards': [card(c) for c in selection['cards']]} if selection else None,
            'enemies': [enemy(e) for e in last_battle['enemies']],
            'enemyFromPreviousObservation': not bool(state.get('battle')),
            'plan': [p['label'] for p in chosen.get('plan', [])],
            'candidates': candidates,
            'calls': (row.get('deliberation') or {}).get('calls'),
            'after': {
                'screen': after['state_type'],
                'player': {k: next_player.get(k) for k in ('hp', 'max_hp', 'block', 'energy')},
                'enemies': [enemy(e) for e in after.get('battle', {}).get('enemies', [])],
                'victory': after['state_type'] == 'rewards',
                'round': after.get('battle', {}).get('round'),
                'hand': [card(c) for c in next_player.get('hand', [])],
                'status': [{k: s[k] for k in ('name', 'amount')} for s in next_player.get('status', [])],
            },
        })
    assert steps and steps[-1]['after']['victory']
    assert steps[-1]['after']['player']['hp'] == 9
    assert sorted({s['round'] for s in steps}) == list(range(1, 10))
    return {'run': 182, 'enemy': 'Aeonglass', 'model': 'Jev 1.13.0', 'steps': steps}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--log', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path(__file__).parent / 'progress-site/dist/winning-replay.json')
    args = parser.parse_args()
    data = build(args.log)
    args.output.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f"Exported {len(data['steps'])} decisions across 9 turns.")
