import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fresh,start,advance,duration,ready,resolve,nextRun,reason,migrateSave} from '../dist/engine.js';
const complete=(s,id)=>{assert.equal(start(s,id),true,`${id}: ${reason(s,id)}`);advance(s,1000);};
test('a deliberate first-run route can discover, build, rescue, and survive',()=>{
 const s=fresh();
 for(const id of ['salvage','shelter','scout','supplies','harvest','crossing','rescue','salvage','barricade','barricade'])complete(s,id);
 assert.equal(s.time,140);assert.equal(s.people,3);assert.equal(s.defense,15);assert.equal(s.discovered.length,9);assert.equal(ready(s),true);resolve(s);assert.equal(s.outcome,'won');
});
test('costs, prerequisites, exclusivity, and hidden nodes cannot be bypassed',()=>{
 const s=fresh();assert.equal(start(s,'shelter'),false);assert.equal(start(s,'rescue'),false);assert.equal(start(s,'barricade'),false);
 assert.equal(start(s,'salvage'),true);assert.equal(start(s,'scout'),false);advance(s,12);complete(s,'shelter');assert.equal(s.scrap,6);assert.equal(start(s,'shelter'),false);
});
test('wave interrupts unfinished work and ends the run exactly once',()=>{
 const s=fresh();s.time=155;start(s,'salvage');advance(s,20);assert.equal(s.time,160);assert.equal(s.scrap,4);assert.equal(s.outcome,'lost');assert.equal(s.active,null);resolve(s);assert.equal(s.log.length,2);
});
test('idle time does not pass, and new runs carry knowledge and map memory',()=>{
 const s=fresh();advance(s,100);assert.equal(s.time,0);complete(s,'scout');resolve(s);const n=nextRun(s);assert.equal(n.run,2);assert.equal(n.knowledge,1);assert.ok(n.known.includes('fields'));assert.equal(n.discovered.includes('farm'),false);assert.ok(duration(n,'scout')<duration(s,'scout'));assert.equal(n.time,0);
});
test('completed farm improves repeat harvesting',()=>{
 const s=fresh();complete(s,'scout');complete(s,'salvage');complete(s,'harvest');complete(s,'cultivate');const previous=s.food;complete(s,'harvest');assert.equal(s.food-previous,12);
});

test('the fields must be explored before the separate farm can be restored',()=>{
 const s=fresh();complete(s,'scout');complete(s,'salvage');
 assert.ok(s.discovered.includes('fields'));assert.ok(!s.discovered.includes('farm'));
 assert.equal(start(s,'cultivate'),false);
 s.discovered.push('farm');assert.equal(reason(s,'cultivate'),'Explore the abandoned fields first');
 s.discovered=s.discovered.filter(id=>id!=='farm');
 complete(s,'harvest');assert.ok(s.discovered.includes('farm'));complete(s,'cultivate');
 const n=nextRun(s);assert.ok(n.known.includes('farm'));assert.equal(start(n,'cultivate'),false);
});
test('old farm saves preserve restored and active work without granting resources',()=>{
 for(const mode of ['scouted','harvested','restored','active']){
  const s=fresh();delete s.mapRevision;s.discovered.push('farm');s.known.push('farm');
  if(mode==='harvested')s.done.push('harvest');
  if(mode==='restored')s.done.push('cultivate');
  if(mode==='active')s.active={id:'cultivate',elapsed:3,total:18};
  migrateSave(s);assert.ok(s.discovered.includes('fields'));assert.ok(s.known.includes('fields'));
  assert.equal(s.discovered.includes('farm'),mode!=='scouted');assert.equal(s.food,4);assert.equal(s.scrap,4);
  if(mode==='active')assert.equal(s.active.elapsed,3);
  const snapshot=JSON.stringify(s);migrateSave(s);assert.equal(JSON.stringify(s),snapshot);
 }
});
