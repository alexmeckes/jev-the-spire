// Offline, closed-world micro-simulator. Inputs are reviewed normalized effects,
// not automatically inferred from arbitrary game text. Never use as a live solver.
export function immediateOutcome(s, play=false) {
 if(s.unknown?.length) return {known:false,reasons:s.unknown};
 for(const key of ['hp','block','energy','enemyHp','incoming','retaliation'])
  if(!Number.isFinite(s[key])||s[key]<0)throw Error(`Invalid ${key}`);
 const c=s.card;
 for(const key of ['cost','damage','hpCost','block'])
  if(!Number.isFinite(c[key])||c[key]<0)throw Error(`Invalid card ${key}`);
 if(!Array.isArray(s.retainedDamage)||s.retainedDamage.some(n=>!Number.isFinite(n)||n<0))throw Error('Invalid retained damage');
 if(play&&c.cost>s.energy)return {known:false,reasons:['Unaffordable']};
 let hp=s.hp,block=s.block,enemyHp=s.enemyHp;const steps=[];
 const hit=(amount,source)=>{const absorbed=Math.min(block,amount);block-=absorbed;hp=Math.max(0,hp-(amount-absorbed));steps.push({source,amount,absorbed,hp,block});};
 let damage=0;const retained=[...s.retainedDamage];
 if(play){
  hp=Math.max(0,hp-c.hpCost);steps.push({source:'unblockable card HP cost',amount:c.hpCost,hp,block});
  if(hp>0){
   block+=c.block;damage=Math.min(enemyHp,c.damage);enemyHp-=damage;
   if(c.removeRetainedIndex!=null){if(!Number.isInteger(c.removeRetainedIndex)||c.removeRetainedIndex<0||c.removeRetainedIndex>=retained.length)throw Error('Invalid retained index');retained.splice(c.removeRetainedIndex,1);}
   // Fixture convention: attack retaliation occurs even on a killing attack.
   if(c.attack&&s.retaliation)hit(s.retaliation,'retaliation after attack');
  }
 }
 if(hp>0&&enemyHp>0){for(const d of retained){hit(d,'retained hand damage');if(hp===0)break;}if(hp>0)hit(s.incoming,'displayed enemy attack');}
 return {known:true,hpAfter:hp,survives:hp>0,enemyHpAfter:enemyHp,damage,energyLeft:s.energy-(play?c.cost:0),steps,scope:'One specified card then end, one enemy, explicit normalized effects only; no future turns or hidden draws.'};
}
