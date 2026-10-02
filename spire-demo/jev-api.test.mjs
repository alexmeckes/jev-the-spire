import {test} from 'node:test';import assert from 'node:assert/strict';
let seq=0;
// The endpoint and model are resolved at module load, so each case re-imports a fresh instance.
const load=async (base,model)=>{
  const savedBase=process.env.TYPESAFE_BASE_URL,savedModel=process.env.TYPESAFE_DEFAULT_MODEL;
  if(base===undefined)delete process.env.TYPESAFE_BASE_URL;else process.env.TYPESAFE_BASE_URL=base;
  if(model===undefined)delete process.env.TYPESAFE_DEFAULT_MODEL;else process.env.TYPESAFE_DEFAULT_MODEL=model;
  try{return await import(`./jev-api.mjs?case=${seq++}`);}
  finally{
    if(savedBase===undefined)delete process.env.TYPESAFE_BASE_URL;else process.env.TYPESAFE_BASE_URL=savedBase;
    if(savedModel===undefined)delete process.env.TYPESAFE_DEFAULT_MODEL;else process.env.TYPESAFE_DEFAULT_MODEL=savedModel;
  }
};
test('the hosted endpoint is the default',async()=>{
  const m=await load();
  assert.equal(m.TYPESAFE_BASE_URL,'https://api.typesafe.ai');
  assert.equal(m.JEV_API_URL,'https://api.typesafe.ai/v1/systemone');
  assert.equal(m.TYPESAFE_DEFAULT_MODEL,'jev-latest');
});
test('a custom base redirects the endpoint and strips a trailing slash',async()=>{
  const m=await load('http://localhost:8000/');
  assert.equal(m.JEV_API_URL,'http://localhost:8000/v1/systemone');
});
test('TYPESAFE_DEFAULT_MODEL names the model on any base',async()=>{
  assert.equal((await load('http://localhost:8000','local-model')).TYPESAFE_DEFAULT_MODEL,'local-model');
  assert.equal((await load(undefined,'my-model')).TYPESAFE_DEFAULT_MODEL,'my-model');
});
