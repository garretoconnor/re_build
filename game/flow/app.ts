import {fresh,start,tick,block} from './run.js';
import type {Action,Catalog,Stats} from './run.js';
import {structure} from './art.js';

// Stable catalog IDs anchor the first valley's diagram. Coordinates are presentation only.
const positions:Record<string,[number,number,number,string]>={
  'c3330af4-2033-5a5b-bf41-f7f3f7c9b48c':[1,1,1,'home'],
  '0e435c1f-10d0-57ce-8f43-fce43628ac0d':[2,1,1,'home'],
  '9b86325c-0e08-5a1c-928a-364c8307ab83':[3,1,1,'church'],
  '0f17a823-dac6-521d-8a99-792bbcbc768c':[4,1,1,'radio'],
  'f4c8d1ba-2c94-5827-8e44-66cd269865c2':[1,2,1,'depot'],
  '23728d9d-933f-519d-a35b-45b53f44dff7':[2,2,1,'tower'],
  '598fc938-28dc-5949-b079-dab7c8232b87':[3,2,2,'bridge'],
  'd7e80561-6648-57c6-bfbf-548b43a15faa':[1,3,1,'scrap'],
  'fa19c112-0d42-5eb6-b96e-bd4a72f9fe01':[2,3,1,'fields'],
  'b12b5251-69b4-5108-8d10-d05406a1f9aa':[3,3,1,'farm']
};
function el<T extends HTMLElement=HTMLElement>(id:string){return document.getElementById(id) as T}
function pairs(stats:Stats){return Object.entries(stats).map(([key,value])=>value+' '+key).join(', ')||'None'}
async function boot(){
  const response=await fetch('/api/catalog');
  if (!response.ok) throw new Error('The SQLite catalog could not be loaded.');
  const c:Catalog=await response.json();
  let run=fresh(c);
  const board=el('board'),tip=el('tip'),stats=el('stats');
  const nodes=new Map<string,HTMLButtonElement>();
  let inspected:Action|null=null;
  let last=0;
  el('character').textContent=c.character.name;
  el('targets').textContent=pairs(c.rules.survivalMinimums);
  el('max').textContent=c.rules.timeBudgetHours+' H';
  el('time').setAttribute('aria-valuemax',String(c.rules.timeBudgetHours));
  function drawer(open:boolean){
    stats.hidden=!open;el('menu').setAttribute('aria-expanded',String(open)); hide();
    if(open) el('close').focus(); else el('menu').focus();
  }
  el('menu').onclick=()=>drawer(stats.hidden);
  el('close').onclick=()=>drawer(false);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!stats.hidden)drawer(false); hide()}});
  document.addEventListener('click',e=>{if(!stats.hidden && !(e.target as Element).closest('#stats,#menu'))drawer(false)});
  function hide(){inspected=null;tip.hidden=true}
  function inspect(a:Action){
    inspected=a;
    const needs=a.prerequisiteIds.map(id=>c.actions.find(t=>t.id===id)!.name).join(', ');
    const fields={
      Prerequisites:needs||'None',Minimums:pairs(a.requiredStats),'Start cost':pairs(a.cost),
      'Beneficial stats':Object.entries(a.beneficialStats).map(([k,v])=>v.join(' + ')+' → '+k).join(', ')||'None',
      'Rep bonus':pairs(a.bonus),'Cycle bonus':pairs(a.completion),
      Cycles:(run.progress[a.id]?.cyclesCompleted??0)+(a.repeatable?' completed · repeatable':' completed · one time')
    };
    tip.replaceChildren();
    for(const [tag,value] of [['strong',a.name],['p',a.desc],...Object.entries(fields).map(([k,v])=>['div',k+' · '+v])]){
      const part=document.createElement(tag);part.textContent=value;tip.append(part);
    }
    tip.hidden=false;
    const box=nodes.get(a.id)!.getBoundingClientRect();
    tip.style.left=Math.max(5,Math.min(innerWidth-tip.offsetWidth-5,box.left))+'px';
    const y=box.bottom+8;
    tip.style.top=Math.max(5,y+tip.offsetHeight<=innerHeight?y:box.top-tip.offsetHeight-8)+'px';
  }
  for(const a of c.actions){
    const n=document.createElement('button');
    const pos=positions[a.id];
    if(pos){n.style.gridColumn=pos[0]+' / span '+pos[2];n.style.gridRow=String(pos[1])}
    n.className='node';
    n.innerHTML='<span class="badge"></span><svg aria-hidden="true" class="art" viewBox="-75 -108 150 165">'+structure(pos?.[3]??'home')+'</svg><strong></strong><span class="meta duration"></span><span class="meta reps"></span><svg class="ring" aria-hidden="true"><rect x="1" y="1" pathLength="100" style="width:calc(100% - 2px);height:calc(100% - 2px)"/></svg>';
    n.querySelector('strong')!.textContent=a.name;
    n.querySelector('.duration')!.textContent='◷ '+a.durationHours+' h';
    n.onmouseenter=n.onfocus=()=>inspect(a);
    n.onmouseleave=n.onblur=hide;
    n.onclick=()=>{
      if(start(run,a)){
        last=performance.now();hide();el('message').textContent=a.name+' in progress.';render();requestAnimationFrame(frame);
      } else inspect(a);
    };
    nodes.set(a.id,n);board.append(n);
  }
  // Draw each dependency on the common axis of the two cards' facing sides.
  function edges(){
    const svg=document.getElementById('edges')!;
    let markup='';
    for(const a of c.actions) for(const id of a.prerequisiteIds){
      const p=nodes.get(id)!,q=nodes.get(a.id)!;
      const horizontal=p.offsetTop===q.offsetTop;
      const forward=horizontal?q.offsetLeft>p.offsetLeft:q.offsetTop>p.offsetTop;
      const sign=forward?1:-1;
      let x1,y1,x2,y2;
      if(horizontal){
        x1=p.offsetLeft+(forward?p.offsetWidth:0);x2=q.offsetLeft+(forward?0:q.offsetWidth);
        y1=y2=p.offsetTop+p.offsetHeight/2;
      }else{
        y1=p.offsetTop+(forward?p.offsetHeight:0);y2=q.offsetTop+(forward?0:q.offsetHeight);
        x1=x2=(Math.max(p.offsetLeft,q.offsetLeft)+Math.min(p.offsetLeft+p.offsetWidth,q.offsetLeft+q.offsetWidth))/2;
      }
      const color=run.progress[id]?.cyclesCompleted?'#82baf0':'#677781';
      const head=horizontal?[x2-7*sign,y2-4,x2-7*sign,y2+4]:[x2-4,y2-7*sign,x2+4,y2-7*sign];
      markup+='<line x1="'+x1+'" x2="'+x2+'" y1="'+y1+'" y2="'+y2+'" stroke="'+color+'"/><polygon points="'+[x2,y2,...head].join(' ')+'" fill="'+color+'"/>';
    }
    svg.innerHTML=markup;
  }
  new ResizeObserver(edges).observe(board);
  window.addEventListener('scroll',hide,true);
  function meters(){
    el('hours').textContent=String(Math.ceil(run.hoursLeft*10)/10);
    el('time').setAttribute('aria-valuenow',String(Math.ceil(run.hoursLeft)));
    el('fill').style.transform='scaleX('+(run.hoursLeft/c.rules.timeBudgetHours||0)+')';
    if(run.activeRep){
      const a=c.actions.find(a=>a.id===run.activeRep!.actionId)!;
      const ring=nodes.get(a.id)!.querySelector('rect[pathLength]')!;
      ring.setAttribute('stroke-dasharray','100');ring.setAttribute('stroke-dashoffset',String(100*run.activeRep.hoursLeft/a.durationHours));
    }
  }
  function render(){
    for(const a of c.actions){
      const n=nodes.get(a.id)!,p=run.progress[a.id];
      const reason=block(run,a),active=run.activeRep?.actionId===a.id;
      const state=active?'active':reason==='Complete'?'complete':reason?'locked':'ready';
      n.className='node '+state;n.setAttribute('aria-disabled',String(!!reason));
      n.querySelector('.badge')!.textContent=active?'In progress':reason||'Ready';
      const reps=p?.cyclesCompleted && !a.repeatable?a.repsRequired:p?.repsDone??0;
      n.querySelector('.reps')!.textContent=reps+'/'+a.repsRequired+' reps';
      n.querySelector<SVGElement>('.ring')!.style.display=active?'block':'none';
    }
    el('values').replaceChildren();
    for(const key of c.statKeys){
      const term=document.createElement('dt'),value=document.createElement('dd');
      term.textContent=key;value.textContent=String(run.character.stats[key]??0);el('values').append(term,value);
    }
    if(run.outcome!=='playing') el('message').textContent=run.outcome==='won'?'The settlement survived the wave.':'The wave overwhelmed the settlement.';
    el('restart').hidden=run.outcome==='playing';
    meters();edges();if(inspected)inspect(inspected);
  }
  function frame(now:number){
    if(!run.activeRep)return;
    const a=c.actions.find(a=>a.id===run.activeRep!.actionId)!;
    tick(run,c,(now-last)/400);last=now;
    if(run.activeRep){meters();requestAnimationFrame(frame)}
    else{el('message').textContent=a.name+' · rep finished.';render()}
  }
  function initial(){
    run=fresh(c);el('message').textContent='Select a ready action to begin.';render();
  }
  el('restart').onclick=initial;initial();
}
boot().catch(error=>{el('message').textContent=error.message});
