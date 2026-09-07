import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Box3, Vector3 } from 'three';
import { mineralModels, createMineralGroup } from '../src/scripts/planetary-minerals.js';

test('Named mineral examples have distinct, finite 3D geometry and sourced explanations', () => {
  assert.deepEqual(Object.keys(mineralModels), ['carbonate','matrix','sulfide']);
  for (const id of Object.keys(mineralModels)) {
    assert.match(mineralModels[id].source,/handbookofmineralogy/);
    const normal = createMineralGroup(id,false), detail = createMineralGroup(id,true);
    const a = new Box3().setFromObject(normal).getSize(new Vector3());
    const b = new Box3().setFromObject(detail).getSize(new Vector3());
    assert.ok(a.toArray().every(v=>Number.isFinite(v)&&v>0.1));
    assert.notDeepEqual(a.toArray(),b.toArray(),'Detail must change geometry, not only text');
    for (const group of [normal,detail]) group.traverse(node=>{node.geometry?.dispose(); node.material?.dispose();});
  }
});
