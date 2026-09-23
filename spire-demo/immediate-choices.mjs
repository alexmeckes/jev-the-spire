// Opt-in request representation: every immediate command remains selectable;
// longer plans are evidence attached to their first command, never forced plays.
const canonical=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export function immediateChoiceQuestion(payload,candidates) {
 const groups=new Map();
 for(const c of candidates){const key=canonical(c.command);const group=groups.get(key)??[];group.push(c);groups.set(key,group);}
 if(!candidates.some(c=>c.plan?.length>1))return payload;
 const roots=[...groups.values()].map(group=>{
  const root=group.find(c=>c.plan?.length===1);
  if(!root)throw Error('Missing immediate candidate for legal command');
  return {root,group};
 });
 const q=structuredClone(payload);
 const original=q.state.candidate_details??q.questions.move.criteria;
 if(!candidates.every(c=>Object.hasOwn(original,c.id)))throw Error('Missing candidate evidence');
 q.state.supporting_plan_details=structuredClone(original);
 q.state.candidate_details=Object.fromEntries(roots.map(({root,group})=>[root.id,JSON.stringify({next_action:root.command,label:root.plan[0].label,immediate_evidence:root.id,possible_continuations:group.map(c=>c.id),reference:'IDs refer to supporting_plan_details. Continuations are alternatives; only the next action executes, followed by a fresh observation.'})]));
 const ids=new Set(candidates.map(c=>c.id));
 for(const question of Object.values(q.questions)){
  if(Object.keys(question.criteria).every(id=>ids.has(id))){
   question.criteria=Object.fromEntries(roots.map(({root})=>[root.id,null]));
   question.instructions+=' Select an immediate next-action ID. Longer plans remain in supporting_plan_details as evidence for that action; they are not extra choices or mandatory continuations.';
  }
 }
 return q;
}
