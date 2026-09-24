// Lossless OBJ -> GLB re-encoding for measured asteroid shape models.
// Vertex positions stay float32 (the precision OBJLoader produced) and faces keep
// their original order, so the runtime can rebuild exactly the geometry the OBJ
// path rendered. No normals, UVs or materials are added.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const align4 = (value) => (value + 3) & ~3;

export function objToGlb(text, { name = "shape", copyright } = {}) {
  const positions = [];
  const indices = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "v") {
      positions.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
    } else if (parts[0] === "vn" || parts[0] === "vt") {
      // Shading data would be lost by this position-only encoding, so refuse rather than degrade it.
      throw new Error(`OBJ ${parts[0]} data is not supported by this lossless re-encoding`);
    } else if (parts[0] === "f") {
      const count = positions.length / 3;
      const face = parts.slice(1).filter(Boolean).map((token) => {
        if (token.includes("/")) throw new Error("OBJ faces that reference texture coordinates or normals are not supported");
        const index = parseInt(token, 10);
        return index < 0 ? count + index : index - 1;
      });
      // Same fan triangulation as three.js OBJLoader.
      for (let i = 1; i + 1 < face.length; i++) indices.push(face[0], face[i], face[i + 1]);
    }
  }

  const vertexCount = positions.length / 3;
  if (!vertexCount || !indices.length) throw new Error("OBJ contains no vertices or faces");
  if (indices.some((index) => index < 0 || index >= vertexCount)) throw new Error("OBJ face references a missing vertex");

  const positionArray = new Float32Array(positions);
  // WebGL2 always restarts primitives at 0xFFFF, so 16-bit indices must stay below it.
  const indexArray = vertexCount < 0xffff ? new Uint16Array(indices) : new Uint32Array(indices);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  positionArray.forEach((value, i) => {
    min[i % 3] = Math.min(min[i % 3], value);
    max[i % 3] = Math.max(max[i % 3], value);
  });

  const positionBytes = Buffer.from(positionArray.buffer);
  const indexBytes = Buffer.from(indexArray.buffer);
  const indexOffset = align4(positionBytes.length);
  const bin = Buffer.alloc(align4(indexOffset + indexBytes.length));
  positionBytes.copy(bin, 0);
  indexBytes.copy(bin, indexOffset);

  const gltf = {
    asset: { version: "2.0", generator: "erdwmads.github.io scripts/shape-model-glb.mjs", ...(copyright ? { copyright } : {}) },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name }],
    meshes: [{ name, primitives: [{ attributes: { POSITION: 0 }, indices: 1, mode: 4 }] }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: vertexCount, type: "VEC3", min, max },
      { bufferView: 1, componentType: indexArray instanceof Uint16Array ? 5123 : 5125, count: indexArray.length, type: "SCALAR" }
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positionBytes.length, target: 34962 },
      { buffer: 0, byteOffset: indexOffset, byteLength: indexBytes.length, target: 34963 }
    ],
    buffers: [{ byteLength: bin.length }]
  };

  const jsonText = JSON.stringify(gltf);
  const json = Buffer.alloc(align4(Buffer.byteLength(jsonText)), 0x20);
  json.write(jsonText);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(data.length, 0);
    head.writeUInt32LE(type, 4);
    return Buffer.concat([head, data]);
  };
  return Buffer.concat([header, chunk(0x4e4f534a, json), chunk(0x004e4942, bin)]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error("Usage: node scripts/shape-model-glb.mjs <input.obj> <output.glb>");
    process.exit(1);
  }
  const glb = objToGlb(fs.readFileSync(input, "utf8"), { name: path.basename(output, ".glb") });
  fs.writeFileSync(output, glb);
  console.log(`Wrote ${output} (${glb.length} bytes)`);
}
