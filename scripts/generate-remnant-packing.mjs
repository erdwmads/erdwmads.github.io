import {writeFileSync} from 'node:fs';
import {inheritance} from '../src/scripts/origins-study/scenes.js';
import {computeRemnantPacking} from '../src/scripts/origins-study/inheritance-dynamics.js';
const scene=inheritance(),parts=scene.group.userData.fragments;
computeRemnantPacking(parts);
writeFileSync(new URL('../src/scripts/origins-study/remnant-packing.js',import.meta.url),'// Face-contact packing for fracturedBody(65,64); generated offline.\nexport const remnantPacking='+JSON.stringify(parts.map(p=>p.preserved?p.target.toArray():null))+';\n');
console.log('Regenerated contact positions; run finale.test.mjs before using this geometry.');
