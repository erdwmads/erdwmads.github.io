const ciSource='https://pubmed.ncbi.nlm.nih.gov/11539921/';
const asteroidSource='https://science.nasa.gov/missions/osiris-rex/nasas-bennu-samples-reveal-complex-origins-dramatic-transformation/';
export const originStages=[
  {name:'Dust & ice',title:'Before there was a world',subtitle:'01 / Starting materials',description:'Rocky grains and ice-bearing solids supplied the ingredients of primitive bodies. This local cloud represents starting materials, not a mapped location in the solar nebula.',record:'Inherited ingredients',process:'Mixing of solids',source:asteroidSource},
  {name:'Accretion',title:'Small grains. A larger body.',subtitle:'02 / Assembly',description:'Solids assembled into aggregates and eventually planetesimals. The porous body here is a process illustration: its shape, size and assembly rate are not reconstructed for Orgueil.',record:'A porous parent body',process:'Aggregation and accretion',source:asteroidSource},
  {name:'Water & rock',title:'Water rewrites the mineral record',subtitle:'03 / Parent-body alteration',description:'Melting of accreted ice can permit water to react with rock. CI carbonates record aqueous processes; their chemistry and textures help constrain the conditions of alteration.',record:'Altered matrix and carbonates',process:'Water-rock reaction',source:ciSource},
  {name:'Fragments',title:'Broken worlds. Preserved records.',subtitle:'04 / Different histories',description:'Disruption can release fragments; some debris can assemble into new rubble-pile asteroids. Meteorites and returned samples preserve evidence of those earlier environments.',record:'Fragments and surviving minerals',process:'Disruption and reassembly',source:asteroidSource}
];
export const originStage=progress=>Math.min(3,Math.floor(Math.max(0,Math.min(1,progress))*4));
export const originAlterationSteps=[
  {label:'Before alteration',progress:.52,title:'The starting rock',description:'A fixed interior view shows the conceptual porous rock before the illustrated water-rock reaction. This is not a reconstruction of an unaltered Orgueil sample.'},
  {label:'Water-rock reaction',progress:.61,title:'Water interacts with rock',description:'The highlighted paths represent fluid access through pores and fractures. They indicate a process, not measured channels or flow speeds.'},
  {label:'Mineral record',progress:.72,title:'Minerals preserve the reaction',description:'Carbonate chemistry and textures can preserve evidence of aqueous alteration. The enlarged crystal forms mark that record; their sizes and distribution here are illustrative.'}
];
export const originAlterationIndex=progress=>progress<.575?0:progress<.675?1:2;
export const originHasSpecimen=(material,progress)=>material==='orgueil'&&progress>=.96;
export function originBranch(material) {
  if(material==='orgueil')return {title:'Orgueil / CI1',description:'Orgueil preserves a chemically primitive but aqueously altered mineral record. Its specific parent body is not identified; this fragment is conceptual, not a reconstruction of the museum specimen.',view:'sample',action:'View Orgueil specimen',secondary:'Examine dolomite',source:ciSource};
  if(material==='ryugu')return {title:'Ryugu / Hayabusa2',description:'Returned Ryugu material has a CI-like chemical composition and a record of water-rock reaction. Its public shape is a separate observation, not evidence that Ryugu is the parent of Orgueil.',view:'shape',action:'View Ryugu shape',secondary:'View returned sample',source:'https://www.isas.jaxa.jp/en/topics/003094.html'};
  return {title:'Bennu / OSIRIS-REx',description:'Bennu is a rubble-pile asteroid carrying material inherited from an earlier parent body. Its returned minerals record alteration; this comparison does not identify it as the parent of Orgueil.',view:'shape',action:'View Bennu shape',secondary:'View returned sample',source:asteroidSource};
}
