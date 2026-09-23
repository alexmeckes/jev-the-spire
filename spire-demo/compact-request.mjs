// Remove repeated prose/metadata, preserving rules, legal IDs and decision values.
export function compactRequest(payload){
 const p=structuredClone(payload);
 const compactCards=cards=>{
  const groups=new Map();for(const c of cards){const x={name:c.name,cost:c.cost,description:c.description};const k=JSON.stringify(x);if(groups.has(k))groups.get(k).copies++;else groups.set(k,{...x,copies:1});}return [...groups.values()];
 };
 const player=p.state?.state?.player;
 if(player){if(p.state.deck?.available)delete player.deck;for(const name of ['draw_pile','discard_pile','exhaust_pile'])if(Array.isArray(player[name]))player[name]=compactCards(player[name]);}
 const memory=p.state?.recent_observations;
 if(memory&& !Array.isArray(memory)){
  memory.sameFight=(memory.sameFight??[]).slice(-4).map(({jevAssessments,...x})=>x);
  memory.recentDeckDecisions=(memory.recentDeckDecisions??[]).slice(-4).map(({jevAssessments,...x})=>x);
  memory.turnHistory=(memory.turnHistory??[]).slice(-6);
 }
 const descriptors=p.state?.candidate_details;
 const compactValue=value=>{try{const c=JSON.parse(value);if(c.forecast){delete c.forecast.assumption;}return JSON.stringify(c);}catch{return value;}};
 if(descriptors)for(const id of Object.keys(descriptors))descriptors[id]=compactValue(descriptors[id]);
 // Final review has one question; keep the same shared descriptor representation.
 if(!descriptors&&p.questions?.move?.criteria){p.state.candidate_details=Object.fromEntries(Object.entries(p.questions.move.criteria).map(([id,v])=>[id,compactValue(v)]));p.questions.move.criteria=Object.fromEntries(Object.keys(p.state.candidate_details).map(id=>[id,null]));}
 else if(descriptors)for(const q of Object.values(p.questions))if(Object.keys(q.criteria).every(id=>Object.hasOwn(descriptors,id)))q.criteria=Object.fromEntries(Object.keys(q.criteria).map(id=>[id,null]));
 // Intern repeated forecast structures losslessly rather than removing choices or caveats.
 const details=p.state?.candidate_details;
 if(details){
  const counts=new Map();
  for(const value of Object.values(details)){try{const d=JSON.parse(value);for(const v of Object.values(d.forecast??{})){if(v&&typeof v==='object'){const k=JSON.stringify(v);if(k.length>80)counts.set(k,(counts.get(k)??0)+1);}}}catch{}}
  const refs=new Map([...counts].filter(([,n])=>n>1).map(([k],i)=>[k,'f'+i]));
  if(refs.size){
   p.state.forecast_references=Object.fromEntries([...refs].map(([k,id])=>[id,JSON.parse(k)]));
   p.state.forecast_reference_note='A forecast object {ref: ID} means the exact value in forecast_references[ID], including all warnings and death effects. It is not missing information.';
   for(const [id,value] of Object.entries(details)){try{const d=JSON.parse(value);for(const [k,v] of Object.entries(d.forecast??{})){const ref=refs.get(JSON.stringify(v));if(ref)d.forecast[k]={ref};}details[id]=JSON.stringify(d);}catch{}}
  }
 }
 // Ordering pairs repeat full warning lists, assumptions and projections.
 // Share identical structures without dropping any legal choice or evidence.
 const order=p.state?.card_order_review;
 if(order){
  const counts=new Map();
  const visit=v=>{if(!v||typeof v!=='object')return;const key=JSON.stringify(v);if(key.length>120)counts.set(key,(counts.get(key)??0)+1);for(const x of Object.values(v))visit(x);};
  visit(order);
  const pool={},ids=new Map();
  const encode=v=>{
   if(!v||typeof v!=='object')return v;
   const key=JSON.stringify(v);
   if((counts.get(key)??0)>1){let id=ids.get(key);if(!id){id='o'+ids.size;ids.set(key,id);pool[id]=v;}return {order_ref:id};}
   return Array.isArray(v)?v.map(encode):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]));
  };
  p.state.card_order_review=encode(order);
  if(ids.size){p.state.order_references=pool;p.state.order_reference_note='Within card_order_review, {order_ref: ID} is the exact value in order_references[ID]. Expand it when comparing orders; warnings and unknown boundaries still apply.';}
 }
 return p;
}
