// Offline controlled scenarios. These are NOT historical game states or a full game engine.
// Independent, exact transition rules for this small subset; no policy chooses actions here.
const card=(id,name,cost,description,type='Attack')=>({id,name,cost:String(cost),description,type,rarity:'Basic',is_upgraded:false,keywords:[],target_type:type==='Attack'?'AnyEnemy':'Self',can_play:true});
const strike=()=>card('STRIKE_IRONCLAD','Strike',1,'Deal 6 damage.');
const defend=()=>card('DEFEND_IRONCLAD','Defend',1,'Gain 5 Block.','Skill');
const bash=()=>card('BASH','Bash',2,'Deal 8 damage. Apply 2 Vulnerable.');
function scenario(id,hand,potion,enemyHp,hp,incoming,energy){
 return {id,provenance:'Controlled synthetic scenario using observed Strike, Defend, Bash, Flex Potion and Speed Potion rules. No live game or hidden information.',state:{state_type:'monster',run:{act:1,floor:5,ascension:0},battle:{round:1,turn:'player',is_play_phase:true,enemies:[{entity_id:'TARGET_0',name:'Test Target',hp:enemyHp,max_hp:enemyHp,block:0,status:[],intents:[{type:'Attack',label:String(incoming),title:'Attack',description:`This enemy intends to Attack for ${incoming} damage.`}]}]},player:{character:'The Ironclad',hp,max_hp:80,energy,max_energy:3,block:0,status:[],relics:[],potions:potion?[{id:potion==='Flex Potion'?'FLEX_POTION':'SPEED_POTION',name:potion,slot:0,description:potion==='Flex Potion'?'Gain 5 Strength. At the end of your turn, lose 5 Strength.':'Gain 5 Dexterity. At the end of your turn, lose 5 Dexterity.',target_type:'AnyPlayer',can_use_in_combat:true,keywords:[]}]:[],max_potion_slots:3,hand:hand.map((c,index)=>({...c,index})),deck:structuredClone(hand),draw_pile:[],discard_pile:[],exhaust_pile:[],draw_pile_count:0,discard_pile_count:0,exhaust_pile_count:0,gold:0}}};
}
export const sequenceCases=[
 scenario('flex-before-both-attacks',[strike(),strike(),defend(),defend()],'Flex Potion',22,5,18,2),
 scenario('speed-before-both-blocks',[defend(),defend(),strike()],'Speed Potion',50,1,20,2),
 scenario('bash-before-strike',[strike(),bash(),defend(),defend()],null,17,5,18,3),
];
export function stepLab(state,command){
 const s=structuredClone(state),p=s.player,e=s.battle.enemies[0];
 if(e.hp<=0||p.hp<=0)throw Error('Terminal state');
 const power=n=>p.status.find(x=>x.name===n)?.amount??0;
 const addPower=n=>{p.status.push({id:n.toUpperCase()+'_POWER',name:n,amount:5,type:'Buff',description:n==='Strength'?'Adds 5 damage to attacks this turn.':'Adds 5 Block to block cards this turn.',keywords:[]});};
 if(command.action==='end_turn'){
  const incoming=Number(e.intents[0].label);
  p.hp=Math.max(0,p.hp-Math.max(0,incoming-p.block));
  return {state:s,terminal:p.hp>0?'survived-turn':'died'};
 }
 if(command.action==='use_potion'){
  const q=p.potions.find(x=>x.slot===command.slot);if(!q)throw Error('Invalid potion');
  if(q.name==='Flex Potion')addPower('Strength');else if(q.name==='Speed Potion')addPower('Dexterity');else throw Error('Unsupported potion');
  p.potions=p.potions.filter(x=>x!==q);
 }else if(command.action==='play_card'){
  const c=p.hand.find(x=>x.index===command.card_index);if(!c||Number(c.cost)>p.energy)throw Error('Illegal card');
  p.energy-=Number(c.cost);
  if(c.name==='Strike'||c.name==='Bash'){
   if(command.target!==e.entity_id)throw Error('Invalid target');
   const raw=(c.name==='Strike'?6:8)+power('Strength');
   const damage=Math.floor(raw*(e.status.some(x=>x.name==='Vulnerable')?1.5:1));
   e.hp=Math.max(0,e.hp-damage);
   if(c.name==='Bash')e.status=[{id:'VULNERABLE_POWER',name:'Vulnerable',amount:2,type:'Debuff',description:'Receive 50% more damage from Attacks for 2 turns.',keywords:[]}];
  }else if(c.name==='Defend')p.block+=5+power('Dexterity');else throw Error('Unsupported card');
  p.hand=p.hand.filter(x=>x!==c);p.discard_pile.push(c);p.discard_pile_count++;
 }else throw Error('Unsupported action');
 p.hand=p.hand.map((c,index)=>({...c,index,can_play:Number(c.cost)<=p.energy,unplayable_reason:Number(c.cost)<=p.energy?null:'EnergyCostTooHigh',description:c.name==='Defend'?`Gain ${5+power('Dexterity')} Block.`:c.name==='Bash'?`Deal ${8+power('Strength')} damage. Apply 2 Vulnerable.`:`Deal ${6+power('Strength')} damage.`}));
 return {state:s,terminal:e.hp===0?'won-combat':null};
}
// Enumerates only this small lab's legal actions; used for verifier tests, never supplied as advice to Jev.
export function labActions(s){
 return [{action:'end_turn'},...s.player.potions.map(p=>({action:'use_potion',slot:p.slot})),...s.player.hand.filter(c=>Number(c.cost)<=s.player.energy).map(c=>({action:'play_card',card_index:c.index,...(c.type==='Attack'?{target:'TARGET_0'}:{})}))];
}
