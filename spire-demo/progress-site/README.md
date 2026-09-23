# Jev the Spire

Static progress dashboard with 182-run snapshot, strategy history, and recorded Jev token usage.

Serve locally:

```sh
python3 -m http.server 4390 --bind 127.0.0.1 --directory dist
```

The data generator and accounting documentation are maintained in the [Jev The Spire repository](https://github.com/alexmeckes/jev-the-spire). Token counts aggregate logged decision usage once, including review passes. Offline evaluations and Luna usage are excluded. Failed pipelines may leave unlogged usage; this is not a billing statement.

The final-fight replay contains 49 recorded decisions from run #182, exported with `spire-demo/build-winning-replay.py --log /path/to/winning-run.jsonl`. Only selected visible game fields and recorded choice weights are published. The source log remains private. Choice weights are not win probabilities; outcomes use the next logged observation, not a simulation.
