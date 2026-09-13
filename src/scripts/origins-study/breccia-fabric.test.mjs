import test from 'node:test';
import assert from 'node:assert/strict';
import {fabricAt,insideSection,sectionHeight} from './breccia-fabric.js';
test('recognisable lithic patches occupy a minority of a continuous fine matrix',()=>{
 let clast=0,n=0,high=0,low=0,hc=0,lc=0;
 for(let x=-2.2;x<2.2;x+=.025)for(let y=-1.5;y<1.5;y+=.025){if(!insideSection(x,y))continue;const f=fabricAt(x,y);clast+=f.clast;n++;if(f.clast>.9){high+=sectionHeight(x,y);hc++;}if(f.clast<.1){low+=sectionHeight(x,y);lc++;}}
 assert(clast/n>.1&&clast/n<.4,'Fine matrix must dominate instead of tessellated blocks covering the face');
 assert(Math.abs(high/hc-low/lc)<.0025,'Lithic domains must not all sit on raised pads');
});
