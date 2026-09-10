import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
let prepared;
export async function loadSectionGeometry(){
  prepared??=new GLTFLoader().loadAsync('assets/models/origins/porous-matrix.glb?v=20260910-relief').then(({scene})=>{
    let geometry;
    scene.traverse(node=>{if(node.isMesh){geometry=node.geometry;node.material.dispose();}});
    return geometry;
  }).catch(error=>{prepared=undefined;throw error;});
  return (await prepared).clone();
}
