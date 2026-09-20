# Offline evaluations

`npm test` is deterministic, local, and free of model API calls. `npm run benchmark:dry` builds benchmark inputs without contacting TypeSafe.

The following commands make **paid TypeSafe calls**, using `TYPESAFE_API_KEY`:

```sh
node spire-demo/benchmark/run.mjs
node spire-demo/benchmark/run.mjs --fresh --repeats=3
node spire-demo/benchmark/run.mjs --comparison --scored-only --repeats=3
node spire-demo/benchmark/run-sequences.mjs
```

Recorded-state tests compare the current policy with a simpler two-pass policy. The comparison flag tests an experimental action-versus-end-turn summary. These experiments do not change the live policy or send commands to the game.

Sequence tests use small, explicitly synthetic scenarios, an independent rules evaluator, and a fresh Jev decision after each action. They test Flex before attacks, Speed before block, and Bash before Strike. They are not full-game simulations.

Results, model responses, source snapshots, and usage are written under `.private/spire-benchmark/`. Input-token stop thresholds are 2 million for recorded tests and 1.5 million for sequence tests; one in-flight call can exceed the threshold.

Fixtures contain selected gameplay observations and prior context, not private credentials or complete session logs. Passing a narrow check does not imply optimal play, a rescued run, or an improved win rate. These small development suites are not a representative held-out benchmark.
