"""Export final builds from native saves without publishing raw save metadata."""
import argparse
import collections
import datetime
import json
from pathlib import Path
from zoneinfo import ZoneInfo


def display_name(identifier):
    name = identifier.split('.')[-1].removesuffix('_IRONCLAD').replace('_', ' ').title()
    for word in ('Neows', 'Pacts', 'Captains', 'Charons', 'Dollys', 'Lees', 'Lords', 'Paels', 'Tezcataras'):
        name = name.replace(word, word[:-1] + '’s')
    return {'Potion Shaped Rock': 'Potion-Shaped Rock', 'Mr Struggles': 'Mr. Struggles'}.get(name, name)


def final_build(native):
    player = native['players'][0]
    cards = collections.Counter()
    for card in player['deck']:
        enchantment = card.get('enchantment') or {}
        cards[(card['id'], card.get('current_upgrade_level', 0),
               enchantment.get('id'), enchantment.get('amount'))] += 1
    deck = []
    for (identifier, upgrades, enchantment, amount), count in cards.items():
        entry = {'name': display_name(identifier), 'upgrades': upgrades, 'count': count}
        if enchantment:
            entry['enchantment'] = display_name(enchantment)
            if amount is not None:
                entry['enchantmentAmount'] = amount
        deck.append(entry)
    deck.sort(key=lambda card: (card['name'], card['upgrades'], card.get('enchantment', '')))
    return {
        'cardCount': len(player['deck']),
        'deck': deck,
        'relics': [display_name(relic['id']) for relic in player['relics']],
        'potions': [display_name(potion['id']) for potion in player['potions']] if 'potions' in player else None,
    }


def attach_builds(data, native):
    assert len(data['runs']) == len(native), 'History count does not match the published snapshot'
    for row, saved in zip(data['runs'], native):
        saved_day = datetime.datetime.fromtimestamp(saved['start_time'], ZoneInfo('America/New_York')).date().isoformat()
        assert row['start'] == saved_day, f"Date mismatch for run {row['n']}"
        assert (row['seconds'], row['win'], row['ascension']) == (saved['run_time'], saved['win'], saved['ascension']), f"History mismatch for run {row['n']}"
        row['build'] = final_build(saved)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--history-dir', type=Path, required=True)
    parser.add_argument('--data', type=Path, default=Path(__file__).parent / 'progress-site/dist/data.json')
    args = parser.parse_args()
    native = sorted((json.loads(path.read_text()) for path in args.history_dir.glob('*.run')), key=lambda run: run['start_time'])
    data = json.loads(args.data.read_text())
    attach_builds(data, native)
    args.data.write_text(json.dumps(data, separators=(',', ':')))
    print(f"Exported final builds for {len(data['runs'])} runs.")
