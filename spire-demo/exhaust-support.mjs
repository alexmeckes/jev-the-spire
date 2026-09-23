// Conservative text evidence, not a card-name lookup or gameplay score.
export function exhaustSupport(cards=[],relics=[]){
 const self=[],other=[],payoffs=[],unresolved=[];
 for(const c of cards){
  const text=c.description??'',row={name:c.name,copies:c.copies??1,rule:text};
  const clauses=text.split(/[.!?]\s*/).map(x=>x.trim()).filter(Boolean);
  const selfSource=clauses.some(x=>/^Exhaust$/i.test(x));
  const otherSource=clauses.some(x=>/^Exhaust (?:\d+|a|all|any number of)\b/i.test(x));
  const payoff=/when(?:ever)?[^.]*exhausted|for each[^.]*exhaust pile|if[^.]*exhaust pile/i.test(text);
  if(selfSource)self.push(row);
  if(otherSource)other.push(row);
  if(payoff)payoffs.push(row);
  if(/exhaust/i.test(text)&&!selfSource&&!otherSource&&!payoff)unresolved.push(row);
 }
 return {selfExhaustSources:self,otherCardExhaustSources:other,triggerPayoffs:payoffs,
  sourceCardCopies:{self:self.reduce((n,c)=>n+c.copies,0),other:other.reduce((n,c)=>n+c.copies,0)},
  unresolvedCards:unresolved,relicRulesNeedingReview:relics.filter(r=>/exhaust/i.test(r.description??'')).map(r=>({name:r.name,rule:r.description})),
  scope:'Counts are source card copies, NOT guaranteed trigger counts or a complete simulator. Self-exhaust can trigger only when played after the payoff is active; do not assume redraw of exhausted cards. Other-card sources may produce multiple triggers or be reused only as their full rules permit, with energy and targets required. Trigger payoffs and references to the Exhaust Pile do not create exhaust by themselves. Conditional/unrecognized text and relic rules require review; zero recognized sources does not prove zero possible sources. Compare incremental benefit of another payoff against an enabler, reliable output or Skip.'};
}
