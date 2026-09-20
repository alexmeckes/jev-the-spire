import {selectionState} from './selections.mjs';
import {encounterBrief,encounterMemory} from './encounters.mjs';
import http from 'node:http';
import {rewardState} from './rewards.mjs';
import {deliberate} from './deliberation.mjs';
import { readFile, mkdir, appendFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { actionsFor, fingerprint, factsFor } from './actions.mjs';
import { decisionCandidates, decisionQuestion, POLICY_VERSION } from './planner.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 4317);
const bridge = 'http://127.0.0.1:15526';
const logDir = resolve(root, '../.private/spire-runs');
await mkdir(logDir, { recursive: true, mode: 0o700 });
let apiKey = process.env.TYPESAFE_API_KEY;
if (!apiKey) {
  const config = await readFile(resolve(root, '../.private/typesafe.cfg'), 'utf8').catch(() => '');
  apiKey = config.match(/^api_key\s*=\s*"?([^"\r\n]+)"?/m)?.[1]?.trim();
}
const snapshotFile = resolve(logDir, 'session.json');
const saved = JSON.parse(await readFile(snapshotFile, 'utf8').catch(() => 'null'));
const sessionId = saved?.sessionId ?? new Date().toISOString().replaceAll(':', '-');
const logFile = resolve(logDir, `${sessionId}.jsonl`);
const MAX_DECISIONS = Number(process.env.MAX_DECISIONS ?? 2000);
const MAX_INPUT_TOKENS = Number(process.env.MAX_INPUT_TOKENS ?? 10000000);
const view = {
  mode: 'paused', connected: false, configured: Boolean(apiKey), state: null,
  decisions: 0, actions: 0, inputTokens: 0, latencyMs: 0, model: null,
  message: 'Ready. Start a normal singleplayer run in the game, then press Autoplay.',
  events: [], sessionId, maxDecisions: MAX_DECISIONS, maxInputTokens: MAX_INPUT_TOKENS,
};
if (saved) Object.assign(view, saved, { mode: 'paused', connected: false, configured: Boolean(apiKey), maxDecisions: MAX_DECISIONS, maxInputTokens: MAX_INPUT_TOKENS, message: 'Session restored. Press Autoplay to resume.' });
let generation = 0, busy = false, lastExecuted = '', latestState = null, waitingSince = 0, nextDecisionAt = 0;
async function log(event) {
  const entry = { time: new Date().toISOString(), ...event };
  view.events.unshift(entry); view.events.length = Math.min(view.events.length, 60);
  await appendFile(logFile, JSON.stringify(entry) + '\n', { mode: 0o600 });
  await writeFile(snapshotFile + '.tmp', JSON.stringify(view), { mode: 0o600 });
  await rename(snapshotFile + '.tmp', snapshotFile);
}
async function gameRequest(path = '/api/v1/singleplayer', command) {
  const response = await fetch(bridge + path, {
    method: command ? 'POST' : 'GET',
    headers: command ? { 'Content-Type': 'application/json' } : {},
    body: command ? JSON.stringify(command) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json();
  if (!response.ok || data.error || data.status === 'error') throw new Error(data.error ?? data.message ?? `Game HTTP ${response.status}`);
  return data;
}
function stop(message) { generation++; view.mode = 'paused'; view.message = message; }
function sidecarView(source = view) {
  const decisions = source.events.filter(e => e.kind === 'decision' && ['executed', 'preview'].includes(e.outcome));
  const compact = e => {
    const candidates = e.candidates ?? actionsFor(e.state);
    return {
      memory:e.memory??null, encounter:encounterBrief(e.state), deliberation:e.deliberation ?? null, time: e.time, label: e.chosen.plan?.[0]?.label ?? e.chosen.label, plan: e.chosen.plan ?? null, forecast: e.chosen.forecast ?? null, policy: e.policy ?? "jev-actions-v1", description: e.chosen.details?.description ?? e.chosen.details?.card_description ?? '',
      action: e.chosen.command.action, confidence: e.answer.confidence, latencyMs: e.latencyMs,
      outcome: e.outcome, floor: e.state.run?.floor, facts: factsFor(e.state),
      options: Object.entries(e.answer.probabilities ?? {}).map(([id, probability]) => ({
        id, probability, label: candidates.find(a => a.id === id)?.label ?? id, plan: candidates.find(a => a.id === id)?.plan ?? null, forecast: candidates.find(a => a.id === id)?.forecast ?? null, chosen: id === e.answer.choice,
      })).sort((a,b) => b.probability - a.probability),
    };
  };
  const compactDecisions = decisions.map(compact);
  return { review: source.review ?? null, policy: POLICY_VERSION, mode: source.mode, message: source.message, connected: source.connected, pending: source.pending ?? null,
    model: source.model, actions: source.actions, inputTokens: source.inputTokens, run: source.state?.run,
    player: source.state?.player ? { hp: source.state.player.hp, maxHp: source.state.player.max_hp, energy: source.state.player.energy, block: source.state.player.block } : null,
    room: source.state?.state_type, decisions: compactDecisions.slice(0, 8), spotlight: compactDecisions.find(e => e.options.length > 1) ?? compactDecisions[0] ?? null };
}
async function observe() {
  const s = selectionState(await gameRequest(),view.events);
  latestState = s; view.state = s; view.connected = true;
  return s;
}
async function step(token, preview = false) {
  if (busy || Date.now() < nextDecisionAt) return;
  busy = true;
  try {
    const s = await observe();
    if (s.state_type === 'game_over') {
      stop(s.player?.hp <= 0 ? 'Run ended in defeat.' : 'Run ended. Verify the result in the game.');
      await log({ kind: 'run_end', state: s }); return;
    }
    // The bridge briefly reports unknown while entering a room or opening a selection.
    // Poll without issuing mutations, but retain a bounded stop for genuinely stuck screens.
    if (s.state_type === 'unknown') {
      waitingSince ||= Date.now();
      if (Date.now() - waitingSince > 45000) stop('Unknown screen persisted for 45 seconds. Check the game, then resume.');
      else view.message = 'Waiting for the room transition to finish…';
      return;
    }
    if (['menu', 'overlay'].includes(s.state_type)) {
      stop(`Waiting at ${s.state_type}. Resolve this screen in the game, then resume.`); return;
    }
    const actions = decisionCandidates(rewardState(s,view.events));
    if (!actions.length) {
      waitingSince ||= Date.now();
      if (Date.now() - waitingSince > 45000) stop('No playable actions for 45 seconds. Check the game screen, then resume.');
      else view.message = 'Waiting for the next playable state…';
      return;
    }
    const hash = fingerprint(s);
    if (hash === lastExecuted) {
      waitingSince ||= Date.now();
      if (Date.now() - waitingSince > 45000) stop('The game did not change after the last action. Check the screen before resuming.');
      else view.message = 'Waiting for the game to finish the last action…';
      return;
    }
    waitingSince = 0;
    // Card effects update energy, piles and hand at different animation frames.
    // Require a quiet observation interval before paying for a new decision.
    await new Promise(resolve => setTimeout(resolve, 700));
    if (token !== generation) return;
    if (fingerprint(await observe()) !== hash) { view.message = 'Waiting for animations to settle…'; return; }
    if (view.decisions >= MAX_DECISIONS || view.inputTokens >= MAX_INPUT_TOKENS) {
      stop('Session budget reached. Restart the server to begin another session.'); return;
    }
    if (!apiKey) throw new Error('Missing TYPESAFE_API_KEY or private TypeSafe configuration.');
    view.message = 'Jev is choosing…';
    view.pending = { startedAt: Date.now(), options: actions.length };
    const start = performance.now();
    const memory=encounterMemory(s,view.events);
    const result = await deliberate({state:s,candidates:actions,
      recent:memory,
      onStage:stage=>{view.message=stage;view.pending.stage=stage;},
      ask:async payload=>{
        if(token!==generation)throw Error('Decision cancelled.');
        if(view.inputTokens>=MAX_INPUT_TOKENS||view.decisions>=MAX_DECISIONS)throw Error('Session budget reached.');
        const response=await fetch('https://api.typesafe.ai/v1/systemone',{
          method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},
          body:JSON.stringify(payload),signal:AbortSignal.timeout(30000),
        });
        if(!response.ok)throw Error(`TypeSafe HTTP ${response.status}; paused. Retry with Resume.`);
        const result=await response.json();
        view.decisions++;view.inputTokens+=result.usage?.input_tokens??0;
        return result;
      }});
    view.latencyMs = Math.round(performance.now() - start);
    view.model = result.model;
    const answer = result.answers?.move;
    const chosen = actions.find(a => a.id === answer?.choice);
    if (!chosen || answer?.type !== 'choice') throw new Error('Jev returned an invalid action ID.');
    const event = { kind: 'decision', policy: POLICY_VERSION, memory, deliberation:result.deliberation, state: s, chosen, candidates: actions, answer, model: result.model, usage: result.usage, latencyMs: view.latencyMs, preview };
    if (token !== generation) { await log({ ...event, outcome: 'cancelled' }); return; }
    if (preview) { await log({ ...event, outcome: 'preview' }); view.message = `Preview: ${chosen.label}`; return; }
    const fresh = await observe();
    if (fingerprint(fresh) !== hash) { await log({ ...event, outcome: 'stale_rejected' }); view.message = 'State changed; asking again.'; return; }
    if (token !== generation) return;
    // Never retry a mutating request automatically: a timeout can still mean it executed.
    let outcome;
    try { outcome = await gameRequest('/api/v1/singleplayer', chosen.command); }
    catch (error) {
      // These explicit validation errors happen before enqueueing in STS2MCP.
      // Observe anew and ask a fresh question; never resend the old command.
      if (/^card_index \d+ out of range|^Card '.+' cannot be played:|^Not in play phase|^Player actions are currently disabled|^Cannot end turn while a card/.test(error.message)) {
        await log({ ...event, outcome: 'game_rejected', message: error.message });
        lastExecuted = ''; nextDecisionAt = Date.now() + 1500;
        view.message = 'Game rejected a stale action; waiting for fresh state.'; return;
      }
      throw error;
    }
    lastExecuted = hash; view.actions++; view.message = chosen.label;
    nextDecisionAt = Date.now() + 1200;
    await log({ ...event, outcome: 'executed', result: outcome });
  } catch (error) {
    stop(error.message === 'fetch failed' ? 'Game bridge unavailable. Launch Slay the Spire 2 with STS2_MCP enabled.' : error.message);
    await log({ kind: 'error', message: view.message });
  } finally { busy = false; view.pending = null; }
}

// Sequential runner: at most one model request and one action in flight.
setInterval(async () => {
  if (busy) return;
  if (view.mode === 'running') await step(generation);
  else try { await observe(); } catch { view.connected = false; }
}, 600).unref();

const server = http.createServer(async (req, res) => {
  const json = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
  // Bind to loopback and reject cross-origin controls / DNS rebinding.
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) return json(403, { error: 'Invalid host' });
  if (req.headers.origin && ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(req.headers.origin)) return json(403, { error: 'Invalid origin' });
  try {
    if (req.method === 'GET' && req.url === '/api/status') return json(200, view);
    if (req.method === 'GET' && req.url === '/api/sidecar') return json(200, sidecarView());
    if (req.method === 'GET' && req.url.startsWith('/api/plan-review')) {
      const review = JSON.parse(await readFile(resolve(logDir, 'plan-review.json'), 'utf8'));
      const name = new URL(req.url, 'http://localhost').searchParams.get('case') ?? 'slippery';
      const item = review.cases.find(c => c.name === name);
      if (!item) return json(404, {error:'Replay not found'});
      return json(200, sidecarView({mode:'review', connected:true, pending:null, model:item.event.model, actions:0,
        inputTokens:item.event.usage.input_tokens, state:item.event.state, events:[item.event],
        message:'Recorded-state evaluation. No game actions executed.',
        review:{name:item.name, originalChoice:item.originalChoice, baselineChoice:item.baselineChoice, evaluatedAt:review.evaluatedAt},
      }));
    }
    if (req.method === 'POST') {
      if (req.headers['x-spire-control'] !== '1') return json(403, { error: 'Missing control header' });
      if (req.url === '/api/pause') { stop('Paused. You can take over in the game.'); return json(200, { ok: true }); }
      if (req.url === '/api/run') {
        if (!apiKey) return json(400, { error: 'Missing API key' });
        generation++; waitingSince = 0; lastExecuted = ''; view.mode = 'running'; view.message = 'Autoplay enabled';
        return json(200, { ok: true });
      }
      if (req.url === '/api/step' || req.url === '/api/preview') {
        if (busy) return json(409, { error: 'Wait for the current decision to finish' });
        stop('Single decision'); const token = generation;
        void step(token, req.url === '/api/preview'); return json(200, { ok: true });
      }
    }
    if (req.method === 'GET' && ['/', '/sidecar'].includes(req.url?.split('?')[0])) {
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
      return res.end(await readFile(resolve(root, req.url.startsWith('/sidecar') ? 'sidecar.html' : 'index.html')));
    }
    json(404, { error: 'Not found' });
  } catch { json(500, { error: 'Local server error' }); }
});
server.listen(port, '127.0.0.1', () => console.log(`Jev plays the Spire: http://127.0.0.1:${port}\nKey configured: ${Boolean(apiKey)}\nDecision log: ${logFile}`));
process.on('SIGINT', () => { stop('Stopped'); server.close(); process.exit(0); });
