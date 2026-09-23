# Progress and token accounting

The static visualizer under `spire-demo/progress-site/dist` contains the 182 completed runs through the first verified victory on September 23, 2026. Native game-history outcomes are reconciled chronologically with private Jev session logs. The untouched Ascension 1 run and offline experiments are excluded.

## Recorded usage

- Input: **1,086,755,296 tokens**; mean **5,971,183** per run, median **5,413,858.5**.
- Output: **41,278,058 tokens**.
- Combined: **1,128,033,354 tokens**.
- Input range: **777,710–19,367,328** per run.
- Winning run #182: **19,367,328 input + 565,987 output = 19,933,315 total**.

See [every run in CSV](../spire-demo/progress-site/dist/run-tokens.csv). All 58,588 decision entries contain input usage. Each decision's `usage` already aggregates its assessment, review, and any extra review passes, so those are counted once. Logged previews, cancellations and stale decisions still used tokens and are included. Successful calls in a pipeline that later failed or was interrupted may not have a decision entry and may be missing. These are recorded usage totals, not a provider billing statement. Offline API evaluations and the brief Luna adviser's tokens are excluded; Jev calls in that assisted run remain included. At the published price checked September 23, 2026—$0.042 per million input tokens, output free—recorded usage costs an estimated $45.64 total, $0.25 per run on average, and $0.81 for the winning run. See https://docs.typesafe.ai/models. The page and CSV include these estimates.

## Rebuild the snapshot locally

Requires Python 3.9+ and the original private evidence. Raw logs and native saves are deliberately not included in this repository.

```sh
python3 spire-demo/build-progress-data.py --history-dir "/path/to/modded/profile2/saves/history"
npm run progress
```

The generator reads `.private/spire-runs/*.jsonl`, matches them against native history in chronological order, validates session start times, and writes `data.json` and `run-tokens.csv`. It intentionally asserts the 182-run snapshot size; adding new runs requires reviewing the pairing and updating the chart's fixed snapshot labels. It exports no credentials, account IDs, seeds or raw prompts.

## Website source

The site is plain HTML/CSS/JavaScript with no build dependencies. Serve `spire-demo/progress-site/dist` with any static server. Its separate managed Sites checkout is mirrored here as ordinary files, without a nested Git repository or owner-specific hosting manifest. The hosted site keeps its existing private access; cloning this GitHub repository allows anyone to view the sanitized snapshot locally.

Strategy dates indicate first observed policy use or explicitly labeled report times. These runs differ in random outcomes, unlocks and policy, so the chart does not establish which change caused improvement.
