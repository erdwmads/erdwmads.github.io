// Rounded geographic locators. Recovery rings identify regions, not surveyed touchdown points.
export const missionLocations={
 'hayabusa2':{
  launch:{label:'Tanegashima Space Center · Japan',lat:30.4,lon:131.0,type:'Launch site',source:'https://www.isas.jaxa.jp/en/missions/spacecraft/current/hayabusa2.html'},
  landing:{label:'Woomera Prohibited Area · Australia',lat:-30.7,lon:135.6,type:'Recovery region',source:'https://global.jaxa.jp/press/2020/12/20201206-1_e.html'}
 },
 'osiris-rex':{
  launch:{label:'Cape Canaveral · SLC-41',lat:28.6,lon:-80.6,type:'Launch site',source:'https://svs.gsfc.nasa.gov/12716/'},
  landing:{label:'Utah Test and Training Range · USA',lat:40.4,lon:-113.2,type:'Recovery region',source:'https://www.nasa.gov/news-release/nasas-first-asteroid-sample-has-landed-now-secure-in-clean-room/'}
 }
};
export const hasEarthContext=kind=>['launch','return','landing'].includes(kind);
export const locationFor=(id,kind)=>missionLocations[id][kind==='launch'?'launch':'landing'];
