import * as T from 'three';
import {stoneGeometry,rockMaterial} from './materials.js';
import {growthPopulation,grainPosition} from './growth-dynamics.js';
import {aggregateSurface} from './aggregate-surface.js';
import {smooth} from './timeline.mjs';
export function accretion(){
 const group=new T.Group(),population=growthPopulation(),material=rockMaterial(0x929b9e),geometry=stoneGeometry(120,1);
 const grains=new T.InstancedMesh(geometry,material,population.grains.length),o=new T.Object3D(),color=new T.Color();
 grains.name='accreting-grains';grains.instanceMatrix.setUsage(T.DynamicDrawUsage);grains.frustumCulled=false;group.add(grains);group.userData.population=population;
 const fines=aggregateSurface(rockMaterial(0x50574f),'aggregate-fine-material');group.add(fines.mesh);
 let previousPhase,previousT=-1;
 return{group,camera:[3.7,2.6,8.4],target:[0,0,0],update(t,phase){
  material.color.setHex(0x92958d);
  if(t!==previousT){if(t<=.58){fines.mesh.visible=false;}else{const points=population.grains.filter(p=>!p.escape).map(p=>grainPosition(p,population,t));fines.update(points,4.8-3.05*smooth((t-.44)/.52),.25,1.6*smooth((t-.58)/.32));}previousT=t;}
  population.grains.forEach((p,i)=>{
   o.position.fromArray(grainPosition(p,population,t));o.rotation.set(p.turn,p.turn*.7,p.turn*.3);o.scale.setScalar(p.radius);o.updateMatrix();grains.setMatrixAt(i,o.matrix);
   if(phase!==previousPhase){color.setHex(p.ice?(phase?0x7ccede:0xc2cac7):(phase&&p.escape?0xd3a56a:0xbfc0b8));grains.setColorAt(i,color);}
  });
  grains.instanceMatrix.needsUpdate=true;if(phase!==previousPhase)grains.instanceColor.needsUpdate=true;previousPhase=phase;
 },moment(t){return t<.36?'Many grains form loose aggregates':t<.70?'Particle concentrations bring aggregates together':t<.9?'Collective assembly of a porous body':'A coherent porous body · fine material occupies the interstices';},process(t){return t<.36?0:t<.70?1:2;}};
}
