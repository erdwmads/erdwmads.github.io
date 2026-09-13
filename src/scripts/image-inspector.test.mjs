import test from 'node:test';
import assert from 'node:assert/strict';
import {fitImage,clampView,zoomView,frameRegion} from './image-inspector-geometry.js';
test('contain fit preserves the complete source including scale bars',()=>{
 assert.deepEqual(fitImage(1536,1120,800,600),{width:800,height:800*1120/1536});
 assert.deepEqual(fitImage(1536,1120,400,300),{width:400,height:400*1120/1536});
});
test('panning cannot uncover blank space beyond the enlarged image',()=>{
 assert.deepEqual(clampView({zoom:2,x:9999,y:-9999},{width:800,height:600},800,600),{zoom:2,x:400,y:-300});
 assert.deepEqual(clampView({zoom:1,x:30,y:40},{width:800,height:500},800,600),{zoom:1,x:0,y:0});
});
test('zoom preserves the viewed centre and resets pan when the full image fits',()=>{
 assert.deepEqual(zoomView({zoom:2,x:100,y:-50},3,{width:800,height:600},800,600),{zoom:3,x:150,y:-75});
 assert.deepEqual(zoomView({zoom:3,x:150,y:100},1,{width:800,height:600},800,600),{zoom:1,x:0,y:0});
});
test('region framing stays bounded and makes the requested quadrant visible',()=>{
 const fitted={width:800,height:600};
 assert.deepEqual(frameRegion('all',fitted,800,600),{zoom:1,x:0,y:0});
 const tl=frameRegion('optical',fitted,800,600),br=frameRegion('sem-detail',fitted,800,600);
 assert.ok(tl.x>0&&tl.y>0);assert.ok(br.x<0&&br.y<0);
 assert.deepEqual(clampView(tl,fitted,800,600),tl);
});
