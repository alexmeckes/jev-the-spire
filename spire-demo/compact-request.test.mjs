import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compactRequest} from './compact-request.mjs';
test('repeated forecast rules are losslessly referenced without dropping candidates',()=>{
 const warnings=['Unmodeled rule: '+ 'visible important effect '.repeat(12)];
 const criteria=Object.fromEntries(['a','b','c'].map((id,i)=>[id,JSON.stringify({forecast:{warnings,hpAfter:i,survives:null}})]));
 const input={state:{},questions:{move:{criteria}}};const out=compactRequest(input);
 assert.deepEqual(Object.keys(out.questions.move.criteria),['a','b','c']);
 for(const [id,raw] of Object.entries(out.state.candidate_details)){
  const f=JSON.parse(raw).forecast;
  assert.deepEqual(out.state.forecast_references[f.warnings.ref],warnings);
  assert.equal(f.hpAfter,JSON.parse(criteria[id]).forecast.hpAfter);assert.equal(f.survives,null);
 }
 assert.equal(input.state.forecast_references,undefined);
});
