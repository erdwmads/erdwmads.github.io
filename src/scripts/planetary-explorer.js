import { createElement, RotateCcw, ZoomIn, ZoomOut, Hand, Play, Pause, Clock3, Link } from 'lucide';
import { mineralModels } from './mineral-guide.js';
import { initResearchQuestions } from './research-questions.js';
import { encodeObservation, decodeObservation, legacyOriginsDestination } from './planetary-view-link.js';
import { samplePhotos } from './planetary-samples.js';

const materials = {
  bennu: { name: 'Bennu', mission: 'OSIRIS-REx', size: 'About 492 m', source: 'https://science.nasa.gov/resource/bennu-3d-model/', photo: '/assets/img/research-scale/bennu-whole.png', shape: 'A small, top-shaped asteroid with an equatorial bulge and a rough, boulder-rich surface.', mineral: 'Returned Bennu material records water-rock interaction. Published analyses describe hydrated silicates, carbonates and other phases; the same-looking grain need not be the same mineral.', citation: 'https://doi.org/10.1111/maps.14227' },
  ryugu: { name: 'Ryugu', mission: 'Hayabusa2', size: 'About 900 m', source: 'https://data.darts.isas.jaxa.jp/pub/hayabusa2/paper/Watanabe_2019/', photo: '/assets/img/research-scale/ryugu-jaxa.jpg', shape: 'A top-shaped asteroid with a prominent equatorial ridge. Its irregular relief comes from the published shape mesh, not a procedurally generated rock.', mineral: 'Ryugu samples have a CI-like chemical composition and preserve aqueous alteration. Comparing their minerals with Orgueil tests similarities without assuming an identical geological history.', citation: 'https://www.isas.jaxa.jp/en/topics/003094.html' },
  orgueil: { name: 'CI / Orgueil', mission: 'Meteorite specimen', size: 'Specimen, not an asteroid', source: 'https://naturalhistory.si.edu/object/nmnhmineralsciences_1017941', photo: '/assets/img/research-scale/orgueil-smithsonian.jpg', shape: 'No measured three-dimensional scan of this Orgueil specimen is supplied. Open Samples to view the Smithsonian reference photograph.', mineral: 'The research focus is dolomite in Orgueil: its chemistry, crystal structure and relationship to the surrounding matrix. Mineral textures can constrain alteration processes when supported by analysis.', citation: 'https://www.mnhn.fr/fr/meteorite-d-orgueil' }
};
let cleanup = () => {};

