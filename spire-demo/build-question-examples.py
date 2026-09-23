"""Export recorded Jev assessments for three public examples; no raw state or timestamps."""
import argparse
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--log', type=Path, required=True)
parser.add_argument('--output', type=Path, default=Path(__file__).parent / 'progress-site/dist/question-examples.json')
args = parser.parse_args()
rows = [json.loads(line) for line in args.log.open()]
examples = []
for number, key, title in [(688, 'potion', 'Use a potion'), (691, 'turn', 'End the turn?'), (18, 'reward', 'Take a card')]:
    row = rows[number - 1]
    state = row['state']
    review = row['deliberation']
    assert row['model'] == 'jev-1.13.0' and row['outcome'] == 'executed'
    assert review['version'] == 'jev-visible-review-v24-card-order'
    candidates = {candidate['id']: candidate for candidate in row['candidates']}
    def label(choice):
        return candidates[choice]['label']
    chosen = row['chosen']
    examples.append({
        'key': key, 'title': title, 'run': 182, 'decision': number,
        'floor': state['run']['floor'], 'round': state.get('battle', {}).get('round'),
        'hp': state['player']['hp'], 'energy': state['player'].get('energy'),
        'candidateCount': len(candidates),
        'answers': {role: label(answer['choice']) for role, answer in review['assessments'].items() if role != 'deck_need'},
        'deckNeed': (review['assessments'].get('deck_need') or {}).get('choice'),
        'initial': label(review['initial']['choice']), 'final': chosen['label'],
        'executed': (chosen.get('plan') or [{'label': chosen['label']}])[0]['label'],
        'changed': review['changed'], 'calls': review['calls'],
    })
assert all(len(example['answers']) == 7 for example in examples)
assert examples[0]['executed'] == 'Dexterity Potion'
assert len(set(examples[1]['answers'].values())) == 1 and examples[1]['changed']
assert examples[2]['final'] == 'Rage'
args.output.write_text(json.dumps({'examples': examples}, ensure_ascii=False, separators=(',', ':')) + '\n')
print('Exported three examples with 21 recorded assessments.')
