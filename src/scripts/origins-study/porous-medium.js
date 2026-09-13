import {rng} from './materials.js';
import {smooth} from './timeline.mjs';
import {insideSection,fabricAt} from './breccia-fabric.js';
export {insideSection} from './breccia-fabric.js';
export function createPorousMedium(seed=2309){
 const random=rng(seed),step=.088,grains=[],sites=[],links=[],grid=new Map();
 for(let row=-18;row<=18;row++)for(let col=-27;col<=27;col++){
  const x=col*step+(random()-.5)*step*.92,y=row*step+(random()-.5)*step*.92;
  if(insideSection(x/.99,y/.99))grains.push({x,y,z:-.012+(random()-.5)*.018,radius:.015+Math.pow(random(),1.6)*.043,rotation:random()*6.28,tone:.66+random()*.42});
  const px=(col+.5)*step+(random()-.5)*step*.86,py=(row+.5)*step+(random()-.5)*step*.86;
  if(!insideSection(px/.975,py/.975))continue;
  const fabric=fabricAt(px,py),hasIce=random()<.12+fabric.porosity*.58;
  grid.set(col+','+row,sites.length);
  sites.push({x:px,y:py,z:.022,radius:.012+random()*.024*(.4+fabric.porosity*.75),ice:hasIce?1:0,onset:.05+random()*.11+fabric.porosity*.09,arrival:Infinity,rotation:random()*6.28,habit:Math.floor(random()*3),col,row});
 }
 for(const [a,s] of sites.entries())for(const [dx,dy]of[[1,0],[0,1]]){
  const b=grid.get((s.col+dx)+','+(s.row+dy));if(b!==undefined)links.push({a,b,cost:.028+random()*.026,bend:(random()-.5)*.02});
 }
 const neighbors=sites.map(()=>[]);for(const l of links){neighbors[l.a].push([l.b,l.cost]);neighbors[l.b].push([l.a,l.cost]);}
 sites.forEach(s=>{if(s.ice)s.arrival=s.onset+.08;});
 const used=new Uint8Array(sites.length);
 // Earliest local wetting from dispersed melting sources; illustrative graph travel, not a Darcy-flow solver.
 for(let k=0;k<sites.length;k++){
  let a=-1;for(let i=0;i<sites.length;i++)if(!used[i]&&(a<0||sites[i].arrival<sites[a].arrival))a=i;
  if(a<0||!Number.isFinite(sites[a].arrival))break;used[a]=1;
  for(const [b,cost]of neighbors[a])sites[b].arrival=Math.min(sites[b].arrival,sites[a].arrival+cost);
 }
 return {width:4.56,height:2.96,step,grains,sites,links};
}
export function localAlteration(site,t){
 const melt=smooth((t-site.onset)/.22);
 const wet=smooth((t-site.arrival)/.14);
 const reaction=smooth((t-site.arrival-.08)/.38);
 const crystal=smooth((t-site.arrival-.16)/.43);
 return {ice:site.ice*(1-melt),melt,water:wet*(1-.86*reaction),reaction,crystal};
}
