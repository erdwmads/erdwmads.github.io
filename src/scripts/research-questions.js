export const researchQuestions = [
  { id:'target', title:'What makes a grain worth measuring?', action:'Inspect the research material', view:'sample', mineral:'carbonate',
    steps:[['Observation','A grain stands out in electron-image contrast or has an interesting contact with its surroundings.'],['Possible explanation','It may differ in composition, surface relief or orientation. Contrast is a reason to investigate, not a mineral name.'],['Missing evidence','Compare SE and BSE context, then screen its elements with EDS before choosing quantitative and structural analyses.']],
    source:'https://serc.carleton.edu/research_education/geochemsheets/techniques/SEM.html', sourceLabel:'SEM: what image contrast can tell us' },
  { id:'ratio', title:'Does Ca:Mg near 1:1 prove dolomite?', action:'Inspect the carbonate form', view:'minerals', mineral:'carbonate',
    steps:[['Observation','An analysis gives approximately equal numbers of Ca and Mg atoms. This is a useful screening clue.'],['Possible explanation','Dolomite is a candidate, but that ratio is not sufficient for identification: neighbouring phases can contribute to a mixed analysis.'],['Missing evidence','Check carbonate chemistry, analytical quality and crystal structure together. A rhombic-looking shape is not a substitute for diffraction.']],
    source:'https://www.handbookofmineralogy.org/pdfs/dolomite.pdf', sourceLabel:'Dolomite: composition and crystallographic reference' },
  { id:'contact', title:'What does a clay contact tell us?', action:'Inspect a sheet-silicate example', view:'minerals', mineral:'matrix',
    steps:[['Observation','A carbonate grain is next to fine-grained material. Their boundary is a place to investigate.'],['Possible explanation','Growth, replacement or later juxtaposition are possibilities. Adjacency alone does not decide which process occurred.'],['Missing evidence','Relate the wider texture to local chemistry, orientation and interface structure. TEM examines a small region, not the entire history.']],
    source:'https://www.nlr.gov/materials-science/transmission-electron-microscopy', sourceLabel:'TEM: imaging interfaces and local structure' }
];

export function initResearchQuestions(root,{signal,onExplore}) {
  const tabs=[...root.querySelectorAll('[data-question]')], panel=root.querySelector('[data-question-answer]');
  let selected=researchQuestions[0];
  function select(id) {
    selected=researchQuestions.find(q=>q.id===id);
    tabs.forEach(tab=>{const active=tab.dataset.question===id;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
    panel.setAttribute('aria-labelledby',`research-question-${id}`);
    const list=document.createElement('ol');
    for(const [title,text] of selected.steps) {
      const row=document.createElement('li'),heading=document.createElement('h4'),paragraph=document.createElement('p');
      heading.textContent=title;paragraph.textContent=text;row.append(heading,paragraph);list.append(row);
    }
    panel.replaceChildren(list);
    const source=root.querySelector('[data-question-source]');source.href=selected.source;source.textContent=selected.sourceLabel;
    root.querySelector('[data-question-explore]').textContent=selected.action;
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>select(tab.dataset.question),{signal});
    tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      const index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      select(tabs[index].dataset.question);tabs[index].focus();
    },{signal});
  });
  root.querySelector('[data-question-explore]').addEventListener('click',()=>onExplore(selected),{signal});
  select(selected.id);
}