function init() {
  const root = document.querySelector('[data-planetary-explorer]');
  if (!root || root.dataset.initialized) return;
  const destination=legacyOriginsDestination(location.hash);
  if(destination){location.replace(destination);return;}
  cleanup();
  root.dataset.initialized = 'true';
  const abort = new AbortController();
  const { signal } = abort;
  const el = name => root.querySelector(`[data-${name}]`);
  const defaults = { view: 'orbit', material: 'bennu', inspected: 'bennu', scope: 'inner', angle: 'plan', compare: false, wireframe: false, mineral: 'carbonate', separated: false, day: 0 };
  const state = {...defaults};
  const needsRenderer = observation => observation.view === 'orbit' || observation.view === 'minerals' || observation.view === 'shape' && observation.material !== 'orgueil';
  let observationTime = false;
  let pendingObservation=decodeObservation(location.hash),restoreVersion=0,syncingMaterial=false,lastHash=location.hash;
  let renderVersion=0,rendering=false,restoring=false,shareVersion=0;
  const icons = { reset: RotateCcw, 'zoom-in': ZoomIn, 'zoom-out': ZoomOut, hand: Hand, play: Play, now: Clock3, share: Link };
  root.querySelectorAll('[data-icon]').forEach(host => host.replaceChildren(createElement(icons[host.dataset.icon], { 'aria-hidden': 'true', width: 20, height: 20 })));
  let viewer, data, starting = false, visible = false, timeline, playing = false, live = false, clockFrame = 0, lastFrame = 0, lastText = 0;
  const dayMs = 86400000;
  const lastDay = () => Number(el('timeline').max)/24;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function touchMode(enabled) {
    const button=root.querySelector('[data-action="interact"]');
    button.setAttribute('aria-pressed',String(enabled));
    button.title=enabled?'Return to page scrolling':'Enable model rotation and pinch zoom';
    button.setAttribute('aria-label',button.title);
    button.querySelector('[data-interact-label]').textContent=enabled?'Done':'Explore';
    root.querySelector('.planetary-interaction-bar>span').textContent=enabled?'Drag to rotate · pinch to zoom':'Swipe to scroll the page';
    el('stage').toggleAttribute('data-touch-active',enabled);viewer?.setTouch(enabled);
  }
  matchMedia('(pointer: coarse)').addEventListener('change',()=>touchMode(false),{signal});
  function shareUI() {el('share').disabled=rendering || restoring || (needsRenderer(state) && (!viewer || root.dataset.renderState==='error'));}
  function clearShare() {shareVersion++;el('share-link').hidden=true;el('share-status').textContent='';}
  function interrupt() {restoreVersion++;pendingObservation=null;restoring=false;shareUI();clearShare();}
  let fxEnabled = !document.documentElement.classList.contains('ambient-fx-disabled');
  function syncFx(event) {
    if (typeof event?.detail?.enabled === 'boolean') fxEnabled = event.detail.enabled;
    const enabled = fxEnabled && !reduced.matches && !window.__madsPowerState?.lowPower;
    root.dataset.focusFx = enabled ? 'on' : 'off';
    viewer?.setFx(enabled);
  }
  window.addEventListener('mads:fx-state',syncFx,{signal});
  window.addEventListener('mads:power-state',syncFx,{signal});
  reduced.addEventListener('change',syncFx,{signal});
  initResearchQuestions(root,{signal,onExplore:question=>{
    interrupt();
    playing=false;live=false;
    state.view=question.view;state.mineral=question.mineral;
    selectMaterial('orgueil');clockUI();
    root.querySelector('.planetary-visual').scrollIntoView({block:'center',behavior:root.dataset.focusFx==='on'?'smooth':'instant'});
  }});
  function clockUI() {
    const button = root.querySelector('[data-action="play"]');
    button.setAttribute('aria-pressed',String(playing));
    button.setAttribute('aria-label',playing?'Pause orbital motion':'Play orbital motion');
    button.title = button.getAttribute('aria-label');
    button.querySelector('[data-icon]').replaceChildren(createElement(playing?Pause:Play,{'aria-hidden':'true',width:20,height:20}));
    const playback=live?'Current clock':Number(el('speed').value)===1?'Playback at 1× speed':'Accelerated playback';
    el('clock-status').textContent = `${playing ? playback : 'Paused'} · JPL daily ephemeris estimate · UTC`;
    el('summary').setAttribute('aria-live',playing?'off':'polite');
  }
  function timeUI() {
    if (!timeline) return;
    const iso = new Date(Date.parse(timeline.start)+state.day*dayMs).toISOString();
    el('date').value = iso.slice(0,16);
    el('timeline').value = state.day*24;
    el('epoch').textContent = `${iso.slice(0,10)} · ${iso.slice(11,16)} UTC`;
    root.dataset.day = state.day.toFixed(8);
    viewer?.setTime(state.day);
  }
  function clockTick(time) {
    clockFrame = 0;
    if (!playing || !visible || document.hidden || state.view !== 'orbit' || !timeline || root.dataset.renderState === 'error') { lastFrame = 0; return; }
    const max = lastDay();
    if (live) state.day = (Date.now()-Date.parse(timeline.start))/dayMs;
    else if (lastFrame) state.day += (time-lastFrame)/1000*Number(el('speed').value)/86400;
    state.day = Math.max(0,Math.min(max,state.day));
    lastFrame = time;
    viewer?.setTime(state.day);
    root.dataset.day = state.day.toFixed(8);
    if (time-lastText>150) { timeUI(); describe(); lastText = time; }
    if (state.day >= max) { playing = false; timeUI(); describe(); clockUI(); return; }
    clockFrame = requestAnimationFrame(clockTick);
  }
  function scheduleClock() {
    cancelAnimationFrame(clockFrame); clockFrame = 0; lastFrame = 0;
    if (playing && visible && !document.hidden && state.view === 'orbit') clockFrame = requestAnimationFrame(clockTick);
  }
  function setDay(day) {
    if (!timeline) return;
    if (!Number.isFinite(day)) { timeUI(); return; }
    playing = false; live = false;
    state.day = Math.max(0,Math.min(lastDay(),day));
    timeUI(); describe(); clockUI(); scheduleClock();
  }

  function facts(items) {
    el('facts').replaceChildren(...items.map(([label, text]) => {
      const div = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = label; dd.textContent = text; div.append(dt, dd); return div;
    }));
  }
  function describe() {
    const m = materials[state.material];
    root.dataset.focus = state.view === 'minerals' ? state.mineral : state.view === 'orbit' ? state.inspected : state.material;
    el('object-title').textContent = m.name;
    el('source').href = state.view === 'minerals' ? m.citation : m.source;
    el('source').textContent='Data source';
    el('epoch').hidden = state.view !== 'orbit';
    el('mindat').hidden = state.view !== 'minerals' || !mineralModels[state.mineral].mindat;
    if (state.view === 'orbit') {
      el('evidence').textContent = 'JPL ephemeris · selected UTC time';
      el('scale-note').textContent = 'Heliocentric · distances in AU';
      el('source').href = 'https://ssd.jpl.nasa.gov/horizons/';
      el('boundary').textContent = 'Models follow the selected UTC date using interpolated daily ephemerides. Orbit guides span about one revolution from September 2026. Body models are enlarged independently, not to scale; current orbits are not formation locations.';
      if (state.material === 'orgueil') el('boundary').textContent += ' Orgueil has no established parent-body orbit; none is drawn.';
      if (state.inspected === 'orgueil') {
        el('description').textContent = 'Orgueil\'s specific parent body and pre-atmospheric orbit are not established. No CI orbit is drawn.';
        facts([['Material', 'CI1 carbonaceous chondrite'], ['Earth arrival', 'Orgueil, France · 1864']]);
        el('interpretation').textContent = 'Bennu and Ryugu provide comparison contexts. Similar composition is not proof of direct parentage.';
      } else {
        const body = data?.bodies.find(b => b.id === state.inspected);
        const title = state.inspected[0].toUpperCase() + state.inspected.slice(1);
        el('object-title').textContent = title;
        el('description').textContent = ['bennu','ryugu'].includes(state.inspected) ? `${title} in the present-day near-Earth environment. The diagram uses Sun-centred coordinates, not a schematic circular orbit.` : `${title} provides a planetary reference for the asteroid orbits.`;
        const point = body && viewer?.position(body.id,state.day), earth = viewer?.position('earth',state.day);
        facts([['Distance from Sun', point ? `${Math.hypot(...point).toFixed(3)} AU` : 'Loading...'], ['Distance from Earth', point && earth ? `${Math.hypot(...point.map((v,i) => v-earth[i])).toFixed(3)} AU` : 'Loading...']]);
        el('interpretation').textContent = 'Orbital proximity does not imply that these bodies formed together. Their mineral records provide an independent line of evidence.';
      }
    } else if (state.view === 'shape') {
      el('evidence').textContent = state.material === 'orgueil' ? 'No measured specimen model' : 'Public shape model · neutral lighting';
      el('description').textContent = state.feature === 'equator' && state.material !== 'orgueil' ? `${m.name}'s equatorial profile contributes to its top-shaped outline. The annotation is attached to a vertex in the displayed mesh; it is not a mineral identification or a measured ridge-height estimate.` : m.shape;
      el('scale-note').textContent = state.compare && state.material !== 'orgueil' ? 'Approximate size comparison · common scale' : 'Shape view · display orientation';
      facts([['Context', m.mission], ['Size', m.size]]);
      el('interpretation').textContent = state.material === 'orgueil' ? 'A single photograph cannot supply unseen geometry. The Minerals view presents a separate, explicitly conceptual explanation.' : 'The mesh describes external geometry. It does not reveal the internal structure or identify surface minerals. The lighting is illustrative, not measured reflectance.';
      el('boundary').textContent = state.material === 'orgueil' ? 'CI is a meteorite class, not a single body with a standard shape.' : 'Original public mesh; display orientation and neutral material applied. Comparison preserves source dimensions on a common scale. Labels give approximate mean diameters (Bennu 492 m; Ryugu 900 m), not maximum widths or precision measurements.';
    } else if (state.view === 'sample') {
      const photo=samplePhotos[state.material];
      el('object-title').textContent=photo.title;
      el('evidence').textContent=`${m.name} · public photograph`;
      el('description').textContent=photo.description;
      el('scale-note').textContent='Specimen photograph · original proportions';
      facts([['Context',photo.context],['Evidence type','Photographic observation']]);
      el('interpretation').textContent='Texture suggests questions; chemistry and crystal structure test mineral identity. A dark fragment is not a phase identification.';
      el('source').href=photo.source;
      el('boundary').textContent=photo.boundary;
    } else {
      const mineral = mineralModels[state.mineral];
      el('object-title').textContent = mineral.name;
      el('evidence').textContent = `${mineral.category} · illustrative 3D form`;
      el('scale-note').textContent = 'Illustrative morphology · no physical scale';
      el('description').textContent = mineral.description;
      facts([['Formula',mineral.formula],['Typical appearance',mineral.appearance]]);
      el('interpretation').textContent = mineral.research;
      el('source').href = mineral.source;
      if (mineral.mindat) el('mindat').href = mineral.mindat;
      el('detail-label').textContent = mineral.detail;
      el('mineral-caption').textContent = mineral.explanation;
      el('boundary').textContent = `${m.name}: ${m.mineral} These general mineral examples are not a measured inventory, atomic structure or reconstruction of this material. Colours, grain shapes and spacing are illustrative.`;
    }
  }
  async function sync() {
    const ticket=++renderVersion;
    rendering=true;shareUI();
    if(root.dataset.mode!==state.view)touchMode(false);
    root.dataset.mode = state.view;
    root.dataset.activeMaterial = state.material;
    root.querySelectorAll('[data-view]').forEach(button => {
      const active = button.dataset.view === state.view;
      button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
    });
    root.querySelector('#planetary-panel').setAttribute('aria-labelledby', `planetary-${state.view}`);
    root.querySelectorAll('[data-material]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.material === state.material)));
    root.querySelectorAll('[data-mineral]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mineral === state.mineral)));
    const renderable = needsRenderer(state);
    if (root.dataset.renderState === 'error') el('fallback').src = materials[state.material].photo;
    el('stage').hidden = !renderable;
    el('ci-figure').hidden = state.view !== 'shape' || state.material !== 'orgueil';
    el('sample-figure').hidden=state.view!=='sample';
    if(state.view==='sample') {
      const photo=samplePhotos[state.material],image=el('sample-image');
      if(image.getAttribute('src')!==photo.src) {el('sample-error').hidden=true;image.hidden=false;image.src=photo.src;}
      image.alt=photo.alt;el('sample-credit').textContent=photo.credit;
    }
    el('mineral-diagram').hidden = state.view !== 'minerals';
    el('camera-tools').hidden = !renderable;
    root.querySelector('.planetary-interaction-bar').hidden=!renderable;
    el('orbit-tools').hidden = state.view !== 'orbit';
    el('shape-tools').hidden = state.view !== 'shape' || state.material === 'orgueil';
    el('time-controls').hidden = state.view !== 'orbit';
    el('scope').value=state.scope;el('angle').value=state.angle;
    el('mineral-detail').checked=state.separated;
    for(const action of ['compare','wireframe']) root.querySelector(`[data-action="${action}"]`).setAttribute('aria-pressed',String(state[action]));
    describe();
    if(!renderable)viewer?.cancelPending();
    const renderRequest = viewer && renderable ? viewer.show(state) : Promise.resolve(true);
    if(renderable && !viewer && visible)start();
    viewer?.setVisible(visible && renderable && !document.hidden);
    scheduleClock();
    const ready=await renderRequest;
    if(ticket===renderVersion && !signal.aborted) {
      rendering=false;shareUI();
    }
    return ready;
  }
  function notifyMaterial() {
    syncingMaterial=true;
    try {window.dispatchEvent(new CustomEvent('mads:material-selected',{detail:{material:state.material,origin:'explorer'}}));}
    finally {syncingMaterial=false;}
  }
  async function restoreObservation(saved) {
    clearShare();
    const ticket=++restoreVersion;
    restoring=true;shareUI();
    playing=false;live=false;
    const {camera,...publicState}=saved;
    Object.assign(state,defaults,publicState,{feature:null});
    observationTime = Object.hasOwn(saved,'day');
    if (saved.material && !saved.inspected) state.inspected=saved.material;
    if(timeline)state.day=Math.min(lastDay(),state.day);
    const ready=await sync();
    if(signal.aborted || ticket!==restoreVersion)return;
    if(ready && camera)viewer?.restoreCamera(camera);
    restoring=false;shareUI();
    timeUI();clockUI();notifyMaterial();
    el('share-status').textContent='Saved observation restored';
    root.querySelector('.planetary-visual').scrollIntoView({block:'center',behavior:'instant'});
    return ready;
  }
  async function shareObservation() {
    if(el('share').disabled)return;
    const ticket=++shareVersion;
    const snapshot={...state};
    if(!el('stage').hidden && viewer)snapshot.camera=viewer.cameraState();
    const url=encodeObservation(snapshot,location.href);
    el('share-link').value=url;
    try {
      await navigator.clipboard.writeText(url);
      if(signal.aborted || ticket!==shareVersion)return;
      el('share-link').hidden=true;el('share-status').textContent='Observation link copied';
    } catch {
      if(signal.aborted || ticket!==shareVersion)return;
      el('share-status').textContent='Clipboard unavailable';el('share-link').hidden=false;el('share-link').focus();el('share-link').select();
    }
  }
  function selectMaterial(material, notify = true) {
    if (!materials[material]) return;
    if (!notify && state.material === material && state.inspected === material) return;
    state.material = material; state.inspected = material; state.feature = null;
    sync();
    if (notify) notifyMaterial();
  }
  function failure(error) {
    if (signal.aborted || error?.name === 'AbortError') return;
    playing = false; clockUI(); scheduleClock();
    root.dataset.renderState = 'error';
    shareUI();
    el('stage').querySelector('canvas')?.style.setProperty('visibility','hidden');
    el('labels').hidden = true;
    el('fallback').src = materials[state.material].photo;
    el('fallback').hidden = false;
    el('status').hidden = false;
    el('status').textContent = 'Interactive view unavailable. Showing a public reference image, not the selected 3D view.';
    el('retry').hidden = false;
  }
  async function start() {
    if (starting || viewer) return;
    starting = true;
    el('retry').hidden = true;
    root.dataset.renderState = 'loading';
    el('status').textContent = 'Loading orbital data...';
    try {
      if(!data) {
        const response = await fetch('/assets/data/planetary/orbits.json', { signal });
        if (!response.ok) throw new Error('Orbital data unavailable');
        data = await response.json();
      }
      if(!timeline) {
        const timeResponse = await fetch('/assets/data/planetary/timeline.json',{signal});
        if (!timeResponse.ok) throw new Error('Timeline unavailable');
        timeline = await timeResponse.json();
        data.timeline = timeline;
        const max = (Date.parse(timeline.end)-Date.parse(timeline.start))/dayMs;
        el('timeline').max = max*24;
        el('date').min = `${timeline.start}T00:00`; el('date').max = `${timeline.end}T00:00`;
        state.day = Math.max(0,Math.min(max,observationTime ? state.day : (Date.now()-Date.parse(timeline.start))/dayMs));
      }
      const { createPlanetaryRenderer } = await import('./planetary-renderer.js');
      if (signal.aborted) return;
      viewer = createPlanetaryRenderer(root, data, { signal, onSelect: id => {
        interrupt();
        if (materials[id]) selectMaterial(id);
        else { state.inspected = id; describe(); viewer.highlight(id); }
      }, onFeature: feature => { interrupt();state.feature = feature; describe(); }, onError: failure });
      viewer.setTouch(root.querySelector('[data-action="interact"]').getAttribute('aria-pressed')==='true');
      let ready;
      if(pendingObservation) {const saved=pendingObservation;pendingObservation=null;ready=await restoreObservation(saved);}
      else ready=await sync();
      syncFx();
      el('time-controls').disabled = false;
      timeUI(); clockUI();
      return ready;
    } catch (error) { failure(error); }
    finally { starting = false; }
  }
  async function retryView() {
    if(starting)return;
    const camera=viewer?.cameraState(),ticket=restoreVersion;
    restoring=true;shareUI();
    viewer?.dispose();viewer=undefined;
    try {
      const ready=await start();
      if(ready && ticket===restoreVersion && camera)viewer?.restoreCamera(camera);
    } finally {
      if(ticket===restoreVersion){restoring=false;shareUI();}
    }
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if(button.dataset.view===state.view || button.dataset.material===state.material && state.inspected===state.material || button.dataset.mineral===state.mineral)return;
    if(button.dataset.action!=='share' && (button.dataset.action || button.dataset.view || button.dataset.material || button.dataset.mineral))interrupt();
    if (button.dataset.view) { state.view = button.dataset.view; sync(); }
    if (button.dataset.material) selectMaterial(button.dataset.material);
    if (button.dataset.mineral) { state.mineral = button.dataset.mineral; sync(); }
    const action = button.dataset.action;
    if ((action === 'play' || action === 'now') && root.dataset.renderState === 'error') return;
    if (action === 'share') shareObservation();
    else if (action === 'show-sample') { state.view='sample';sync();root.querySelector('[data-view="sample"]').focus({preventScroll:true}); }
    else if (action === 'retry') retryView();
    else if (action === 'play') { playing = !playing; if (playing && state.day>=lastDay()) { state.day=0; live=false; } timeUI(); describe(); clockUI(); scheduleClock(); }
    else if (action === 'now') {
      const day = (Date.now()-Date.parse(timeline.start))/dayMs;
      setDay(day);
      if (day>=0 && day<=lastDay()) { live=true; playing=true; el('speed').value='1'; clockUI(); scheduleClock(); }
      else el('clock-status').textContent = 'Current time is outside the cached ephemeris range. Showing the nearest available date.';
    }
    else if (action === 'compare' || action === 'wireframe') { state[action] = !state[action]; button.setAttribute('aria-pressed', String(state[action])); sync(); }
    else if (action === 'interact') touchMode(button.getAttribute('aria-pressed')!=='true');
    else if (action) viewer?.action(action);
  }, { signal });
  root.addEventListener('input', event => { if (event.target.matches('[data-timeline]')) {interrupt();setDay(Number(event.target.value)/24);} }, {signal});
  el('stage').addEventListener('pointerdown',()=>interrupt(),{signal});
  el('stage').addEventListener('wheel',()=>interrupt(),{signal,passive:true});
  el('sample-image').addEventListener('error',()=>{el('sample-image').hidden=true;el('sample-error').hidden=false;},{signal});
  el('sample-image').addEventListener('load',()=>{el('sample-image').hidden=false;el('sample-error').hidden=true;},{signal});
  root.addEventListener('focusin', event => {
    if (playing && event.target.matches('[data-date],[data-timeline]')) { playing=false; live=false; timeUI(); describe(); clockUI(); scheduleClock(); }
  }, {signal});
  root.addEventListener('change', event => {
    interrupt();
    if (event.target.matches('[data-date]')) { setDay((Date.parse(`${event.target.value}Z`)-Date.parse(timeline.start))/dayMs); return; }
    if (event.target.matches('[data-speed]')) { live=false; clockUI(); return; }
    if (event.target.matches('[data-mineral-detail]')) state.separated = event.target.checked;
    if (event.target.matches('[data-scope]')) state.scope = event.target.value;
    if (event.target.matches('[data-angle]')) state.angle = event.target.value;
    sync();
  }, { signal });
  root.addEventListener('keydown', event => {
    const tab = event.target.closest('[data-view]');
    if (tab) {
      const tabs = [...root.querySelectorAll('[data-view]')];
      let index = tabs.indexOf(tab);
      if (event.key === 'ArrowRight') index = (index+1)%tabs.length;
      else if (event.key === 'ArrowLeft') index = (index+tabs.length-1)%tabs.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length-1;
      else return;
      event.preventDefault();
      if(state.view!==tabs[index].dataset.view) {interrupt();state.view = tabs[index].dataset.view;sync();}
      tabs[index].focus();
    } else if (event.target === el('stage') && /^Arrow/.test(event.key)) { event.preventDefault(); interrupt();viewer?.rotate(event.key); }
    else if (event.key === 'Escape') { interrupt();touchMode(false); }
  }, { signal });
  window.addEventListener('mads:material-selected', e => { if (!pendingObservation && !syncingMaterial && e.detail?.origin !== 'explorer') {interrupt();selectMaterial(e.detail?.material, false);} }, { signal });
  function restoreHash() {
    if(lastHash===location.hash || !location.pathname.endsWith('/research.html'))return;
    lastHash=location.hash;
    restoreVersion++;pendingObservation=null;restoring=false;clearShare();shareUI();
    const destination=legacyOriginsDestination(location.hash);
    if(destination){location.replace(destination);return;}
    const saved=decodeObservation(location.hash);
    if(!saved)return;
    if(viewer || !needsRenderer({...defaults,...saved}))restoreObservation(saved);else {pendingObservation=saved;start();}
  }
  window.addEventListener('hashchange',restoreHash,{signal});
  window.addEventListener('popstate',restoreHash,{signal});
  const intersection = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible && needsRenderer(state)) start();
    viewer?.setVisible(visible && !el('stage').hidden && !document.hidden);
    scheduleClock();
  });
  intersection.observe(el('visual') || root.querySelector('.planetary-visual'));
  document.addEventListener('visibilitychange', () => { viewer?.setVisible(visible && !el('stage').hidden && !document.hidden); scheduleClock(); }, { signal });
  const theme = new MutationObserver(() => {if(!rendering && !restoring)viewer?.theme();});
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  cleanup = () => { abort.abort(); cancelAnimationFrame(clockFrame); intersection.disconnect(); theme.disconnect(); viewer?.dispose(); delete root.dataset.initialized; };
  if(pendingObservation && !needsRenderer({...defaults,...pendingObservation})) {
    const saved=pendingObservation;pendingObservation=null;restoreObservation(saved);
  } else sync();
  syncFx();
  if(pendingObservation)start();
}
window.addEventListener('mads:soft-nav-before-swap', () => cleanup());
window.addEventListener('mads:soft-nav-ready', init);
window.addEventListener('pagehide', () => cleanup());
window.addEventListener('pageshow', init);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
