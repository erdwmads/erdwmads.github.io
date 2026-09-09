import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,OrthographicCamera,PerspectiveCamera} from 'three';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {syncOcclusionCamera} from './occlusion.js';
for(const camera of [new OrthographicCamera(-2,2,2,-2,.01,100),new PerspectiveCamera(42,1,.04,100)])test(camera.type+' occlusion follows zoom, projection and depth mode',()=>{const pass=new SSAOPass(new Scene(),camera,1,1);syncOcclusionCamera(pass,camera);assert.equal(pass.ssaoMaterial.defines.PERSPECTIVE_CAMERA,camera.isPerspectiveCamera?1:0);const before=pass.ssaoMaterial.uniforms.cameraProjectionMatrix.value.clone();camera.zoom=5.8;camera.updateProjectionMatrix();syncOcclusionCamera(pass,camera);assert.notDeepEqual(pass.ssaoMaterial.uniforms.cameraProjectionMatrix.value.elements,before.elements);assert.deepEqual(pass.ssaoMaterial.uniforms.cameraProjectionMatrix.value.elements,camera.projectionMatrix.elements);assert.deepEqual(pass.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.elements,camera.projectionMatrixInverse.elements);pass.dispose();});
