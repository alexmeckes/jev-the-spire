// One definition of the inference endpoint, so a compatible server can replace the hosted one.
export const TYPESAFE_BASE_URL=(process.env.TYPESAFE_BASE_URL||'https://api.typesafe.ai').replace(/\/+$/,'');
export const JEV_API_URL=TYPESAFE_BASE_URL+'/v1/systemone';
// A compatible server names its own models, so only the hosted one has a default worth assuming.
export const TYPESAFE_DEFAULT_MODEL=process.env.TYPESAFE_DEFAULT_MODEL||'jev-latest';
