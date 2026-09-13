const bounded=(value,min,max)=>Math.min(max,Math.max(min,value));
export function fitImage(width,height,viewportWidth,viewportHeight){
 const scale=Math.min(viewportWidth/width,viewportHeight/height);
 return {width:width*scale,height:height*scale};
}
export function clampView(view,fitted,width,height){
 const zoom=bounded(view.zoom,1,4),limitX=Math.max(0,(fitted.width*zoom-width)/2),limitY=Math.max(0,(fitted.height*zoom-height)/2);
 return {zoom,x:bounded(view.x,-limitX,limitX),y:bounded(view.y,-limitY,limitY)};
}
export function zoomView(view,zoom,fitted,width,height){
 return clampView({zoom,x:view.x*zoom/view.zoom,y:view.y*zoom/view.zoom},fitted,width,height);
}
export function frameRegion(region,fitted,width,height){
 const centres={optical:[.25,.25],'sem-overview':[.75,.25],'sem-fragment':[.25,.75],'sem-detail':[.75,.75]};
 if(!centres[region])return {zoom:1,x:0,y:0};
 const [x,y]=centres[region],zoom=2;
 return clampView({zoom,x:(.5-x)*fitted.width*zoom,y:(.5-y)*fitted.height*zoom},fitted,width,height);
}
