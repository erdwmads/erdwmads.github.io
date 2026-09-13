import {descriptions} from './descriptions.js';

// Chapter reading stays available before, and independently of, the 3D scene.
export function createChapterReader(root,initial,signal){
  const $=selector=>root.querySelector(selector);
  let state={...initial},onSelect;
  function render(){
    const data=descriptions[state.stage];
    const guide=$('#fragment-guide');if(guide)guide.hidden=true;
    const sequence=$('#reaction-sequence');if(sequence)sequence.hidden=state.stage!==2;
    for(const [id,index] of [['growth-sequence',1],['inheritance-sequence',3]]){const list=$('#'+id);if(list)list.hidden=state.stage!==index;}
    const budget=$('#mineral-budget');if(budget)budget.hidden=state.stage!==2;
    for(const key of ['eyebrow','title','description','scale','environment'])$('#'+key).textContent=data[key];
    root.querySelectorAll('[data-stage]').forEach(button=>{
      button.disabled=false;
      if(Number(button.dataset.stage)===state.stage)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
    });
    $('#scene-counter').textContent=String(state.stage+1).padStart(2,'0')+' / 04';
    $('#legend').innerHTML=data.legend.map(([color,label])=>`<span><i style="--swatch:${color}"></i>${label}</span>`).join('');
  }
  function select(stage,progress=.05){state={...state,stage,progress};render();onSelect?.(stage,progress);}
  function fallback(current=state){
    state={...current,paused:true};onSelect=undefined;render();
    root.querySelectorAll('.observatory button:not(#retry-scene),.observatory input').forEach(control=>control.disabled=true);
    $('#legend').hidden=false;$('#material-note').hidden=true;$('#moment').textContent='Chapter context';
  }
  root.querySelectorAll('[data-stage]').forEach(button=>button.addEventListener('click',()=>select(Number(button.dataset.stage)),{signal}));
  fallback();
  // Initial playback preference still belongs to the successful scene mount.
  state={...initial};
  return{select,fallback,connect(listener){onSelect=listener;},get state(){return{...state};}};
}
