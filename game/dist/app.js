import {locations,actions,fresh,duration,reason,start,advance,nextRun,ready,resolve,WAVE_TIME,migrateSave} from './engine.js';
import {terrain,structure} from './art.js';
const $=id=>document.getElementById(id), KEY='rebuild-v0-save';
let state=fresh(), selected='camp',paused=false,zoom=1,sound=false,audio=null,saveOK=true;
try{const stored=JSON.parse(localStorage.getItem(KEY));if(stored?.version===1&&Array.isArray(stored.done)&&Array.isArray(stored.discovered)&&Number.isFinite(stored.time)&&stored.time>=0&&stored.time<=WAVE_TIME&&['scrap','food','people','defense','knowledge','run'].every(k=>Number.isFinite(stored[k])&&stored[k]>=0)&&Array.isArray(stored.known)&&Array.isArray(stored.log)&&(!stored.active||actions[stored.active.id]))state=stored;}catch{}
state=migrateSave(state);
// A resumed task waits for the player, rather than advancing while the page loads.
paused=!!state.active;
const restoredFor={camp:'shelter',farm:'cultivate',bridge:'crossing',radio:'signal',church:'rescue',ridge:'scout'};
const icons={scrap:'◇',food:'♧',people:'♙',defense:'⛨'};
const labels={scrap:'Scrap',food:'Food',people:'Survivors',defense:'Defense'};
function selectLocation(id){selected=id;renderMap();renderDetail();if(innerWidth<=700)$('detail').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{saveOK=false;} $('save-status').textContent=saveOK?'● Saved on this device':'○ Save unavailable';}
function chirp(){if(!sound)return;try{audio??=new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(440,audio.currentTime);o.frequency.exponentialRampToValueAtTime(660,audio.currentTime+.15);g.gain.setValueAtTime(.04,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.6);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.6);}catch{}}
const mapBase=terrain();
function renderMap(){
 let fog='',nodes='';
 for(const loc of locations){
  const discovered=state.discovered.includes(loc.id),known=state.known.includes(loc.id),restored=state.done.includes(restoredFor[loc.id]);
  if(!discovered){fog+=`<ellipse cx="${loc.x}" cy="${loc.y}" rx="205" ry="180" fill="url(#fog)"/>`;nodes+=`<g transform="translate(${loc.x},${loc.y})" opacity="${known?.6:.28}"><circle r="17" stroke="#89977a" stroke-dasharray="2 5" fill="#243127"/><text y="5" text-anchor="middle" fill="#a9b595" font-family="monospace" font-size="14">${known?'◇':'?'}</text>${known?`<text y="39" class="node-label" style="font-size:8px">${loc.name}</text>`:''}</g>`;continue;}
  const active=actions[state.active?.id]?.node===loc.id;
  nodes+=`<g class="node ${selected===loc.id?'selected':''}" data-location="${loc.id}" role="button" tabindex="0" aria-label="${loc.name}${restored?', restored':''}" aria-pressed="${selected===loc.id}"><g transform="translate(${loc.x},${loc.y})"><ellipse cy="9" rx="57" ry="27" fill="#17261c" opacity=".6"/><circle class="node-ring" r="42" cy="-8"/>${selected===loc.id||active?`<circle class="selection-halo ${active?'working-halo':''}" r="51" cy="-8"/>`:''}<g transform="translate(0,-4) scale(.69)">${structure(loc.icon,restored)}</g><circle cx="32" cy="-40" r="8" fill="${restored?'#cbdc91':'#334331'}" stroke="#8e9f73"/><text x="32" y="-37" text-anchor="middle" fill="${restored?'#29391e':'#bfcea5'}" font-family="monospace" font-size="9">${restored?'✓':'+'}</text><text class="node-label" y="58">${loc.name}</text><text class="node-type" y="73">${restored?'RESTORED':loc.kind}</text></g></g>`;
 }
 $('world').innerHTML=`<g id="map-content" transform="translate(${550*(1-zoom)},${380*(1-zoom)}) scale(${zoom})">${mapBase}${fog}<g id="horde-marker" aria-hidden="true"><path d="M-85 -55 Q0 -90 85 -55" fill="none" stroke="#d78068" stroke-width="3" stroke-dasharray="5 6"/><path d="M-18 -48 0 -25 18 -48" fill="none" stroke="#d78068" stroke-width="3"/><text text-anchor="middle" y="-105" fill="#f0b09a" font-size="12" font-family="monospace">☠ HORDE FRONT</text><text text-anchor="middle" y="-88" fill="#d6a08d" font-size="9" font-family="monospace">APPROACHING OUTPOST</text></g>${nodes}</g>`;
 $('world').querySelectorAll('[data-location]').forEach(el=>{const select=()=>selectLocation(el.dataset.location);el.addEventListener('click',select);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});});
 updateHorde();
 $('explored').textContent=`${state.discovered.length} / ${locations.length} locations`;
}
function updateHorde(){
 const marker=$('horde-marker');
 if(marker)marker.setAttribute('transform',`translate(${1030-state.time/WAVE_TIME*600},${630-state.time/WAVE_TIME*230})`);
}
function renderResources(){
 $('resources').innerHTML=Object.keys(icons).map(k=>`<div class="resource"><span class="resource-icon" aria-hidden="true">${icons[k]}</span><span class="resource-name">${labels[k]}</span><strong>${state[k]}${k==='defense'?'<small>/12</small>':''}</strong></div>`).join('');
 $('goals').innerHTML=`<div class="goal ${state.defense>=12?'complete':''}"><span>${state.defense>=12?'☑':'□'} Fortify the settlement</span><span>${state.defense}/12</span></div><div class="goal ${state.people>=3?'complete':''}"><span>${state.people>=3?'☑':'□'} Find your people</span><span>${state.people}/3</span></div>`;
 $('run').textContent=`RUN ${String(state.run).padStart(2,'0')}`;
 $('legacy').textContent=state.knowledge?`${state.knowledge} knowledge carried forward`:'A fresh start';
 $('next-move').textContent=!state.done.includes('salvage')?'Start here: the scrap yard has materials for your outpost.':!state.done.includes('shelter')?'Board up the outpost. You need 6 scrap.':!state.done.includes('scout')?'Climb the ridge. Find a route to other survivors.':!state.done.includes('crossing')?'Repair the river crossing to reach the far bank.':!state.done.includes('rescue')?'Bring 6 food to the people sheltering at St. Alder’s.':!ready(state)?'Keep reinforcing the outpost until defense reaches 12.':'Everyone is inside. The barricades are ready.';
 $('legacy-description').textContent=state.knowledge?`Tasks are ${Math.round(state.knowledge*12)}% faster. The valley remembers.`:'Every ending teaches you something.';
}
function renderDetail(){
 const loc=locations.find(l=>l.id===selected),restored=state.done.includes(restoredFor[selected]);
 const list=Object.entries(actions).filter(([,a])=>a.node===selected);
 $('detail').innerHTML=`<div class="location-heading"><span class="tag">${loc.kind}</span></div><div class="location-art"><svg viewBox="-100 -115 200 170" aria-hidden="true"><ellipse cy="25" rx="85" ry="25" fill="#2d3b2a"/><path d="M-90 25 0-20 90 25 0 70Z" fill="#35442d" opacity=".5"/><g transform="translate(0,0) scale(1.12)">${structure(loc.icon,restored)}</g></svg></div><h2>${loc.name}</h2><p class="location-description">${restored&&loc.restored?loc.restored:loc.text}</p><div class="location-status"><i></i>${restored?'A little more life in the valley.':'Discovered · Awaiting your next move'}</div><div class="section-heading">AVAILABLE ACTIONS <span>${String(list.length).padStart(2,'0')}</span></div>${list.map(([id,a])=>{
 const done=a.once&&state.done.includes(id),blocked=reason(state,id),gain=Object.entries(a.gain||{}).map(([k,v])=>`<span>+${v*(id==='harvest'&&state.done.includes('cultivate')?2:1)} ${labels[k].toLowerCase()}</span>`).join(''),cost=Object.entries(a.cost||{}).map(([k,v])=>`<span class="cost">−${v} ${labels[k].toLowerCase()}</span>`).join('');
 return `<div class="action-card ${done?'finished':''}"><div class="action-head"><h3>${a.label}</h3><span>${duration(state,id)}h</span></div><p>${a.description}</p><div class="action-facts">${cost}${gain}${a.reveal?.some(id=>!state.discovered.includes(id))?`<span>+${a.reveal.filter(id=>!state.discovered.includes(id)).length} locations</span>`:''}</div>${!done&&!state.active?`<div class="time-cost ${state.time+duration(state,id)>WAVE_TIME?'danger':''}">${state.time+duration(state,id)>WAVE_TIME?'Horde arrives before completion':`${Math.floor(WAVE_TIME-state.time-duration(state,id))}h left after this action`}</div>`:''}${done?'<div class="finished-label">✓ COMPLETED</div>':`<button class="action-button" data-action="${id}" ${blocked?'disabled':''}><span>${blocked||a.label}</span><span>${blocked?'—':'↗'}</span></button>`}${!done&&a.cost?Object.entries(a.cost).filter(([k,v])=>state[k]<v).map(([k])=>`<button class="supply-link" data-supply="${k==='scrap'?'yard':state.discovered.includes('fields')?'fields':'ridge'}">${k==='scrap'?'Find scrap → Scrap yard':state.discovered.includes('fields')?'Find food → Abandoned fields':'Find food → Scout the ridge'}</button>`).join(''):''}</div>`;
 }).join('')}`;
 $('detail').querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{if(start(state,b.dataset.action)){paused=false;save();renderAll();}}));
 $('detail').querySelectorAll('[data-supply]').forEach(b=>b.onclick=()=>selectLocation(b.dataset.supply));
 renderTask();
}
function renderTask(){
 const slot=$('task-slot');if(!slot)return;
 slot.hidden=!state.active;
 if(!state.active){slot.innerHTML='';return;}
 const t=state.active;
 if(slot.querySelector('.task-panel')){
  slot.querySelector('.eyebrow').textContent=paused?'WORK PAUSED':'WORK IN PROGRESS';
  slot.querySelector('.task-track div').style.width=`${t.elapsed/t.total*100}%`;
  slot.querySelector('.task-controls span').textContent=`${Math.floor(t.elapsed/t.total*100)}% · ${Math.ceil(t.total-t.elapsed)}h left`;
  $('pause-task').textContent=paused?'▶ Resume':'Ⅱ Pause';
  return;
 }
 slot.innerHTML=`<div class="task-panel"><div class="eyebrow">${paused?'WORK PAUSED':'WORK IN PROGRESS'}</div><h3>${actions[t.id].verb}…</h3><div class="task-track"><div style="width:${t.elapsed/t.total*100}%"></div></div><div class="task-controls"><span>${Math.floor(t.elapsed/t.total*100)}% · ${Math.ceil(t.total-t.elapsed)}h left</span><button id="pause-task">${paused?'▶ Resume':'Ⅱ Pause'}</button></div></div>`;
 $('pause-task').onclick=()=>{paused=!paused;renderTask();renderClock();};
}
function renderClock(){
 updateHorde();
 document.body.dataset.threat=state.time>=120?'near':'distant';
 $('operation-state').textContent=state.outcome?'RUN ENDED':state.active?(paused?'PAUSED':'OUTSIDE THE WIRE'):'PLANNING · CLOCK STOPPED';
 $('threat-title').textContent=state.time>=120?'DANGER: HORDE CLOSING IN':'CONTACT: THE FIRST HORDE';
 $('journal-day').textContent=`DAY ${String(1+Math.floor(state.time/24)).padStart(2,'0')}`;
 $('wave-left').textContent=`${Math.max(0,Math.ceil(WAVE_TIME-state.time))}h until arrival`;
 $('wave-fill').style.width=`${state.time/WAVE_TIME*100}%`;
 $('clock-caption').textContent=state.outcome?'This expedition has ended.':state.active?(paused?'Paused. Take a breath.':'Working · 1 second = 2 hours'):'Time stands still. Choose your next move.';
 $('face-wave').disabled=!!state.active;
 $('face-wave').textContent=state.outcome?'Expedition report ↗':ready(state)?'Hold the line ↗':'Face the wave ↗';
}
function renderLog(){ $('log').innerHTML=state.log.slice(0,3).map(entry=>`<div class="log-entry"><time>H${String(Math.floor(entry.time)).padStart(3,'0')}</time><span></span></div>`).join(''); [...$('log').querySelectorAll('.log-entry span')].forEach((el,i)=>el.textContent=state.log[i].text); }
function renderAll(){renderResources();renderMap();renderDetail();renderClock();renderLog();if(state.outcome)showEnding();}
function showEnding(){
 const won=state.outcome==='won',earned=nextRun(state).knowledge-state.knowledge;
 $('ending').innerHTML=`<div class="eyebrow">EXPEDITION ${String(state.run).padStart(2,'0')} · ${won?'DAWN BREAKS':'A NEW BEGINNING'}</div><div class="end-symbol">${won?'☀':'✧'}</div><h2>${won?'Tonight, the<br>lights stayed on.':'We lost the outpost.<br>Not the hope.'}</h2><p>${won?'The wave broke against your barricades. You and your people made it through the night. In a world that keeps falling apart, you built something that held.':'The dead overwhelmed the settlement. You slipped into the woods with a map, a few hard-earned lessons, and another chance.'}</p><div class="end-stats"><span><strong>${state.defense}</strong> defense</span><span><strong>${state.people}</strong> survivors</span><span><strong>+${earned}</strong> knowledge</span></div><p>Next run: ${Math.round((state.knowledge+earned)*12)}% faster tasks. Discovered locations remain as remembered silhouettes.</p><button id="next-run" class="primary"><span>Begin again, a little wiser</span><span>↗</span></button><button id="inspect-map" class="text-button">Stay a while. Look at what we built. <span>↗</span></button>`;
 $('next-run').onclick=()=>{state=nextRun(state);selected='camp';paused=false;$('ending').close();save();renderAll();};
 $('inspect-map').onclick=()=>$('ending').close();
 if(!$('ending').open)$('ending').showModal();
}
function showGuide(){if(!$('guide').open)$('guide').showModal();}
 $('help').onclick=showGuide;$('guide-button').onclick=showGuide;
 document.querySelectorAll('.close-dialog,.close-guide').forEach(b=>b.onclick=()=>$('guide').close());
 $('sound').onclick=()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').querySelector('span').textContent=sound?'Sound on':'Sound off';chirp();};
 $('face-wave').onclick=()=>{
 if(state.outcome){showEnding();return;}
 if(state.active)return;
 if(!ready(state)){
 $('ending').innerHTML=`<div class="eyebrow">THE FIRST WAVE</div><h2>There’s still time.</h2><p>You have ${state.defense}/12 defense and ${state.people}/3 survivors. Facing the wave now will end this expedition in defeat, but you will carry knowledge into the next run.</p><button id="keep-building" class="primary">Keep building ↗</button><button id="end-early" class="text-button">Face the wave anyway <span>↗</span></button>`;
 $('ending').showModal();$('keep-building').onclick=()=>$('ending').close();$('end-early').onclick=()=>{resolve(state);save();renderAll();};
 }else{resolve(state);save();chirp();renderAll();}
 };
 document.addEventListener('keydown',e=>{if(e.target.matches('button,a,input,textarea,select')||document.querySelector('dialog[open]'))return;if(e.code==='Space'&&state.active){e.preventDefault();paused=!paused;renderTask();renderClock();}if(e.key==='?')showGuide();});
 $('zoom-in').onclick=()=>{zoom=Math.min(1.6,zoom+.2);renderMap();};$('zoom-out').onclick=()=>{zoom=Math.max(.8,zoom-.2);renderMap();};$('zoom-reset').onclick=()=>{zoom=1;renderMap();};
 let last=performance.now(),saveTimer=0;
 function frame(now){const dt=Math.min((now-last)/1000,.25);last=now;if(state.active&&!paused&&!document.hidden&&!$('guide').open){const before=state.active.id;advance(state,dt*2);if(!state.active||state.active.id!==before){chirp();save();renderAll();}else{renderTask();renderClock();saveTimer+=dt;if(saveTimer>1){save();saveTimer=0;}}}requestAnimationFrame(frame);}
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.active){paused=true;save();renderTask();renderClock();}});
 window.addEventListener('pagehide',save);
 renderAll();requestAnimationFrame(frame);
