export type Stats = Record<string,number>;
export interface Action {
  id:string; name:string; desc:string; prerequisiteIds:string[]; durationHours:number;
  cost:Stats; requiredStats:Stats; beneficialStats:Record<string,string[]>; bonus:Stats; completion:Stats;
  repsRequired:number; repeatable:boolean;
}
export interface Catalog {
  actions:Action[]; statKeys:string[]; character:{id:string; name:string; stats:Stats};
  rules:{timeBudgetHours:number; survivalMinimums:Stats};
}
export interface Run {
  character:Catalog['character']; hoursLeft:number; activeRep:{actionId:string;hoursLeft:number}|null;
  progress:Record<string,{repsDone:number;cyclesCompleted:number}>; outcome:'playing'|'won'|'lost';
}
export function fresh(c:Catalog):Run {
  const run:Run = {character:structuredClone(c.character),hoursLeft:c.rules.timeBudgetHours,activeRep:null,progress:{},outcome:'playing'};
  if (!run.hoursLeft) resolve(run,c);
  return run;
}
export function block(run:Run,a:Action) {
  if (run.outcome !== 'playing') return 'Run ended';
  if (a.prerequisiteIds.some(id=>!run.progress[id]?.cyclesCompleted)) return 'Locked';
  if (!a.repeatable && run.progress[a.id]?.cyclesCompleted) return 'Complete';
  for (const group of [a.requiredStats,a.cost]) {
    for (const [key,value] of Object.entries(group)) if ((run.character.stats[key]??0)<value) return 'Need '+value+' '+key;
  }
  return run.activeRep ? 'Busy' : '';
}
function grant(stats:Stats,effects:Stats,sign=1) {
  for (const [key,amount] of Object.entries(effects)) stats[key]=(stats[key]??0)+sign*amount;
}
export function start(run:Run,a:Action) {
  if (block(run,a)) return false;
  grant(run.character.stats,a.cost,-1);
  run.activeRep={actionId:a.id,hoursLeft:a.durationHours};
  return true;
}
function resolve(run:Run,c:Catalog) {
  run.activeRep=null;
  run.outcome=Object.entries(c.rules.survivalMinimums).every(([k,v])=>(run.character.stats[k]??0)>=v)?'won':'lost';
}
export function tick(run:Run,c:Catalog,delta:number) {
  const rep=run.activeRep;
  if (!rep || delta<=0) return;
  const step=Math.min(rep.hoursLeft,run.hoursLeft,delta);
  rep.hoursLeft-=step;
  run.hoursLeft-=step;
  if (rep.hoursLeft<1e-8) {
    const a=c.actions.find(a=>a.id===rep.actionId)!;
    const rewards={...a.bonus};
    for (const [key,skills] of Object.entries(a.beneficialStats))
      for (const skill of skills) rewards[key]+=(run.character.stats[skill]??0);
    grant(run.character.stats,rewards);
    const p=run.progress[a.id]??={repsDone:0,cyclesCompleted:0};
    if (++p.repsDone===a.repsRequired) {
      p.repsDone=0; p.cyclesCompleted++;
      grant(run.character.stats,a.completion);
    }
    run.activeRep=null;
  }
  if (run.hoursLeft<1e-8) {run.hoursLeft=0; resolve(run,c);}
}
