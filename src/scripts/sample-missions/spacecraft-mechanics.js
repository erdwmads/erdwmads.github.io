import * as THREE from 'three';

// Partition triangles without deforming the authored source vertices. Compact
// attributes keep bounds correct after the two source wings move independently.
export function partitionMesh(mesh, classify) {
  const source = mesh.geometry, indices = source.index;
  const position = source.attributes.position, buckets = new Map();
  const point = new THREE.Vector3(), center = new THREE.Vector3();
  mesh.updateWorldMatrix(true, false);
  const count = indices ? indices.count : position.count;
  for (let i = 0; i < count; i += 3) {
    const triangle = [0, 1, 2].map(offset => indices ? indices.getX(i + offset) : i + offset);
    center.set(0, 0, 0);
    for (const index of triangle) center.add(point.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld));
    const key = classify(center.multiplyScalar(1 / 3));
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(...triangle);
  }
  if (buckets.size === 1) return [[buckets.keys().next().value, mesh]];
  const parts = [];
  for (const [key, triangles] of buckets) {
    const remap = new Map(), vertices = [], compactIndices = [];
    for (const index of triangles) {
      if (!remap.has(index)) { remap.set(index, vertices.length); vertices.push(index); }
      compactIndices.push(remap.get(index));
    }
    const geometry = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(source.attributes)) {
      const values = new attribute.array.constructor(vertices.length * attribute.itemSize);
      vertices.forEach((oldIndex, newIndex) => {
        for (let component = 0; component < attribute.itemSize; component++) values[newIndex * attribute.itemSize + component] = attribute.array[oldIndex * attribute.itemSize + component];
      });
      geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize, attribute.normalized));
    }
    geometry.setIndex(compactIndices);
    const part = new THREE.Mesh(geometry, mesh.material);
    part.name = mesh.name;
    part.position.copy(mesh.position); part.quaternion.copy(mesh.quaternion); part.scale.copy(mesh.scale);
    part.castShadow = mesh.castShadow; part.receiveShadow = mesh.receiveShadow;
    mesh.parent.add(part);
    parts.push([key, part]);
  }
  mesh.removeFromParent();
  source.dispose();
  return parts;
}

export function hingeNasaArrays(model, root) {
  const wings = [-1, 1].map(side => {
    const hinge = new THREE.Group();
    hinge.name = `${side < 0 ? 'port' : 'starboard'}-solar-hinge`;
    hinge.position.set(side * .69, -.313, 0);
    root.add(hinge);
    return hinge;
  });
  const meshes = [];
  model.traverse(object => { if (object.isMesh) meshes.push(object); });
  for (const mesh of meshes) {
    for (const [side, part] of partitionMesh(mesh, point => point.x < -.69 ? -1 : point.x > .69 ? 1 : 0)) {
      if (side) wings[side < 0 ? 0 : 1].attach(part);
    }
  }
  return amount => {
    const fold = (1 - THREE.MathUtils.clamp(amount, 0, 1)) * Math.PI / 2;
    wings[0].rotation.z = -fold;
    wings[1].rotation.z = fold;
  };
}
