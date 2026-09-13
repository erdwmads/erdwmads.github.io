const phases=[
 {title:'Earth to asteroid',kinds:['launch','cruise','flyby','outbound']},
 {title:'At the asteroid',kinds:['rendezvous','sample','impact','stow']},
 {title:'Return to Earth',kinds:['depart','return','landing']}
];
export function missionStory(mission){
 return phases.map(phase=>({title:phase.title,chapters:mission.stages.map((stage,index)=>({stage,index})).filter(c=>phase.kinds.includes(c.stage.kind))}));
}
export function updateStory(root,mission,stage){
 root.querySelector('[data-mission-story-name]').textContent=mission.title;
 root.querySelector('[data-mission-story-phase]').textContent=phases.find(p=>p.kinds.includes(mission.stages[stage].kind)).title;
 root.querySelectorAll('[data-mission-story-panel]').forEach(panel=>{
  const active=panel.dataset.missionStoryPanel===mission.id;panel.hidden=!active;
  panel.querySelectorAll('[data-mission-stage]').forEach(button=>{
   if(active&&Number(button.dataset.missionStage)===stage)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
  });
 });
}
