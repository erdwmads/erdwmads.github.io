// Simplifies a measured asteroid shape model (GLB, one indexed triangle mesh) to a web-sized
// triangle budget with meshoptimizer's quadric simplifier, keeping the source frame and units.
// The source node transform is ignored on purpose: positions stay in the body-fixed frame
// (z = spin axis), the same convention as the JAXA Ryugu model, so both render the same way.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MeshoptSimplifier } from "three/addons/libs/meshopt_simplifier.module.js";
import { meshToGlb } from "./shape-model-glb.mjs";

const COMPONENTS = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };

export function readGlbMesh(bytes) {
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const binStart = 20 + jsonLength + 8;
  const primitives = gltf.meshes.flatMap((mesh) => mesh.primitives);
  if (primitives.length !== 1) throw new Error("Expected exactly one primitive");
  const read = (accessorIndex) => {
    const accessor = gltf.accessors[accessorIndex], view = gltf.bufferViews[accessor.bufferView];
    const Type = COMPONENTS[accessor.componentType], width = accessor.type === "VEC3" ? 3 : 1;
    if (view.byteStride && view.byteStride !== width * Type.BYTES_PER_ELEMENT) throw new Error("Interleaved buffers are not supported");
    const offset = binStart + (view.byteOffset || 0) + (accessor.byteOffset || 0);
    return new Type(bytes.buffer.slice(bytes.byteOffset + offset, bytes.byteOffset + offset + accessor.count * width * Type.BYTES_PER_ELEMENT));
  };
  const [primitive] = primitives;
  if (primitive.extensions) throw new Error("Compressed primitives are not supported");
  return { positions: read(primitive.attributes.POSITION), indices: Uint32Array.from(read(primitive.indices)) };
}

export const meshVolume = (positions, indices) => {
  let volume = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i] * 3, indices[i + 1] * 3, indices[i + 2] * 3];
    volume += (positions[a] * (positions[b + 1] * positions[c + 2] - positions[b + 2] * positions[c + 1])
      - positions[a + 1] * (positions[b] * positions[c + 2] - positions[b + 2] * positions[c])
      + positions[a + 2] * (positions[b] * positions[c + 1] - positions[b + 1] * positions[c])) / 6;
  }
  return Math.abs(volume);
};

export async function simplifyShape({ positions, indices }, targetTriangles) {
  await MeshoptSimplifier.ready;
  const [simplified, error] = MeshoptSimplifier.simplify(indices, positions, 3, targetTriangles * 3, 1);
  // Drop unused vertices and number the rest in first-use order.
  const [remap, vertexCount] = MeshoptSimplifier.compactMesh(simplified);
  const compact = new Float32Array(vertexCount * 3);
  for (let i = 0; i < remap.length; i++) if (remap[i] !== 0xffffffff) compact.set(positions.subarray(i * 3, i * 3 + 3), remap[i] * 3);
  // meshoptimizer reports the error relative to the mesh extent; convert it to source units.
  return { positions: compact, indices: simplified, absoluteError: error * MeshoptSimplifier.getScale(positions, 3) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, output, target = "49152", ...copyright] = process.argv.slice(2);
  if (!input || !output) {
    console.error("Usage: node scripts/simplify-shape-model.mjs <input.glb> <output.glb> [targetTriangles] [copyright…]");
    process.exit(1);
  }
  const source = readGlbMesh(fs.readFileSync(input));
  const result = await simplifyShape(source, Number(target));
  const glb = meshToGlb(result.positions, result.indices, { name: path.basename(output, ".glb"), copyright: copyright.join(" ") || undefined, generator: "simplify-shape-model.mjs" });
  fs.writeFileSync(output, glb);
  const diameter = (positions, indices) => Math.cbrt(meshVolume(positions, indices) * 6 / Math.PI);
  console.log(JSON.stringify({
    sourceTriangles: source.indices.length / 3, triangles: result.indices.length / 3, vertices: result.positions.length / 3, bytes: glb.length, absoluteError: result.absoluteError,
    sourceEquivalentDiameter: diameter(source.positions, source.indices), equivalentDiameter: diameter(result.positions, result.indices)
  }));
}
