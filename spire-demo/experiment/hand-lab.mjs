// Deliberately narrow, offline opening-hand assay. No model/API/game calls.
export function effects(card){
 const text=(card.description??'').trim();
 if(!/^\d+$/.test(String(card.cost)))return null;
 const parts=text.split(/\.(?:\s+|$)/).filter(Boolean),out=[];
 for(const part of parts){let m;
  if(m=part.match(/^Deal (\d+) damage(?: (twice|to ALL enemies))?$/))out.push(['damage',+m[1]*(m[2]==='twice'?2:1)]);
  else if(m=part.match(/^Gain (\d+) (Block|Strength)$/))out.push([m[2].toLowerCase(),+m[1]]);
  else if(m=part.match(/^Apply (\d+) Vulnerable$/))out.push(['vulnerable',+m[1]]);
  else if(m=part.match(/^Draw (\d+) cards?$/))out.push(['draw',+m[1]]);
  else if(m=part.match(/^Lose (\d+) HP$/))out.push(['hp',-Number(m[1])]);
  else if(m=part.match(/^Gain ((?:\[[^\]]*energy_icon[^\]]*\])+)$/))out.push(['energy',(m[1].match(/\[/g)??[]).length]);
  else if(part==='You cannot draw additional cards this turn')out.push(['noDraw',1]);
  else if(part==='Add a copy of this card into your Discard Pile')out.push(['copy',1]);
  else if(part==='Exhaust')out.push(['exhaust',1]);
  else return null;
 }
 // Multi-hit scaling requires per-hit application; keep it unsupported here.
 if(/twice/.test(text)||!out.length)return null;
 return out;
}
export function evaluateHand(hand,energy=3,drawPile=[]){
 let damage=0,block=0,nodes=0,capped=false,reshuffleNeeded=false;
 function visit(left,pile,discard,e,d,b,str,vuln,hp,noDraw,depth){
  if(++nodes>1500||depth>10){capped=true;return;}
  damage=Math.max(damage,d);block=Math.max(block,b);
  for(let i=0;i<left.length;i++){
   const c=left[i],fx=effects(c);if(!fx||+c.cost>e)continue;
   let nd=d,nb=b,ns=str,nv=vuln,ne=e-Number(c.cost),nh=hp,nn=noDraw;
   const next=left.filter((_,j)=>j!==i),np=[...pile],dc=[...discard];let boundary=false;
   for(const [kind,n]of fx){
    if(kind==='damage')nd+=Math.floor((n+ns)*(nv?1.5:1));if(kind==='block')nb+=n;if(kind==='strength')ns+=n;if(kind==='vulnerable')nv+=n;
    if(kind==='hp')nh+=n;if(nh<=0)break;
    if(kind==='energy')ne+=n;if(kind==='noDraw')nn=true;if(kind==='copy')dc.push(c);
    if(kind==='draw'&&!nn)for(let j=0;j<n;j++){
     if(np.length)next.push(np.shift());else if(dc.length){reshuffleNeeded=true;boundary=true;break;}else break;
    }
   }
   if(nh<=0)continue;
   if(!fx.some(([k])=>k==='exhaust'))dc.push(c);
   damage=Math.max(damage,nd);block=Math.max(block,nb);
   if(!boundary)visit(next,np,dc,ne,nd,nb,ns,nv,nh,nn,depth+1);
  }
 }
 visit(hand,drawPile,[],energy,0,0,0,0,80,false,0);
 return {damage,block,capped,reshuffleNeeded,unsupported:hand.filter(c=>!effects(c)).length,unaffordable:hand.filter(c=>/^\d+$/.test(String(c.cost))&&Number(c.cost)>energy).length,drawPresent:hand.some(c=>/Draw \d+ cards?/i.test(c.description??''))};
}
export function random(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
export function sampleHand(deck,priorities,size=5){
 return deck.map((card,i)=>({card,i,key:priorities[i],innate:/\bInnate\b/.test(card.description??'')})).sort((a,b)=>Number(b.innate)-Number(a.innate)||a.key-b.key||a.i-b.i).slice(0,size).map(x=>x.card);
}
export function assay(deck,offers,{samples=256,seed=22092026,energy=3}={}){
 if(deck.length<5)throw Error('Assay requires at least five cards');
 const rng=random(seed), variants=[{name:'Skip',deck},...offers.map(c=>({name:c.name,deck:[...deck,c]}))];
 const rows=variants.map(v=>({name:v.name,deckSize:v.deck.length,unsupportedCards:v.deck.filter(c=>!effects(c)).map(c=>c.name),damage:[],block:[],unknown:0,unaffordable:0,draw:0,offered:0,damageDelta:[],blockDelta:[],capped:0,reshuffle:0}));
 for(let i=0;i<samples;i++){
  // Common random priorities couple the original cards across all variants.
  const priorities=Array.from({length:deck.length+1},()=>rng());let baseline;
  for(let j=0;j<variants.length;j++){
   const ordered=sampleHand(variants[j].deck,priorities,variants[j].deck.length),h=ordered.slice(0,5),v=evaluateHand(h,energy,ordered.slice(5)),r=rows[j];r.capped+=Number(v.capped);r.reshuffle+=Number(v.reshuffleNeeded);if(!j)baseline=v;
   r.damage.push(v.damage);r.block.push(v.block);r.damageDelta.push(v.damage-baseline.damage);r.blockDelta.push(v.block-baseline.block);
   r.unknown+=v.unsupported;r.unaffordable+=v.unaffordable;r.draw+=Number(v.drawPresent);r.offered+=Number(j>0&&h.includes(offers[j-1]));
  }
 }
 const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
 const interval=a=>{const m=mean(a),se=Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1)/a.length);return {mean:m,approx95:[m-1.96*se,m+1.96*se]};};
 return rows.map(r=>({name:r.name,deckSize:r.deckSize,automaticRankingAllowed:false,meanSupportedDamage:mean(r.damage),meanSupportedBlock:mean(r.block),damageDelta:interval(r.damageDelta),blockDelta:interval(r.blockDelta),meanUnsupportedSlots:r.unknown/samples,meanInitiallyUnaffordable:r.unaffordable/samples,drawCardPresentRate:r.draw/samples,offeredCardPresentRate:r.offered/samples,unsupportedCards:r.unsupportedCards,searchCapRate:r.capped/samples,reshuffleBoundaryRate:r.reshuffle/samples}));
}
