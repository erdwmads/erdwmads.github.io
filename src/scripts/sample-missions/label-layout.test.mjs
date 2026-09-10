import test from 'node:test';
import assert from 'node:assert/strict';
import {placeLabel} from './label-layout.js';
test('labels clear the desktop/mobile inset and each other',()=>{
 for(const width of [350,1200]){
  const occupied=[{x:12,y:12,width:width<400?100:144,height:width<400?100:144}];
  for(const p of [[115,140],[10,35],[140,140]]){
   const b=placeLabel(...p,155,36,occupied,{width,height:430});
   assert(b.x>=10&&b.x+b.width<=width-10&&b.y>=12&&b.y+b.height<=385);
   assert(occupied.every(a=>b.x>=a.x+a.width||b.x+b.width<=a.x||b.y>=a.y+a.height||b.y+b.height<=a.y));occupied.push(b);
  }
 }
});
