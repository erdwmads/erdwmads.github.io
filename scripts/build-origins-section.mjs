import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildSectionGeometry} from '../src/scripts/origins-study/section-geometry.js';
// GLTFExporter uses FileReader to package the standard binary glTF container.
globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const source=buildSectionGeometry(),geometry=mergeVertices(source),mesh=new T.Mesh(geometry,new T.MeshStandardMaterial());mesh.name='Illustrative porous matrix';
const glb=await new GLTFExporter().parseAsync(mesh,{binary:true});
await fs.mkdir('public/assets/models/origins',{recursive:true});await fs.writeFile('public/assets/models/origins/porous-matrix.glb',Buffer.from(glb));
console.log(`Baked illustrative matrix: ${geometry.attributes.position.count} vertices, ${(glb.byteLength/1024).toFixed(0)} KiB. No sample measurements represented.`);
source.dispose();geometry.dispose();mesh.material.dispose();
