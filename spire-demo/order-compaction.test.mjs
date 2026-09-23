import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compactRequest} from './compact-request.mjs';
import {readFileSync} from 'node:fs';
import {orderingEvidence} from './order-review.mjs';
import {decisionCandidates} from './planner.mjs';
test('ordering compaction is lossless and preserves every choice',()=>{
 const state=JSON.parse(readFileSync(new URL('./fixtures/rage-reorder.json',import.meta.url))).state;
 const c=decisionCandidates(state),attack=c.find(c=>c.details?.type==='Attack');
 const order=orderingEvidence(state,attack);
 // Multiple pairs share the same warning-rich forecast in real review requests.
 order.pairs=[...order.pairs,...structuredClone(order.pairs)];
 const p={state:{card_order_review:order},questions:{move:{criteria:Object.fromEntries(c.map(x=>[x.id,null]))}}};
 const q=compactRequest(p);
 const expand=v=>!v||typeof v!=='object'?v:v.order_ref?structuredClone(q.state.order_references[v.order_ref]):Array.isArray(v)?v.map(expand):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,expand(x)]));
 assert.deepEqual(expand(q.state.card_order_review),order);
 assert.deepEqual(Object.keys(q.questions.move.criteria),c.map(x=>x.id));
 assert.ok(JSON.stringify(q).length<JSON.stringify(p).length);
 assert.deepEqual(p.state.card_order_review,order);
});
