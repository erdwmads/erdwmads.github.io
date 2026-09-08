const ciSource='https://doi.org/10.1016/0016-7037(95)00399-1';
const ryuguSource='https://doi.org/10.1126/science.abn8671';
const accretionSource='https://doi.org/10.1051/0004-6361/200912852';
const bennuSource='https://doi.org/10.1038/s41561-025-01741-0';
export const originStages=[
  {name:'Dust & ice',title:'Rock, organics and frozen water',subtitle:'01 / Starting materials',description:'Rocky grains, organics and ice supplied the parent body. Ryugu samples support formation where water and CO2 could freeze in the outer Solar System. This is an analogue, not a located birthplace for Orgueil.',record:'Rocky grains and ice',process:'Cold starting materials',source:ryuguSource},
  {name:'Accretion',title:'Collisions can build or break',subtitle:'02 / Assembly',description:'At low relative speeds, dust aggregates can stick; other collisions cause bouncing or fragmentation. Parent-body assembly spans larger scales and is not simply a chain of sticking collisions. Orgueil\'s assembly history is not reconstructed.',record:'An ice-bearing parent body',process:'Aggregation and accretion',source:accretionSource},
  {name:'Water & rock',title:'Ice melts. Water alters rock.',subtitle:'03 / Parent-body alteration',description:'In the Ryugu model, radioactive decay of aluminium-26 heats the interior and melts water ice. Liquid water then reacts with rock, forming hydrous silicates and precipitating carbonates. Orgueil records aqueous alteration, not a proven identical timeline.',record:'Hydrous silicates and carbonates',process:'Ice melting and aqueous alteration',source:ryuguSource},
  {name:'Fragments',title:'An impact breaks the parent body',subtitle:'04 / Different histories',description:'A later energetic impact can disrupt the altered body and eject fragments. In the Ryugu model, strong heating is localized near the impact; cooler debris can reaccumulate while preserving earlier minerals. This is not a traced route to Orgueil.',record:'Fragments with inherited minerals',process:'Disruption and reaccumulation',source:ryuguSource}
];
export const originStage=progress=>Math.min(3,Math.floor(Math.max(0,Math.min(1,progress))*4));
export const originAlterationSteps=[
  {label:'Ice melting',progress:.52,title:'Ice supplies liquid water',description:'Internal radioactive heating melts accreted water ice before aqueous alteration begins. In the Ryugu model, the colder outer layer melts less ice and remains less altered than the interior.'},
  {label:'Water-rock reaction',progress:.61,title:'Liquid water reacts with rock',description:'Water contacts mineral surfaces and changes the original silicates into hydrous phases. Dissolved components can precipitate as carbonates. Fluid access through pores and fractures is conceptual, not a measured flow map.'},
  {label:'Mineral record',progress:.72,title:'Alteration leaves a mineral record',description:'Hydrous silicates and carbonates preserve evidence of water-rock reaction. Carbonate growth can overlap hydration; it is not a separate universal final step. Crystal sizes, timing and distribution here are illustrative.'}
];
export const originAlterationIndex=progress=>progress<.575?0:progress<.675?1:2;
export const originHasSpecimen=(material,progress)=>material==='orgueil'&&progress>=.96;
export function originBranch(material) {
  if(material==='orgueil')return {title:'Orgueil / CI1',description:'Orgueil is a chemically primitive, aqueously altered CI1 chondrite. Its carbonates record variable fluid conditions and multiple alteration episodes. Its specific parent asteroid remains unidentified; Ryugu is an analogue, not an established parent.',view:'sample',action:'View Orgueil specimen',secondary:'Examine dolomite',source:ciSource};
  if(material==='ryugu')return {title:'Ryugu / Hayabusa2',description:'Returned samples preserve hydrous silicates, carbonates and CO2-bearing fluid inclusions. Nakamura et al. model ice melting and alteration inside an earlier parent body, followed by disruption and reaccumulation. This does not establish Ryugu as Orgueil\'s parent.',view:'shape',action:'View Ryugu shape',secondary:'View returned sample',source:ryuguSource};
  return {title:'Bennu / OSIRIS-REx',description:'Returned Bennu samples contain abundant hydrous silicates and minor carbonates, recording reactions with liquid water on an earlier parent body. Bennu is a separate comparison; neither its history nor Ryugu\'s identifies the parent of Orgueil.',view:'shape',action:'View Bennu shape',secondary:'View returned sample',source:bennuSource};
}
