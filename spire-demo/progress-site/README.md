# Jev the Spire

Static progress dashboard with 182-run snapshot, strategy history, and recorded Jev token usage.

Serve locally:

```sh
python3 -m http.server 4390 --bind 127.0.0.1 --directory dist
```

The data generator and accounting documentation are maintained in the [Jev The Spire repository](https://github.com/alexmeckes/jev-the-spire). Token counts aggregate logged decision usage once, including review passes. Offline evaluations and Luna usage are excluded. Failed pipelines may leave unlogged usage; this is not a billing statement.

The final-fight replay contains 49 recorded decisions from run #182, exported with `spire-demo/build-winning-replay.py --log /path/to/winning-run.jsonl`. Only selected visible game fields and recorded choice weights are published. The source log remains private. Choice weights are not win probabilities; outcomes use the next logged observation, not a simulation.

Published run and strategy dates use calendar dates only, with the original Eastern calendar day preserved. Exact timestamps stay in local evidence.

Each run has a collapsed final-build view with card counts, upgrades, enchantments, relics, and remaining potions. Builds come from native saved history, matched to the existing snapshot by date, duration, outcome, and Ascension. Refresh them with `python3 spire-demo/build_run_builds.py --history-dir /path/to/history`. Only the selected build fields are exported; raw saves, player identifiers, seeds, and exact times stay local.

The “What we asked Jev” section shows three decisions from run #182, including all seven first-pass assessments and the reviewed choice. Question wording is shortened from the runner prompts; answers are exported from recorded logs with `spire-demo/build-question-examples.py --log /path/to/winning-run.jsonl`. The section does not present a generated explanation as Jev’s private reasoning.
