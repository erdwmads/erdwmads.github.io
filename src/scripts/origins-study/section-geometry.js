import * as T from 'three';
import {Brush,Evaluator,SUBTRACTION} from 'three-bvh-csg';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {clastGeometry,sectionRelief} from './materials.js';
import {poreLayout} from './pore-layout.js';
// Offline-only construction. The browser loads the resulting indexed GLB.
export function buildSectionGeometry(){
  const outerGeo=clastGeometry(91,24);outerGeo.scale(2.6,2.05,1.6);
  const evaluator=new Evaluator();evaluator.attributes=['position','normal'];evaluator.useGroups=false;
  let rock=new Brush(outerGeo);rock.updateMatrixWorld();
  const cut=new Brush(new T.BoxGeometry(8,8,5));cut.position.z=2.64;cut.updateMatrixWorld();
  rock=evaluator.evaluate(rock,cut,SUBTRACTION);rock.updateMatrixWorld();
  const {cavities,poreGeometries}=poreLayout();
  for(let i=0;i<cavities.length;i++){const[x,y]=cavities[i];const pore=new Brush(poreGeometries[i]);pore.position.set(x,y,.14);pore.updateMatrixWorld();rock=evaluator.evaluate(rock,pore,SUBTRACTION);rock.updateMatrixWorld();}
  // Closed, tapered cutters remove actual rock. No line mesh is rendered above the section.
  const fissures=[[[ -.86,.62],[-.65,.74],[-.38,.86]],[[.60,.42],[.47,.28],[.34,.15]],[[.1,-.63],[-.06,-.37],[-.1,-.1]]];
  for(const path of fissures)for(let j=0;j<path.length-1;j++){
    const a=new T.Vector3(...path[j],.2),b=new T.Vector3(...path[j+1],.2),side=new T.Vector3(-(b.y-a.y),b.x-a.x,0).normalize(),points=[];
    for(const [p,w] of [[a,.007],[b,j===path.length-2?.0015:.006]]){points.push(p.clone().addScaledVector(side,w),p.clone().addScaledVector(side,-w),new T.Vector3(p.x,p.y,.045));}
    const cutter=new Brush(new ConvexGeometry(points));cutter.updateMatrixWorld();
    const previous=rock;rock=evaluator.evaluate(rock,cutter,SUBTRACTION);rock.updateMatrixWorld();previous.geometry.dispose();cutter.geometry.dispose();
  }
  const cutGeometry=rock.geometry,geometry=sectionRelief(cutGeometry);cutGeometry.dispose();
  poreGeometries.forEach(g=>g.dispose());outerGeo.dispose();cut.geometry.dispose();
  return geometry;
}
