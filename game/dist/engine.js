export const WAVE_TIME = 160;
export const locations = [
  {id:'camp', name:'The old outpost', kind:'HOME', x:430,y:400, icon:'home', text:'A ranger station at the edge of the world. The roof leaks, but the walls are still standing. This could be a beginning.', restored:'The windows glow again. For the first time in a long time, this place feels like home.'},
  {id:'yard', name:'Scrap yard', kind:'SCAVENGE', x:260,y:515, icon:'scrap', text:'Rusted trucks and forgotten machinery. There is something useful underneath all that ruin.'},
  {id:'ridge', name:'Lookout ridge', kind:'EXPLORE', x:300,y:255, icon:'tower', text:'Above the pines, an old fire tower watches over the valley. Climb it to see what the mist is hiding.'},
  {id:'fields', name:'Abandoned fields', kind:'EXPLORE', x:460,y:205, icon:'fields', text:'Weeds choke the old fields. Search for food and a way through to the farmhouse.'},
  {id:'farm', name:'Briar farm', kind:'REBUILD', x:620,y:205, icon:'farm', text:'Overgrown garden beds surround an empty farmhouse. A little care could make this land feed people again.', restored:'Green shoots break through the earth. Something here is growing instead of dying.'},
  {id:'bridge', name:'River crossing', kind:'EXPLORE', x:670,y:350, icon:'bridge', text:'A broken bridge cuts the valley in two. Repair the crossing to reach the settlement on the other bank.', restored:'Fresh planks span the river. The other side no longer feels so far away.'},
  {id:'depot', name:'Roadside depot', kind:'SCAVENGE', x:490,y:590, icon:'depot', text:'The last supply stop before the mountains. A faded sign promises fuel, food, and a better tomorrow.'},
  {id:'church', name:'St. Alder’s', kind:'SURVIVORS', x:825,y:230, icon:'church', text:'Three taps. Then three more. Someone is alive inside the old chapel, waiting for a reason to open the door.'},
  {id:'radio', name:'Relay station', kind:'REBUILD', x:850,y:490, icon:'radio', text:'If we can bring this transmitter online, the valley will know it is not alone.', restored:'A voice answers through the static. There are others out there. There is still a world to rebuild.'}
];
export const actions = {
  shelter:{node:'camp',label:'Restore the outpost',verb:'Restoring the outpost',time:18,cost:{scrap:6},gain:{defense:3},once:true,description:'Patch the roof. Light the windows. Make a home.'},
  barricade:{node:'camp',label:'Build barricades',verb:'Building barricades',time:14,cost:{scrap:5},gain:{defense:4},requires:'shelter',description:'Reinforce the perimeter with timber and sheet metal.'},
  salvage:{node:'yard',label:'Salvage materials',verb:'Salvaging materials',time:12,gain:{scrap:8},description:'Search the wreckage for useful building materials.'},
  scout:{node:'ridge',label:'Survey the valley',verb:'Surveying the valley',time:14,once:true,reveal:['fields','bridge','depot'],description:'Climb the tower and chart three new locations.'},
  harvest:{node:'fields',label:'Explore abandoned fields',verb:'Exploring abandoned fields',time:10,gain:{food:6},reveal:['farm'],description:'Gather what still grows around the abandoned fields.'},
  cultivate:{node:'farm',label:'Restore Briar farm',verb:'Reclaiming the farm',time:18,cost:{scrap:5},gain:{food:8,defense:1},once:true,requires:'harvest',description:'Restore the garden. Exploring the fields yields twice as much food.'},
  crossing:{node:'bridge',label:'Repair the crossing',verb:'Repairing the crossing',time:18,cost:{scrap:6},gain:{defense:1},once:true,reveal:['church','radio'],description:'Lay new planks and reveal the far side of the river.'},
  supplies:{node:'depot',label:'Search the storeroom',verb:'Searching the storeroom',time:12,gain:{scrap:5,food:3},description:'Pick through the shelves for food and spare parts.'},
  rescue:{node:'church',label:'Welcome the survivors',verb:'Bringing the survivors home',time:16,cost:{food:6},gain:{people:2,defense:3},once:true,description:'Share your provisions. Two people join your settlement.'},
  signal:{node:'radio',label:'Send a signal',verb:'Restoring the relay',time:20,cost:{scrap:8},gain:{defense:2},requires:'rescue',once:true,description:'Restore the relay and call for help. An optional stretch goal.'}
};
export function fresh(meta={}) {
  return {version:1,mapRevision:2,run:meta.run||1,knowledge:meta.knowledge||0,known:meta.known||[],scrap:4,food:4,people:1,defense:0,time:0,discovered:['camp','yard','ridge'],done:[],active:null,outcome:null,log:[{text:'You found an abandoned outpost. Start with what remains.',time:0}]};
}
export function duration(s,id){ return Math.round(actions[id].time/(1+s.knowledge*.12)*10)/10; }
export function reason(s,id){
  const a=actions[id];
  if (!a || !s.discovered.includes(a.node)) return 'Location undiscovered';
  if(s.outcome) return 'This expedition has ended';
  if(s.active) return 'Another task is in progress';
  if(a.once && s.done.includes(id)) return 'Completed';
  if(a.requires && !s.done.includes(a.requires)) return a.requires==='shelter'?'Restore the outpost first':a.requires==='harvest'?'Explore the abandoned fields first':'Find the survivors first';
  for(const [k,v] of Object.entries(a.cost||{})) if(s[k]<v) return `Need ${v} ${k}`;
  return '';
}
export function start(s,id){
  if(reason(s,id)) return false;
  for(const [k,v] of Object.entries(actions[id].cost||{})) s[k]-=v;
  s.active={id,elapsed:0,total:duration(s,id)};
  return true;
}
export function ready(s){return s.defense>=12 && s.people>=3;}
export function resolve(s){
  if(s.outcome) return;
  s.outcome=ready(s)?'won':'lost'; s.active=null;
  s.log.unshift({time:s.time,text:s.outcome==='won'?'The barricades held. A new day belongs to us.':'The wave broke our defenses. You escaped with what you learned.'});
}
export function advance(s,delta){
  if(!s.active||s.outcome||delta<=0) return;
  const task=s.active;
  const step=Math.min(delta,task.total-task.elapsed,WAVE_TIME-s.time);
  task.elapsed+=step; s.time+=step;
  if(task.elapsed>=task.total-0.00001){
    s.time=Math.round(s.time*1e6)/1e6;
    const a=actions[task.id];
    for(const [k,v] of Object.entries(a.gain||{})) s[k]+=v*(task.id==='harvest'&&s.done.includes('cultivate')?2:1);
    if(!s.done.includes(task.id))s.done.push(task.id);
    const revealed=(a.reveal||[]).filter(id=>!s.discovered.includes(id));
    s.discovered.push(...revealed);
    s.log.unshift({time:s.time,text:`${a.label} — complete.${revealed.length?' New locations charted.':''}`});
    s.log=s.log.slice(0,30); s.active=null;
  }
  if(s.time>=WAVE_TIME-0.00001)resolve(s);
}
export function nextRun(s){
  const earned=1+Math.floor(['shelter','cultivate','crossing','signal'].filter(id=>s.done.includes(id)).length/2);
  return fresh({run:s.run+1,knowledge:s.knowledge+earned,known:[...new Set([...s.known,...s.discovered])]});
}

// Preserve older runs while splitting their combined farm location into two sites.
export function migrateSave(s){
 if(s.mapRevision===2)return s;
 if(s.done.includes('cultivate')||s.active?.id==='cultivate'){
  if(!s.done.includes('harvest'))s.done.push('harvest');
 }
 for(const key of ['discovered','known']){
  if(s[key].includes('farm')&&!s[key].includes('fields'))s[key].push('fields');
 }
 if(!s.done.includes('harvest'))s.discovered=s.discovered.filter(id=>id!=='farm');
 if(s.done.includes('harvest')){
  for(const id of ['fields','farm'])if(!s.discovered.includes(id))s.discovered.push(id);
 }
 s.mapRevision=2;
 return s;
}
