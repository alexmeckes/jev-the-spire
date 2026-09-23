// Only this explicit visible rule is supported. Names alone never supply damage.
export function retaliationRule(power){
 const text=(power.description??'').trim();
 const match=text.match(/^Whenever this creature is attacked, deal (\d+) damage back to the attacker\.?$/i);
 if(match)return {damage:Number(match[1]),rule:text};
 if(/retaliat|thorns/i.test(power.name??'')||/damage back to the attacker|when(?:ever)? .*attacked.*deal .*damage/i.test(text))return {damage:null,rule:text};
 return null;
}
export function applyRetaliation(m,targets,item,hits){
 const rules=targets.flatMap(e=>(e.status??[]).map(retaliationRule).filter(Boolean));
 if(!rules.length)return;
 const ambiguous=rules.some(r=>r.damage===null)||targets.length!==1||hits!==1||targets[0].hp<=0||m.rage>0||m.fan||/Gain \d+ Block/i.test(item.description??'')||m.retaliationModifiers;
 if(ambiguous){m.unsupported=true;m.boundary='retaliation_unknown';m.warnings.push('Retaliation timing or modifiers are unsupported for this action (including lethal, multi-hit, area or attack-triggered block interactions). Re-observe; survival is unknown.');return;}
 for(const r of rules){const absorbed=Math.min(m.block,r.damage);m.block-=absorbed;const lost=Math.min(Math.max(0,m.hp),r.damage-absorbed);m.hp-=lost;m.retaliationEvents.push({rule:r.rule,damage:r.damage,absorbed,hpLost:lost});if(m.hp<=0){m.boundary='player_dead';break;}}
}
