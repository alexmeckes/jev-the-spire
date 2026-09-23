'use strict';
const $=s=>document.querySelector(s),fmt=n=>n.toLocaleString('en-US'),date=t=>new Date(t+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric'}),day=t=>t,duration=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
const INPUT_USD_PER_MILLION=0.042;
const cost=n=>n/1e6*INPUT_USD_PER_MILLION,usd=n=>n.toLocaleString('en-US',{style:'currency',currency:'USD'});
let D,selected=182,view='runs',tab='live';
const milestones=[
{key:'jev-plans-v2',title:"Compare short card sequences",text:"Added short sequences to the choices Jev could select. The runner plays the first action, then checks the game again.",tag:'Planning',planner:true},
{key:'jev-review-v1',title:"Ask Jev to review its choice",text:"Added a second Jev call to review the first choice before acting.",tag:'Decision review'},
{key:'jev-visible-review-v9-endcheck',title:"Check before ending the turn",text:"If Jev wants to end the turn with a playable card left, ask it to compare playing that card first.",tag:'Decision review'},
{key:'jev-visible-v11-block-refresh',title:"Fix block estimates",text:"Read the game again after a block card under Unmovable. The old calculation could reuse a doubled block value.",tag:'Calculation fix',planner:true},
{key:'jev-visible-review-v12-setup-dependencies',title:"Check setup and follow-up cards",text:"Show which cards need an exhaust effect first, and whether enough energy remains to play the follow-up.",tag:'Card order'},
{key:'jev-visible-v19-damage-caps',title:"Fix damage-cap calculations",text:"Apply displayed damage caps to each hit after Vulnerable. Previously, an attack could appear to kill when it could not.",tag:'Calculation fix',planner:true},
{key:'jev-visible-review-v15-reward-value',title:"Review reward picks",text:"Ask Jev whether an offered card helps enough to take it instead of skipping.",tag:'Deck building'},
{key:'jev-visible-v21-minion-departure',title:"Account for minions leaving",text:"When the displayed rules say minions leave after their leader dies, remove their attacks from that kill estimate.",tag:'Calculation fix',planner:true},
{key:'jev-visible-review-v19-deck-evidence',title:"Check what the deck needs",text:"Show the deck’s exhaust sources during reward choices and ask Jev which weakness a new card would address.",tag:'Deck building'},
{key:'jev-visible-review-v21-facing-projection',title:"Check which way we face",text:"When enemies can attack from behind, compare damage from both sides and the direction left by the last targeted action.",tag:'Positioning'},
{key:'jev-visible-review-v22-deadline-extension',title:"Plan for death countdowns",text:"Ask Jev to consider available cards that extend a visible countdown, including the energy needed to play them.",tag:'Survival'},
{key:'jev-visible-review-v23-target-focus',title:"Keep damage on one target",text:"Ask Jev to keep major attacks focused across turns while allowing cheap attacks to change facing.",tag:'Target choice'},
{key:'jev-visible-v23-retaliation',title:"Include retaliation damage",text:"Add displayed retaliation to estimates for supported single-hit attacks. More complicated cases are still marked uncertain.",tag:'Calculation fix',planner:true},
{key:'jev-visible-review-v24-card-order',title:"Check card order",text:"Add a Jev review when order matters: Rage before attacks, buffs before damage, and draw while energy remains.",tag:'Card order'}];
const offline=[
{title:'Jev network',tag:'Tested offline',text:'Several Jev assessments passed 16 of 20 checks in the second batch. The existing version passed 17.',evidence:'September 22 · tests on saved positions'},
{title:'Keep a plan across decisions',tag:'Tested offline',text:'Keeping a plan across decisions passed 16 of 20 checks; the existing version passed 17. Both passed all eight survival checks.',evidence:'September 22 · tests on saved positions'},
{title:'Strength / cheap-attack preference',tag:'Tested offline',text:'We tested 48 decisions. In the 12 pairs where the Strength preference applied, Jev picked the same card with and without it.',evidence:'September 22 · saved card rewards'},
{title:'Ask whether a card is worth adding',tag:'Tested offline',text:'The new prompt skipped 3 of 24 rewards; the existing prompt skipped none. We did not establish whether those skips helped.',evidence:'September 22 · saved card rewards'},
{title:'Offer more Rage-first sequences',tag:'Tested offline',text:'We added 21 Rage-first sequences to seven saved hands. Jev chose none of them in 48 decisions.',evidence:'September 22 · never enabled in live runs'},
{title:'Check survival after the next action',tag:'Tested offline',text:'In a saved position where we died, both repeats changed Bludgeon to Pommel Strike+. Safe choices stayed the same. Opening setup choices did not improve.',evidence:'September 22 · 16 decisions; the full fight was not replayed'}];
function color(r){return r.win?'#89efb0':r.act===3?'#bfa2f5':r.act===2?'#ec8156':'#627490'}
function detail(){
 const r=D.runs[selected-1];$('#runOutput').value=selected;$('#runRange').value=selected;
 $('#detail').innerHTML=`<div class="tag">${r.win?'VICTORY':`ACT ${r.act} · FLOOR ${r.floor}`}</div><h3>Run ${r.n}${r.win?' ✦':''}</h3><p>${date(r.start)}</p><dl><div><dt>Result</dt><dd>${r.win?'Victory':'Defeat'}</dd></div><div><dt>Highest floor</dt><dd>${r.floor}</dd></div><div><dt>Duration</dt><dd>${duration(r.seconds)}</dd></div><div><dt>Decisions</dt><dd>${fmt(r.decisions)}</dd></div><div><dt>Est. cost</dt><dd>${usd(cost(r.inputTokens))}</dd></div></dl><p class="run-result">${r.win?'Final boss defeated. Rewards collected at 9 HP.':r.encounter}</p>${r.win?'<a class="build-link" href="#winning-build">See the winning build ↓</a>':''}<details class="run-extra"><summary>Tokens &amp; code version</summary><dl><div><dt>Input tokens</dt><dd>${fmt(r.inputTokens)}</dd></div><div><dt>Output tokens</dt><dd>${fmt(r.outputTokens)}</dd></div><div><dt>Total tokens</dt><dd>${fmt(r.totalTokens)}</dd></div><div><dt>Input cost</dt><dd>${usd(cost(r.inputTokens))}</dd></div><div><dt>Output cost</dt><dd>$0.00</dd></div><div><dt>Ascension</dt><dd>${r.ascension}</dd></div></dl><p class="policy">${r.assisted?'Brief Luna adviser trial; Jev final choices.':'Jev 1.13.0'}<br>${r.reviews.at(-1)||r.policies.at(-1)||'Initial policy'}</p></details>`;
 $('#prev').disabled=selected===1;$('#next').disabled=selected===D.runs.length;
}
function chart(){const w=Math.max(260,$('#chart').clientWidth),h=$('#chart').clientHeight,L=36,R=66,T=58,B=30,iw=w-L-R,ih=h-T-B,y=f=>T+ih-f/50*ih;
let svg=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${view==='runs'?'Highest floor for each of 182 runs.':'Average and highest floor by day.'}"><title>Jev run progress</title><text x="0" y="18" fill="#a0a9b9" font-size="10">FLOOR</text>`;
for(let [lo,hi,label] of [[0,17,'I'],[17,33,'II'],[33,50,'III']])svg+=`<rect x="${L}" y="${y(hi)}" width="${iw}" height="${y(lo)-y(hi)}" fill="${lo===33?'#332941':lo===17?'#38271e':'#202b3b'}" opacity=".65"/><text x="${w-R+10}" y="${y((lo+hi)/2)+4}" fill="${lo===33?'#cdb5f4':lo===17?'#efa37e':'#a3b6d0'}" font-size="12">Act ${label}</text>`;
for(let f of [0,17,33,48])svg+=`<line x1="${L}" x2="${w-R}" y1="${y(f)}" y2="${y(f)}" stroke="#333b49" stroke-dasharray="3 4"/><text x="${L-8}" y="${y(f)+4}" text-anchor="end" fill="#a0a9b9" font-size="12">${f}</text>`;
if(view==='runs'){
 const step=iw/D.runs.length,x=n=>L+(n-.5)*step;
 for(let m of milestones){let pos=(m.planner?D.plannerVersions:D.reviewVersions)[m.key];m.run=pos.run;m.time=pos.time}
 // A small set of major chapter pins keeps the full timeline legible.
 const pins=[2,5,8,10,13].map(i=>milestones[i]);
 $('#chartPins').hidden=false;
 $('#chartPins').innerHTML=pins.map((m,i)=>`<button data-run="${m.run}" aria-pressed="${selected===m.run}"><span>${i+1}</span>${m.title}<small>Run ${m.run}</small></button>`).join('');
 $('#chartPins').querySelectorAll('button').forEach(el=>el.onclick=()=>choose(+el.dataset.run));
 pins.forEach((m,i)=>{const cy=i%2?34:16;svg+=`<g class="pin" data-run="${m.run}" tabindex="0" role="button" aria-label="${m.title}, run ${m.run}"><line x1="${x(m.run)}" x2="${x(m.run)}" y1="${cy+10}" y2="${h-B}" stroke="#758091" stroke-dasharray="2 5" opacity=".5"/><circle cx="${x(m.run)}" cy="${cy}" r="10" fill="#293242"/><text x="${x(m.run)}" y="${cy+4}" fill="white" font-size="12" text-anchor="middle">${i+1}</text><title>${m.title} · Run ${m.run}</title></g>`});
 D.runs.forEach(r=>{svg+=`<rect class="chartbar" data-run="${r.n}" x="${x(r.n)-step*.34}" y="${y(r.floor)}" width="${Math.max(1,step*.68)}" height="${y(0)-y(r.floor)}" fill="${color(r)}" opacity="${selected===r.n?1:.65}"><title>Run ${r.n} · Floor ${r.floor} · ${r.win?'Victory':r.encounter}</title></rect>`});
 const points=D.runs.map((r,i)=>{const a=D.runs.slice(Math.max(0,i-9),i+1);return `${x(r.n)},${y(a.reduce((s,r)=>s+r.floor,0)/a.length)}`}).join(' ');
 svg+=`<polyline points="${points}" fill="none" stroke="#edf2f8" stroke-width="1.5" pointer-events="none"/><line x1="${x(selected)}" x2="${x(selected)}" y1="${T}" y2="${h-B}" stroke="white" opacity=".7" pointer-events="none"/><circle cx="${x(selected)}" cy="${y(D.runs[selected-1].floor)}" r="4" fill="white" pointer-events="none"/>`;
 for(let n of [1,30,60,90,120,150,182])svg+=`<text x="${x(n)}" y="${h-5}" text-anchor="middle" fill="#a0a9b9" font-size="12">${n}</text>`;
 const winner=D.runs.find(r=>r.win);
 if(winner)svg+=`<text x="${x(winner.n)-8}" y="${y(winner.floor)-10}" text-anchor="end" fill="#89efb0" font-size="12" font-weight="600">First win · #${winner.n}</text><circle cx="${x(winner.n)}" cy="${y(winner.floor)}" r="5" fill="#89efb0"/>`;
 $('#chartHint').textContent='Numbered markers show code changes. Choose one below to inspect that run.';
 $('#lineKey').textContent='— Average of the last 10 runs';$('#chartAxis').textContent='RUN NUMBER →';
}else{
 $('#chartPins').hidden=true;$('#lineKey').textContent='● Best floor that day';$('#chartAxis').textContent='DATE →';
 let groups=Object.entries(Object.groupBy(D.runs,r=>day(r.start))),step=iw/groups.length;
 groups.forEach(([d,rs],i)=>{let x=L+(i+.5)*step,avg=rs.reduce((s,r)=>s+r.floor,0)/rs.length,best=rs.reduce((a,b)=>a.floor>b.floor?a:b),bw=Math.min(step*.48,48);svg+=`<g class="chartbar" data-run="${best.n}"><rect x="${x-bw/2}" y="${y(avg)}" height="${y(0)-y(avg)}" width="${bw}" fill="${color(best)}" opacity=".85"/><line x1="${x}" x2="${x}" y1="${y(avg)}" y2="${y(best.floor)}" stroke="${color(best)}"/><circle cx="${x}" cy="${y(best.floor)}" r="4" fill="${color(best)}"/><text x="${x}" y="${y(best.floor)-9}" text-anchor="middle" fill="#ccd5e1" font-size="12">${rs.length} runs</text><text x="${x}" y="${h-5}" text-anchor="middle" fill="#a0a9b9" font-size="12">${date(rs[0].start)}</text><title>${d}: ${rs.length} runs; average floor ${avg.toFixed(1)}, best ${best.floor}</title></g>`});
 $('#chartHint').textContent='Bars show average floor; dots show highest floor. Select a day to inspect its deepest run.';
}
$('#chart').innerHTML=svg+'</svg>';$('#chart').querySelectorAll('[data-run]').forEach(el=>{el.onclick=()=>choose(+el.dataset.run);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(+el.dataset.run)}}})}
function choose(n){selected=Math.max(1,Math.min(D.runs.length,n));detail();chart()}
function renderMilestones(){if(tab==='lab'){$('#milestones').innerHTML=offline.map(m=>`<article class="milestone"><div class="meta"><span>${m.tag}</span><span class="badge">OFFLINE</span></div><h3>${m.title}</h3><p>${m.text}</p><div class="evidence">${m.evidence}</div></article>`).join('');return}
$('#milestones').innerHTML=milestones.map(m=>{const p=(m.planner?D.plannerVersions:D.reviewVersions)[m.key];return `<button class="milestone" data-run="${p.run}"><div class="meta"><span>RUN ${p.run}</span><span class="badge">${m.tag}</span></div><h3>${m.title}</h3><p>${m.text}</p><div class="evidence">First logged: ${date(p.time)}</div></button>`}).join('')+`<article class="milestone"><div class="meta"><span>SEP 22 · REPORT DATE</span><span class="badge">Reliability</span></div><h3>Shorten oversized requests</h3><p>Removed repeated card-order details to stop request-size errors. The available choices and warnings stayed the same.</p><div class="evidence">September 22 · report date</div></article>`;
const extra=[{n:134,title:'Try Luna as an adviser',text:'Luna Max reviewed two choices before Jev made the final call. It was too slow, so we stopped the trial and returned to Jev alone.',when:'Sep 21 · first logged use',tag:'Stopped experiment'},{n:152,title:'Fix repeated Strike damage',text:'Fixed the damage estimate for plain Strike repeated by Replay, including effects that apply on each hit. Checked against recorded game actions.',when:'Sep 22 · deployment report',tag:'Calculation fix'}];
extra.forEach(m=>{let el=document.createElement('button');el.className='milestone';el.dataset.run=m.n;el.innerHTML=`<div class="meta"><span>RUN ${m.n}</span><span class="badge">${m.tag}</span></div><h3>${m.title}</h3><p>${m.text}</p><div class="evidence">${m.when}</div>`;let before=[...$('#milestones').children].find(e=>Number(e.dataset.run)>m.n)||$('#milestones').lastElementChild;$('#milestones').insertBefore(el,before)});
$('#milestones').querySelectorAll('button').forEach(el=>el.onclick=()=>{view='runs';setPressed('allBtn','dailyBtn');choose(+el.dataset.run);$('.surface').scrollIntoView({behavior:'smooth',block:'start'})})}
function renderTokens(){
 const rows=[...D.runs],sort=$('#tokenSort').value;
 rows.sort(sort==='largest'?(a,b)=>b.inputTokens-a.inputTokens:(a,b)=>a.n-b.n);
 $('#tokenSummary').innerHTML=`<div><strong>${usd(cost(D.totalInputTokens))}</strong><span>Input cost · ${fmt(D.totalInputTokens)} tokens</span></div><div><strong>$0.00</strong><span>Output cost · ${fmt(D.totalOutputTokens)} tokens</span></div><div><strong>${usd(cost(D.totalInputTokens)/D.runs.length)}</strong><span>Average cost per run</span></div><div><strong>${usd(cost(D.runs.at(-1).inputTokens))}</strong><span>Winning run cost</span></div>`;

 const max=Math.max(...rows.map(r=>r.inputTokens));
 $('#tokenRows').innerHTML=rows.map(r=>`<tr><td><button class="token-run" data-run="${r.n}">#${r.n}${r.win?' ✦':''}</button></td><td>Act ${r.act} · ${r.floor}</td><td class="token-value"><span class="token-bar" style="width:${r.inputTokens/max*100}%"></span><span>${fmt(r.inputTokens)}</span></td><td>${fmt(r.outputTokens)}</td><td>${fmt(r.totalTokens)}</td><td>${usd(cost(r.inputTokens))}</td></tr>`).join('');
 $('#tokenRows').querySelectorAll('button').forEach(el=>el.onclick=()=>{choose(+el.dataset.run);$('.surface').scrollIntoView({behavior:'smooth'})});
 $('#tokenSort').onchange=renderTokens;
}
function setPressed(a,b){$('#'+a).setAttribute('aria-pressed','true');$('#'+b).setAttribute('aria-pressed','false')}
$('#allBtn').onclick=()=>{view='runs';setPressed('allBtn','dailyBtn');chart()};$('#dailyBtn').onclick=()=>{view='day';setPressed('dailyBtn','allBtn');chart()};$('#liveBtn').onclick=()=>{tab='live';setPressed('liveBtn','labBtn');renderMilestones()};$('#labBtn').onclick=()=>{tab='lab';setPressed('labBtn','liveBtn');renderMilestones()};$('#runRange').oninput=e=>choose(+e.target.value);$('#prev').onclick=()=>choose(selected-1);$('#next').onclick=()=>choose(selected+1);
fetch('data.json').then(r=>{if(!r.ok)throw Error('Data unavailable');return r.json()}).then(d=>{D=d;
 const groups=[{label:'Act 1 losses',count:D.runs.filter(r=>!r.win&&r.act===1).length,color:'#627490'},{label:'Act 2 losses',count:D.runs.filter(r=>!r.win&&r.act===2).length,color:'#ec8156'},{label:'Act 3 losses',count:D.runs.filter(r=>!r.win&&r.act===3).length,color:'#bfa2f5'},{label:'Win',count:D.runs.filter(r=>r.win).length,color:'#89efb0'}];
 $('#runBreakdown').innerHTML=groups.map(g=>`<span><i style="background:${g.color}"></i><strong>${g.count}</strong> ${g.label}</span>`).join('');
 detail();chart();renderMilestones();renderTokens();new ResizeObserver(()=>chart()).observe($('#chart'))}).catch(()=>{$('#chart').textContent='Couldn’t load the run data. Try reloading.'});
