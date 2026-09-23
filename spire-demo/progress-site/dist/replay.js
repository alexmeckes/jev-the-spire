'use strict';
(() => {
  const el = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let replay, current = 0, timer = null;
  const short = label => label.replace(/ → Aeonglass/g, '');
  function actionTitle(step) {
    const prefix = {play_card:'Play ',use_potion:'Use ',select_card:'Choose ',combat_select_card:'Choose '}[step.action] || '';
    return prefix + short(step.firstAction);
  }
  function stop() { clearInterval(timer); timer = null; el('replayPlay').textContent = 'Play replay'; }
  function choose(index, automatic = false) {
    if (!automatic) stop();
    current = Math.max(0, Math.min(replay.steps.length - 1, index));
    render();
  }
  function meter(name, hp, max, cls) {
    return `<div class="replay-health ${cls}"><div><strong>${esc(name)}</strong><span>${hp} / ${max} HP</span></div><div class="health-track" role="meter" aria-label="${esc(name)} health" aria-valuenow="${hp}" aria-valuemin="0" aria-valuemax="${max}"><span style="width:${Math.max(0,Math.min(100,hp/max*100))}%"></span></div></div>`;
  }
  function render() {
    const s = replay.steps[current], p = s.player, e = s.enemies[0], a = s.after;
    el('replayPosition').textContent = `${current + 1} / ${replay.steps.length}`;
    el('replayRange').value = current;
    el('replayPrev').disabled = current === 0;
    el('replayNext').disabled = current === replay.steps.length - 1;
    el('replayAnnouncement').textContent = `Turn ${s.round} · ${actionTitle(s)}`;
    el('replayTurns').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.round === s.round));
    el('replayBoard').innerHTML = meter('Ironclad',p.hp,p.max_hp,'player-health') +
      `<div class="battle-resources"><span><strong>${p.energy ?? '—'}</strong> energy</span><span><strong>${p.block}</strong> block</span>${s.status.filter(x => x.name === 'Strength').map(x=>`<span><strong>${x.amount}</strong> Strength</span>`).join('')}</div>` +
      meter(e.name,e.hp,e.max_hp,'enemy-health') + `<div class="enemy-intent"><span>${e.block} block</span><p>${e.intents.map(esc).join(' ')}</p></div>` +
      (s.enemyFromPreviousObservation ? '<p class="replay-small">Enemy state from the last observation; card selection is open.</p>' : '');
    const cards = s.selection ? s.selection.cards : s.hand;
    el('replayHand').innerHTML = `<h3>${esc(s.selection ? s.selection.prompt : 'Cards in hand')}</h3><ul class="replay-cards">${cards.map(c => {
      const chosen = ['play_card','select_card','combat_select_card'].includes(s.action) && c.index === s.selectedCard;
      return `<li class="replay-card${chosen?' card-chosen':''}${c.can_play===false&&!s.selection?' card-unavailable':''}"><div class="card-top"><span>${esc(c.type)}</span><span class="card-energy" aria-label="${esc(c.cost)} energy">${esc(c.cost)}</span></div><strong>${esc(c.name)}</strong><p>${esc(c.description)}</p>${chosen?'<span class="card-picked">Chosen</span>':c.can_play===false&&!s.selection?'<span class="card-unplayable">Unavailable</span>':''}</li>`;
    }).join('')}</ul>`;
    const strip=el('replayHand').querySelector('.replay-cards'), picked=strip.querySelector('.card-chosen');
    if(picked)strip.scrollLeft+=picked.getBoundingClientRect().left-strip.getBoundingClientRect().left-(strip.clientWidth-picked.clientWidth)/2;
    el('replayEffects').innerHTML = [{name:'Ironclad',effects:s.status},{name:e.name,effects:e.status}].map(group=>`<h4>${esc(group.name)}</h4><ul>${group.effects.map(x=>`<li><strong>${esc(x.name)} ${x.amount}</strong> — ${esc(x.description)}</li>`).join('')}</ul>`).join('') + (s.potions.length ? `<h4>Potions</h4><ul>${s.potions.map(x=>`<li><strong>${esc(x.name)}</strong> — ${esc(x.description)}</li>`).join('')}</ul>` : '');
    const sequence = s.plan.map(short);
    el('replayChoice').innerHTML = `<h3>${esc(actionTitle(s))}</h3>${sequence.length>1?`<p class="replay-small">Chosen sequence</p><ol class="chosen-sequence">${sequence.map((label,i)=>`<li${i===0?' class="execute-now"':''}><span>${i+1}</span>${esc(label)}${i===0?'<small>Play now</small>':''}</li>`).join('')}</ol>`:''}`;
    const ranked = s.candidates.filter(c => c.weight !== null), top = ranked.slice(0,3);
    if (!top.some(c=>c.chosen)) { const chosen=s.candidates.find(c=>c.chosen); if(chosen)top.push(chosen); }
    el('replayAlternatives').innerHTML = `<h4>${s.candidates.length===1?'Only available option':`Leading options · ${s.candidates.length} considered`}</h4><div class="choice-weights">${top.map(c=>`<div class="choice-weight${c.chosen?' is-chosen':''}"><div><span>${esc(short(c.label))}${c.chosen?' <b>Chosen</b>':''}</span><strong>${c.weight===null?'—':Math.round(c.weight*100)+'%'}</strong></div><div class="weight-track"><span style="width:${Math.max(0,Math.min(100,(c.weight??0)*100))}%"></span></div></div>`).join('')}</div><p class="replay-small">Jev’s final choice weights, not chances of winning.</p>`;
    const changes = [];
    if(a.victory) {
      changes.push('Aeonglass defeated. The reward screen opens at 9 HP after Burning Blood heals 6.');
    } else {
      const nextEnemy=a.enemies[0];
      if(nextEnemy && nextEnemy.hp !== e.hp) changes.push(`Boss HP: ${e.hp} → ${nextEnemy.hp}.`);
      if(nextEnemy && nextEnemy.block !== e.block) changes.push(`Boss block: ${e.block} → ${nextEnemy.block}.`);
      if(a.player.hp !== p.hp) changes.push(`Ironclad HP: ${p.hp} → ${a.player.hp}.`);
      if(a.player.block !== p.block) changes.push(`Your block: ${p.block} → ${a.player.block}.`);
      if(a.player.energy !== p.energy && a.player.energy !== null) changes.push(`Energy: ${p.energy} → ${a.player.energy}.`);
      if(a.screen==='card_select') changes.push('The game opens a card selection. Jev chooses again.');
      else if(a.screen==='hand_select') changes.push(s.action==='combat_select_card'?'Card selected; confirmation follows.':'The game opens a hand selection. Jev chooses again.');
      else if(s.action==='combat_confirm_selection') changes.push('The selected upgrade is applied.');
      else if(s.action==='select_card') changes.push(`Selected ${short(s.firstAction)}.`);
      if(s.action==='end_turn'&&a.round>s.round) changes.push(`Turn ${a.round} begins with a new hand.`);
      if(s.action==='play_card'&&short(s.firstAction)==='Battle Trance+') changes.push('Drawn: Havoc, Strike, Bully and Fiend Fire. Strike and Bully both cost 0.');
      for(const status of a.status) {
        const prior=s.status.find(x=>x.name===status.name)?.amount??0;
        if(status.amount!==prior) changes.push(`${status.name}: ${prior} → ${status.amount}.`);
      }
      if(!changes.length) changes.push('The action resolves; the runner reads the updated cards and effects.');
    }
    el('replayResult').innerHTML = `<ul>${changes.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`;
    el('replayResult').classList.toggle('fight-won',a.victory);
  }
  fetch('winning-replay.json').then(r=>{if(!r.ok)throw Error('Replay unavailable');return r.json();}).then(data=>{
    replay=data;
    const turns=Array.from({length:9},(_,i)=>({round:i+1,index:data.steps.findIndex(s=>s.round===i+1)}));
    el('replayTurns').innerHTML=turns.map(t=>{const s=data.steps[t.index];return `<button type="button" data-round="${t.round}" data-step="${t.index}" aria-pressed="false"><strong>Turn ${t.round}</strong><span>${s.player.hp} HP</span></button>`;}).join('');
    el('replayTurns').querySelectorAll('button').forEach(b=>b.onclick=()=>choose(+b.dataset.step));
    el('replayRange').max=data.steps.length-1;
    el('replayRange').oninput=e=>choose(+e.target.value);
    el('replayPrev').onclick=()=>choose(current-1);
    el('replayNext').onclick=()=>choose(current+1);
    el('replayPlay').onclick=()=>{
      if(timer){stop();return;}
      if(current===data.steps.length-1)choose(0);
      el('replayPlay').textContent='Pause replay';
      timer=setInterval(()=>{if(current<data.steps.length-1)choose(current+1,true);if(current===data.steps.length-1)stop();},4500);
    };
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop();}).observe(el('winning-decisions'));
    choose(turns[7].index);
  }).catch(()=>{el('replayAnnouncement').textContent='Couldn’t load the replay. Try reloading.';el('replayPlay').disabled=true;});
})();
