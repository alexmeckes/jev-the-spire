# Jev The Spire

Watch **TypeSafe Jev play Slay the Spire 2** on your computer.

Jev chooses cards, targets, rewards, routes, and purchases. A local dashboard shows its choices, competing options, and estimated outcomes. You can preview a decision, play one move, or turn on autoplay.

This is an experiment, not a solved-game bot. Its first verified Ironclad Ascension 0 victory came on archived run #182; that history spans multiple policy versions and is not a current-policy win-rate estimate.

## What you need

- **Slay the Spire 2**, installed locally.
- **[STS2MCP](https://github.com/Gennadiyev/STS2MCP)**, a compatible game mod that lets the app read game state and perform actions.
- **Node.js 22 or newer.**
- A **[TypeSafe](https://docs.typesafe.ai/api) API key** with credits. Playing and model-based benchmarks make paid API calls.

## Get started

1. Install and enable STS2MCP using its [installation instructions](https://github.com/Gennadiyev/STS2MCP#for-players). Launch the game. Its local API should respond at `http://127.0.0.1:15526/api/v1/singleplayer`.
2. Clone this repository:

   ```sh
   git clone https://github.com/alexmeckes/jev-the-spire.git
   cd jev-the-spire
   ```

3. Set your key and start the app (macOS/Linux):

   ```sh
   export TYPESAFE_API_KEY="your-key-here"
   npm start
   ```

   On Windows PowerShell, use `$env:TYPESAFE_API_KEY="your-key-here"` followed by `npm start`.

   There are no npm dependencies to install.

4. Open **http://127.0.0.1:4317**, start a normal singleplayer run in the game, and press **Autoplay**.

Use **Preview** to see a choice without playing it, **One move** to execute one decision, and **Pause** to take over. Pause prevents the next action; it cannot undo one already sent to the game.

**Mod compatibility:** game updates can break the bridge. Development used game v0.107.1 with STS2MCP source commit `55e064850a68f3b4cde7e5fd525bf9b2dec4e885`, built against the installed game. The 0.4.0 release binary did not work with that game version. See [bridge notes](docs/bridge.md) if the dashboard cannot connect.

## Watch the decisions

Open **http://127.0.0.1:4317/sidecar** for a compact companion panel. On macOS, `spire-demo/Open Jev Companion.command` builds and opens a floating window (requires Xcode command-line tools). The browser dashboard works without it.

The panel shows choices and probabilities, not a generated reasoning transcript. Confidence is not the probability of winning.

## How it works

1. Read the visible game state through the local bridge.
2. Build legal actions and short combat plans, with estimates for supported effects.
3. Ask Jev to choose.
4. Check that the state is still current and execute **only the first action**.
5. Observe again and repeat.

Jev is the only AI model making gameplay choices. Forecasts are incomplete: they do not know future draws or hidden enemy behavior. The app does not require screenshots or mouse control.

## Local data and limits

Your key stays on the local server. Game observations, candidate plans, and recent decision context are sent to TypeSafe. Gameplay logs and checkpoints stay in the ignored `.private/` folder. Never commit that folder or your key.

The server binds to localhost. Keep the game bridge local too. Default session limits are 2,000 decisions and 10 million input tokens; override `MAX_DECISIONS` or `MAX_INPUT_TOKENS` if needed. Displayed costs are estimates, not a billing meter.

Restarting restores the previous session **paused**. After a finished run, stop the server and rename `.private/spire-runs/session.json` to archive it before starting a separate session. Autoplay does not automatically start a new match after defeat.

## Progress visualizer

[**Jev — The Climb**](https://jev-the-climb.alex900731.chatgpt.site) is the owner-private hosted dashboard. The complete static visualizer and sanitized 182-run snapshot are included in [spire-demo/progress-site](spire-demo/progress-site). You can view them locally without a Sites account:

```sh
npm run progress
```

Open http://127.0.0.1:4390. Explore floors, strategy changes, individual run details, and recorded input/output token usage. Download the per-run CSV from the page. See [progress and accounting notes](docs/progress.md) for how the data is produced and what the totals exclude.

## Current baseline

The synced player uses `jev-visible-v23-retaliation` and `jev-visible-review-v24-card-order`: visible facing and deadline checks, deck evidence, retaliation forecasts, card-order review, and request compaction. Sword in Stone remains excluded. Leave `SPIRE_ADVISER` and `SPIRE_PLAN_BENEFIT` unset for baseline Jev. Optional experiment code is included for reproducibility and disabled by default; it is not part of the winning run's configuration.

## Tests

```sh
npm test
```

Tests run locally without an API key or a running game. The repo includes gameplay fixtures and controlled sequence tests for potion timing and card ordering.

`npm run benchmark:dry` checks the recorded-state benchmark inputs without API calls. [Benchmark notes](docs/benchmarks.md) explain the optional paid evaluations and their limits.

## Credits

Built with [TypeSafe Jev](https://docs.typesafe.ai/api) and [STS2MCP](https://github.com/Gennadiyev/STS2MCP). This is an unofficial project, not affiliated with Mega Crit. Slay the Spire 2 and its game content belong to their respective owners; no game binaries or assets are included.

Project code is MIT licensed. The vendored STS2MCP documentation retains its [upstream license](spire-demo/vendor/LICENSE).
