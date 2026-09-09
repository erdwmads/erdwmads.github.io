// SSAOPass does not update its projection uniforms when the camera changes.
export function syncOcclusionCamera(pass,camera){
  const perspective=camera.isPerspectiveCamera?1:0;
  for(const material of [pass.ssaoMaterial,pass.depthRenderMaterial]){
    if(material.defines.PERSPECTIVE_CAMERA!==perspective){material.defines.PERSPECTIVE_CAMERA=perspective;material.needsUpdate=true;}
    material.uniforms.cameraNear.value=camera.near;material.uniforms.cameraFar.value=camera.far;
  }
  pass.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix);
  pass.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);
}
