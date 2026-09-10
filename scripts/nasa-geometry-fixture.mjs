import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import * as THREE from 'three';

// Decode the checked-in NASA model in Node so geometry regressions do not need WebGL.
export async function loadNasaGeometry() {
  const directory = new URL('../public/assets/data/missions/', import.meta.url);
  const wasmBinary = await readFile(new URL('draco/draco_decoder.wasm', directory));
  const source = await readFile(new URL('draco/draco_wasm_wrapper.js', directory), 'utf8');
  const context = { module: { exports: {} }, exports: {}, require: createRequire(import.meta.url), process, console, Buffer, TextDecoder, WebAssembly, setTimeout, clearTimeout, __dirname: '' };
  vm.runInNewContext(source, context);
  const draco = await context.module.exports({ wasmBinary });
  const bytes = await readFile(new URL('osiris-rex-nasa.glb', directory));
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  const binaryStart = 28 + jsonLength;
  const model = new THREE.Group(), sourceGroup = new THREE.Group();
  sourceGroup.scale.fromArray(gltf.nodes[1].scale);
  model.add(sourceGroup);
  const decoder = new draco.Decoder();
  for (const primitive of gltf.meshes[0].primitives) {
    const extension = primitive.extensions.KHR_draco_mesh_compression;
    const view = gltf.bufferViews[extension.bufferView];
    const buffer = new draco.DecoderBuffer();
    const data = bytes.subarray(binaryStart + (view.byteOffset || 0), binaryStart + (view.byteOffset || 0) + view.byteLength);
    buffer.Init(data, data.length);
    const decoded = new draco.Mesh();
    const status = decoder.DecodeBufferToMesh(buffer, decoded);
    if (!status.ok()) throw new Error(status.error_msg());
    const geometry = new THREE.BufferGeometry();
    for (const [semantic, id] of Object.entries(extension.attributes)) {
      const attribute = decoder.GetAttributeByUniqueId(decoded, id);
      const values = new draco.DracoFloat32Array();
      decoder.GetAttributeFloatForAllPoints(decoded, attribute, values);
      const array = Float32Array.from({length: values.size()}, (_, index) => values.GetValue(index));
      geometry.setAttribute(semantic === 'POSITION' ? 'position' : 'normal', new THREE.BufferAttribute(array, attribute.num_components()));
      draco.destroy(values);
    }
    const face = new draco.DracoInt32Array(), indices = [];
    for (let i = 0; i < decoded.num_faces(); i++) {
      decoder.GetFaceFromMesh(decoded, i, face);
      indices.push(face.GetValue(0), face.GetValue(1), face.GetValue(2));
    }
    geometry.setIndex(indices);
    const material = new THREE.MeshStandardMaterial();
    material.name = gltf.materials[primitive.material].name;
    sourceGroup.add(new THREE.Mesh(geometry, material));
    draco.destroy(face); draco.destroy(decoded); draco.destroy(buffer);
  }
  draco.destroy(decoder);
  return model;
}
