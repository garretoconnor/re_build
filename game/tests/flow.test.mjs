import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCatalog} from '../catalog.mjs';
import {fresh,start,tick} from '../flow/run.ts';

test('multi-rep minimums, costs, benefit snapshots and permanent unlocks',()=>{
  const c=loadCatalog();
  const a={...c.actions[0],prerequisiteIds:[],requiredStats:{scrap:4},cost:{scrap:1},
    bonus:{food:2,scrap:1},beneficialStats:{food:['scrap']},completion:{people:2},
    repsRequired:2,repeatable:true};
  c.actions[0]=a;
  const child={...a,id:'child',prerequisiteIds:[a.id]};
  const r=fresh(c);
  r.character.stats.scrap=3;
  assert.equal(start(r,a),false);
  r.character.stats.scrap=4;
  for(let rep=0;rep<2;rep++){
    assert.equal(start(r,child),false);
    assert.equal(start(r,a),true);
    assert.equal(r.character.stats.scrap,3);
    assert.equal(start(r,a),false);
    tick(r,c,a.durationHours);
    assert.equal(r.character.stats.food,4+(rep+1)*5);
    assert.equal(r.character.stats.people,rep===0?1:3);
  }
  assert.equal(start(r,a),true);
  tick(r,c,a.durationHours);
  assert.equal(start(r,child),true);
});
test('final rewards precede the wave only when the rep finishes',()=>{
  const c=loadCatalog(),a=c.actions[0];
  for(const exact of [true,false]){
    const r=fresh(c);
    r.character.stats={scrap:6,defense:9,people:3};
    r.hoursLeft=a.durationHours-(exact?0:1);
    assert.equal(start(r,a),true);
    tick(r,c,100);
    assert.equal(r.outcome,exact?'won':'lost');
    assert.equal(r.hoursLeft,0);
    assert.equal(r.activeRep,null);
  }
});
