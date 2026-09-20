import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root = dirname(fileURLToPath(import.meta.url));
const dir = resolve(root, '../.private/spire-runs');
const name = process.argv[2] ?? (await readdir(dir)).filter(x => x.endsWith('.jsonl')).sort().at(-1);
if (!name) throw new Error('No recorded sessions. Start the demo first.');
const lines = (await readFile(resolve(dir, name), 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
const decisions = lines.filter(e => e.kind === 'decision');
const executed = decisions.filter(e => e.outcome === 'executed');
const latency = decisions.map(e => e.latencyMs).sort((a,b) => a-b);
const tokens = decisions.reduce((sum,e) => sum + (e.usage?.input_tokens ?? 0), 0);
const quantile = q => latency[Math.min(latency.length-1, Math.floor(latency.length*q))] ?? null;
console.log(JSON.stringify({
  session: name, model: [...new Set(decisions.map(e => e.model))],
  decisions: decisions.length, executedActions: executed.length,
  staleDecisionsRejected: decisions.filter(e => e.outcome === 'stale_rejected').length,
  errors: lines.filter(e => e.kind === 'error').map(e => e.message),
  highestFloor: Math.max(0, ...decisions.map(e => e.state?.run?.floor ?? 0)),
  latestHP: decisions.at(-1)?.state?.player?.hp,
  inputTokens: tokens, estimatedCostUSD: tokens * .042 / 1e6,
  medianLatencyMs: quantile(.5), p95LatencyMs: quantile(.95),
  endState: lines.findLast(e => e.kind === 'run_end')?.state ?? null,
  result: lines.some(e => e.kind === 'run_end' && e.state?.player?.hp <= 0) ? 'defeat' : 'not verified',
}, null, 2));
