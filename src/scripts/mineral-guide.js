export const mineralModels = {
  carbonate: {
    name: 'Dolomite', formula: 'CaMg(CO3)2', category: 'Carbonate',
    description: 'A tilted, six-faced crystal rather than a rectangular cube. Dolomite can form rhombohedra; this model isolates that recognisable form.',
    appearance: 'White to pale pink; glassy to pearly', detail: 'Separate cleavage blocks',
    explanation: 'The separated blocks illustrate three inclined cleavage directions. They are not atoms, a unit cell or a simulated fracture experiment.',
    research: 'Ca and Mg near a 1:1 atomic ratio make a useful carbonate target. Chemistry plus diffraction and texture are needed to identify dolomite in Orgueil.',
    source: 'https://www.handbookofmineralogy.org/pdfs/dolomite.pdf', mindat: 'https://www.mindat.org/min-1304.html'
  },
  matrix: {
    name: 'Lizardite', formula: 'Mg3Si2O5(OH)4', category: 'Serpentine-group sheet silicate',
    description: 'Think of very thin flakes stacked together. Lizardite is a named example of a hydrated sheet silicate, not feldspar and not a label for the entire meteorite matrix.',
    appearance: 'Often pale green; fine scales or aggregates', detail: 'Separate sheets',
    explanation: 'The spaced plates show a layered organisation. Their thickness, spacing and green colour are illustrative, not an atomic structure or a measured CI texture.',
    research: 'Fine-grained hydrated silicates record water-rock interaction. TEM and diffraction distinguish structures that cannot be identified by colour or SEM appearance alone.',
    source: 'https://www.handbookofmineralogy.org/pdfs/lizardite.pdf', mindat: 'https://www.mindat.org/min-2425.html'
  },
  sulfide: {
    name: 'Pentlandite', formula: '(Fe,Ni)9S8', category: 'Iron-nickel sulfide',
    description: 'Usually a metallic, granular mass rather than a neat isolated cube. The cluster represents that aggregate habit, not a reconstructed specimen.',
    appearance: 'Bronze-yellow; metallic and opaque', detail: 'Separate grains',
    explanation: 'The separated grains make an aggregate easier to inspect. Their facets and positions are illustrative, not measured crystal faces or grain boundaries.',
    research: 'Fe, Ni and S suggest a sulfide target, but do not by themselves prove pentlandite. Quantitative chemistry and structural evidence distinguish related sulfides.',
    source: 'https://www.handbookofmineralogy.org/pdfs/pentlandite.pdf'
  }
};
