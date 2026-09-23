# Jev + Luna Max experiment

This is an opt-in Jev + Luna Max advisory experiment. Baseline autoplay remains the default.

1. Take one recorded, visible Act 2 boss decision (no subsequent outcomes supplied).
2. Ask `gpt-5.6-luna` at `max` reasoning effort to critique Jev's proposal.
3. Give the advice to Jev, which chooses among the original candidates.
4. Record the proposal, advice, final choice and latency. No game commands are sent.

Run from the repository root:

```sh
node spire-demo/experiment/replay.mjs .private/spire-runs/SESSION.jsonl .private/spire-luna/result.json
node --test spire-demo/*.test.mjs spire-demo/experiment/*.test.mjs
```

The Codex CLI must be signed in; Jev uses the existing private TypeSafe configuration. Credentials are never sent to the adviser. The adviser is instructed not to use tools or external knowledge and runs in a read-only sandbox. This is not a security boundary guaranteeing that an adviser cannot read files; use a dedicated model-only transport before treating that property as enforced.

## Live trial

Start an explicitly approved assisted run with `SPIRE_ADVISER=luna MAX_INPUT_TOKENS=20000000 node spire-demo/server.mjs`. Jev first deliberates normally, Luna critiques its proposal, then Jev makes the final choice from the original candidates. Single-candidate steps skip Luna. Adviser errors pause the run; there is no silent fallback. Status exposes the adviser mode, and decision logs record advice, original/final choices, and adviser latency. This adds latency and uses the signed-in Codex account.

The CLI uses an empty temporary working directory, ignores user config, disables shell, browser, web search, apps, plugins, hooks, image tools and multi-agent features. The no-outside-knowledge instruction still depends on model compliance; this does not erase learned model knowledge.

 The current server hard-codes bridge port 15526 and `.private/spire-runs/session.json`. Launching a second server unchanged would share both controller and checkpoint. The game bridge port is configurable in its mod configuration, but independent game save/profile storage has not been verified. Do not launch a second game against the current saves.

Concurrent testing needs either a separate game host/save environment and separate controller/log paths, or explicitly approved alternating runs on the existing game. Keep the baseline policy frozen, label all assisted runs, keep Jev as final decision maker, and log adviser failures rather than silently calling them assisted decisions. Compare floor reached, boss clears, wins, latency and model usage. Recorded advice alone cannot measure survival or win rate; changed choices also require an unassisted rerun control to distinguish advice from model variation.

## Jev plan network (offline only)

Run `node spire-demo/benchmark/run.mjs --net --repeats=2` to compare the baseline with kill/survival/setup proposals and a final forecast comparison. The server does not use `jev-net.mjs`. The recorded offline trial did not show better decision quality. Additional experiment entrypoints require their corresponding local private recordings; they are not enabled by `npm start`.
