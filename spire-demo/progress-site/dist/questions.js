'use strict';
(()=>{
 const container=document.querySelector('#questionExample');
 const buttons=[...document.querySelectorAll('[data-example]')];
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const common=[
  ['move','Overall','Which move best helps us win the run?'],
  ['encounter','The fight','Which move handles the visible enemy mechanics?'],
  ['synergy','The deck','Which move works best with our cards and relics?'],
  ['survival','Staying alive','Which move keeps us alive with a way to win afterward?'],
  ['pressure','Making progress','Which move gets us closer to winning this fight?'],
  ['tempo','This turn','Can we do something useful before ending the turn?'],
  ['resources','What to spend','How should we use our energy, cards and potions?']
 ];
 const rewards=[
  ['move','Overall','Is any offered card better for this deck than skipping?'],
  ['encounter','Recent fights','Which card addresses a weakness we have actually seen?'],
  ['synergy','The deck','Do we already have the cards or relics this card needs?'],
  ['survival','Staying alive','Which choice improves defense or ends fights sooner?'],
  ['pressure','Damage','Which card improves damage at a cost we can afford?'],
  ['tempo','Energy and draw','Can we play the new card alongside the cards it needs?'],
  ['resources','Another copy?','Is this addition worth drawing instead of an existing card?']
 ];
 const notes={
  potion:{context:'Final boss · Turn 1 · 27 incoming damage',rule:'The potion grants 2 Dexterity, improving block from cards played afterward.',result:'Jev used the Dexterity Potion. The next observation showed 2 Dexterity; the runner then asked for another move.'},
  turn:{context:'Final boss · Turn 1 · 27 incoming damage',rule:'Nine legal options included attacking, blocking, potions and ending the turn.',result:'Every first-pass answer picked Defend → End turn. The review chose Defend → Headbutt instead. The runner played Defend and checked the game again.'},
  reward:{context:'Card reward · Pommel Strike, Rage, Feel No Pain or Skip',rule:'Rage costs 0 energy and gives 3 block for each attack played later that turn.',result:'The damage question favored Pommel Strike. The final review kept Rage, and the runner added it to the deck.'}
 };
 let examples;
 function render(key){
  const e=examples.find(example=>example.key===key),note=notes[key],questions=key==='reward'?rewards:common;
  buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.example===key)));
  container.innerHTML=`<div class="question-context"><span>RUN #${e.run} · FLOOR ${e.floor}</span><h3>${escape(note.context)}</h3><p>${e.hp} HP${e.energy!==null?` · ${e.energy} energy`:''} · ${e.candidateCount} options</p></div><div class="questions-grid"><div class="question-answers"><div class="question-column-head"><span>Question</span><span>Jev’s answer</span></div>${questions.map(([role,label,question])=>`<div class="question-answer"><div><span class="question-role">${label}</span><p>${question}</p></div><strong>${escape(e.answers[role])}</strong></div>`).join('')}${e.deckNeed?`<p class="deck-need">Extra reward question: <strong>What does this deck need most?</strong> Jev answered <strong>${escape(e.deckNeed)}</strong>.</p>`:''}</div><div class="question-review"><div class="replay-label">THEN: REVIEW THE CHOICE</div><h3>“Does that still look like the best move?”</h3><p>Jev checked its recommendations against the same state and all available options. It could keep or change the plan; this was not a vote.</p><p class="question-rule">${escape(note.rule)}</p><dl><div><dt>First choice</dt><dd>${escape(e.initial)}</dd></div><div class="question-final"><dt>After review · ${e.changed?'changed':'kept'}</dt><dd>${escape(e.final)}</dd></div><div><dt>Action executed</dt><dd>${escape(e.executed)}</dd></div></dl><p class="question-outcome">${escape(note.result)}</p></div></div>`;
 }
 fetch('question-examples.json').then(response=>{if(!response.ok)throw Error('Unavailable');return response.json()}).then(data=>{examples=data.examples;buttons.forEach(button=>button.onclick=()=>render(button.dataset.example));render('potion')}).catch(()=>{container.textContent='Couldn’t load the recorded questions. Try reloading.';buttons.forEach(button=>button.disabled=true)});
})();
