import {createMineralMap} from './mineral-map.js';

// Runs the same deterministic createMineralMap() off the main thread; the arrays are transferred, not copied.
self.onmessage=()=>{
 const {width,height,ids,rgba,fabricRGBA}=createMineralMap();
 self.postMessage({width,height,ids,rgba,fabricRGBA},[ids.buffer,rgba.buffer,fabricRGBA.buffer]);
};
