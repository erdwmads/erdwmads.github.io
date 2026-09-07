import {createElement,Play,Pause,ArrowLeft,ZoomIn} from 'lucide';
import {originStage,originStages,originBranch,originAlterationSteps,originAlterationIndex,originHasSpecimen} from './origins-content.js';

export function initOriginsControls(root,{signal,state,onChange,onEvidence,onInspect}) {
  const panel=root.querySelector('[data-origin-controls]'),button=root.querySelector('[data-origin-play]');
  const timeline=root.querySelector('[data-origin-progress]'),cut=root.querySelector('[data-origin-cutaway]');
  let playing=false,frame=0,last=0,visible=false,allowed=false,lastPhase=-1;
  let inspectionKey='';
  function inspectionUI() {
    const phase=originStage(state.originProgress),focused=root.dataset.originFocus==='carbonate';
    const hidden=state.view!=='origins',disabled=phase!==2||state.originProgress<=.56||state.originCutaway<=0||root.dataset.renderState!=='ready';
    const moment=originAlterationIndex(state.originProgress),specimen=!hidden&&originHasSpecimen(state.material,state.originProgress);
    root.dataset.originSpecimen=String(specimen);root.querySelector('[data-origin-specimen]').hidden=!specimen;
    if(!hidden)root.querySelector('[data-camera-tools]').hidden=specimen;
    const key=[phase,focused,hidden,disabled,moment,specimen].join(':');if(key===inspectionKey)return;inspectionKey=key;
    root.querySelector('[data-stage]').setAttribute('aria-label',specimen?'Observed Orgueil specimen photograph':'Interactive solar system, asteroid and mineral models');
    const momentSelect=root.querySelector('[data-origin-moment]');momentSelect.hidden=phase!==2||hidden||focused;momentSelect.value=String(moment);
    const inspect=root.querySelector('[data-origin-inspect]');
    root.querySelector('[data-origin-inspection]').hidden=hidden;inspect.disabled=disabled;
    inspect.setAttribute('aria-pressed',String(focused));
    inspect.title=focused?'Restore your previous parent-body view':'Inspect the illustrative carbonate aggregate';
    inspect.setAttribute('aria-label',focused?'Return to body':'Inspect carbonate');
    inspect.querySelector('[data-icon]').replaceChildren(createElement(focused?ArrowLeft:ZoomIn,{'aria-hidden':'true',width:20,height:20}));
    root.querySelector('[data-origin-inspect-label]').textContent=focused?'Return to body':'Inspect carbonate';
    const label=root.querySelector('[data-origin-inspection-label]');label.hidden=phase===2&&!focused;
    label.textContent=focused?'Dolomite form · illustrative':specimen?'Observed specimen':phase===3?'Illustrative fragment':'Conceptual formation';
    inspect.hidden=phase!==2;
  }
  root.addEventListener('origininspectionchange',inspectionUI,{signal});
  function playbackUI() {
    button.setAttribute('aria-pressed',String(playing));
    button.title=!allowed?'Motion is disabled by your effects or accessibility setting':playing?'Pause illustrative sequence':'Play illustrative sequence';
    button.setAttribute('aria-label',button.title);
    button.disabled=!allowed||!['ready','rendering'].includes(root.dataset.renderState);
    button.replaceChildren(createElement(playing?Pause:Play,{'aria-hidden':'true',width:20,height:20}));
    root.dataset.originPlaying=String(playing);
  }
  function timelineUI() {
    timeline.value=state.originProgress;
    timeline.setAttribute('aria-valuetext',`${originStages[originStage(state.originProgress)].name}, illustrative progression ${Math.round(state.originProgress*100)} percent`);
  }
  function pause() {playing=false;cancelAnimationFrame(frame);frame=0;last=0;timelineUI();playbackUI();inspectionUI();}
  function sync() {
    panel.hidden=state.view!=='origins';
    if(panel.hidden&&playing)pause();
    const phase=originStage(state.originProgress),branch=originBranch(state.material);
    inspectionUI();
    root.dataset.originStage=String(phase);root.dataset.originProgress=state.originProgress.toFixed(6);
    timelineUI();
    root.querySelectorAll('[data-origin-step]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.originStep)===phase)));
    cut.querySelectorAll('[data-origin-view]').forEach(el=>{
      el.disabled=phase!==2;
      el.setAttribute('aria-pressed',String(Number(el.dataset.originView)===(state.originCutaway>0?1:0)));
      el.title=phase===2?'Observation view only; the body is not physically opened':'Available during Water & rock';
    });
    root.querySelector('[data-origin-evidence-actions]').hidden=state.view!=='origins'||phase!==3;
    root.querySelector('[data-origin-evidence="primary"]').textContent=branch.action;
    root.querySelector('[data-origin-evidence="secondary"]').textContent=branch.secondary;
    root.querySelector('[data-origin-sequence-status]').textContent=`${phase+1} / 4 · ${originStages[phase].name}`;
    root.querySelector('[data-origin-timeline-label]').textContent=`Formation sequence · ${phase+1} / ${originStages[phase].name}`;
    const legend=root.querySelector('[data-origin-legend]');
    legend.hidden=state.view!=='origins';legend.setAttribute('aria-hidden',String(phase!==2));
    playbackUI();
  }
  function change(progress,manual) {
    const previous=originStage(state.originProgress),previousMoment=originAlterationIndex(state.originProgress),wasSpecimen=originHasSpecimen(state.material,state.originProgress);
    state.originProgress=Math.max(0,Math.min(1,progress));
    const phase=originStage(state.originProgress);
    if(manual||phase!==lastPhase){sync();lastPhase=phase;}
    else {timelineUI();root.dataset.originProgress=state.originProgress.toFixed(6);}
    onChange(manual,phase!==previous||phase===2&&originAlterationIndex(state.originProgress)!==previousMoment||wasSpecimen!==originHasSpecimen(state.material,state.originProgress));
    inspectionUI();
  }
  function tick(now) {
    frame=0;
    if(!visible||document.hidden||state.view!=='origins'||!allowed||root.dataset.renderState==='error'){pause();return;}
    const delta=last?Math.min(100,now-last):0;last=now;
    change(state.originProgress+delta/48000,false);
    if(state.originProgress>=1){pause();return;}
    frame=requestAnimationFrame(tick);
  }
  panel.addEventListener('click',event=>{
    const step=event.target.closest('[data-origin-step]');
    if(step){pause();change([.125,.4375,.65,.80][Number(step.dataset.originStep)],true);}
    if(event.target.closest('[data-origin-play]')&&!button.disabled) {
      if(playing)pause();
      else {if(state.originProgress>=1)change(0,true);playing=true;last=0;playbackUI();frame=requestAnimationFrame(tick);}
    }
  },{signal});
  timeline.addEventListener('input',()=>{const progress=Number(timeline.value);pause();change(progress,true);},{signal});
  cut.addEventListener('click',event=>{const view=event.target.closest('[data-origin-view]');if(!view||view.disabled)return;pause();state.originCutaway=Number(view.dataset.originView);onChange(true,false);sync();},{signal});
  root.querySelector('[data-origin-moment]').addEventListener('change',event=>{pause();change(originAlterationSteps[Number(event.target.value)].progress,true);},{signal});
  root.querySelector('[data-origin-return]').addEventListener('click',()=>{pause();change(.94,true);},{signal});
  root.querySelector('[data-origin-specimen]').addEventListener('pointerdown',event=>event.stopPropagation(),{signal});
  root.querySelector('[data-origin-inspect]').addEventListener('click',()=>{pause();onInspect();sync();},{signal});
  root.querySelectorAll('[data-origin-evidence]').forEach(el=>el.addEventListener('click',()=>{
    pause();onEvidence(el.dataset.originEvidence==='primary'?originBranch(state.material).view:state.material==='orgueil'?'minerals':'sample');
  },{signal}));
  signal.addEventListener('abort',()=>{cancelAnimationFrame(frame);frame=0;},{once:true});
  return {sync,pause,setVisible(value){visible=value;if(!value)pause();},setMotionAllowed(value){allowed=value;if(!value)pause();else playbackUI();}};
}
