import {syncOcclusionCamera} from './origins-study/occlusion.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { createEphemeris } from './planetary-ephemeris.js';
import { createMineralGroup } from './planetary-minerals.js';
import { createOrbitBody } from './planetary-orbit-bodies.js';
import { normalizeAsteroid } from './asteroid-scale.js';

export function disposeObject(object, includeCached = false) {
  object.traverse(node => {
    if(node.isInstancedMesh)node.dispose();
    if (!node.userData.cached || includeCached) node.geometry?.dispose();
    for (const material of [node.material].flat().filter(Boolean)) {
      for (const value of Object.values(material)) if (value?.isTexture && (!value.userData.cached || includeCached)) { value.dispose(); value.image?.close?.(); }
      material.dispose();
    }
  });
}

export function createPlanetaryRenderer(root, data, { signal, onSelect, onFeature, onError, onReady }) {
  const lifetime = new AbortController();
  signal = AbortSignal.any([signal,lifetime.signal]);
  const stage = root.querySelector('[data-stage]'), labelLayer = root.querySelector('[data-labels]'), status = root.querySelector('[data-status]');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.localClippingEnabled = true;
  stage.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),studioMap=pmrem.fromScene(studio,.06);studio.dispose();pmrem.dispose();
  scene.environment=studioMap.texture;scene.environmentIntensity=.25;
  signal.addEventListener('abort',()=>studioMap.dispose(),{once:true});
  const camera = new THREE.OrthographicCamera(-2,2,2,-2,0.001,2000);
  stage.addEventListener('wheel',event=>{if(!event.ctrlKey&&!event.metaKey)event.stopImmediatePropagation();},{capture:true,passive:true,signal});
  const controls = new OrbitControls(camera, stage);
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  const ao=new SSAOPass(scene,camera,1,1);ao.kernelRadius=10;ao.minDistance=.001;ao.maxDistance=.08;composer.addPass(ao);composer.addPass(new OutputPass());
  root.querySelector('[data-retry]').addEventListener('pointerdown',event=>event.stopPropagation(),{signal});
  const ephemeris = createEphemeris(data.timeline);
  controls.enableDamping = false;
  controls.enableZoom = true;
  controls.zoomToCursor = true;
  controls.minZoom = 0.35;
  controls.maxZoom = 64;
  controls.enablePan = false;
  const coarse = matchMedia('(pointer: coarse)');
  let alive = true, visible = false, contextLost = false, touch = false, frame = 0, version = 0, current = null, world = new THREE.Group(), labels = [], clickable = [], radius = 2.1, radiusY = 2.1;
  const cache = new Map(), orbitTextures = new Map();
  let focusFx = true, requested = null;
  const hemisphere=new THREE.HemisphereLight(0xe6f2ff,0x394350,1.2);scene.add(world,hemisphere);
  const key = new THREE.DirectionalLight(0xffffff,2.4); key.position.set(3,5,6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xabc9ec,0.7); fill.position.set(-4,0,2); scene.add(fill);
  const originRim = new THREE.DirectionalLight(0x75cddd,1.6);originRim.position.set(-3,1,-3);originRim.visible=false;scene.add(originRim);
  const sunlight = new THREE.PointLight(0xfff4e5,3,0,0); sunlight.visible=false; scene.add(sunlight);

  function color() { return document.documentElement.dataset.theme === 'light' ? { bg:0xe8f0f4, line:0x9caeb7, blue:0x287e9c, gold:0x99731f, body:0x626f79 } : { bg:0x091219, line:0x41535e, blue:0x8ed4e9, gold:0xe6c77b, body:0x737b82 }; }
  function halo(size) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d'), glow = context.createRadialGradient(32,32,4,32,32,32);
    glow.addColorStop(0,'rgba(255,255,255,0.65)'); glow.addColorStop(0.4,'rgba(255,255,255,0.18)'); glow.addColorStop(1,'rgba(255,255,255,0)');
    context.fillStyle = glow; context.fillRect(0,0,64,64);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),color:color().gold,transparent:true,depthWrite:false,depthTest:false}));
    sprite.scale.setScalar(size); sprite.userData.focusHalo = true; sprite.raycast = () => {};
    return sprite;
  }
  function setFx(value) {
    focusFx = value;
    originRim.visible=['shape','minerals'].includes(current?.view)&&value;
    sunlight.visible=current?.view==='orbit';
    key.intensity=current?.view==='orbit'?0:2.8;fill.intensity=current?.view==='orbit'?.12:.2;hemisphere.intensity=current?.view==='orbit'?.42:.55;
    world.traverse(node => {
      if (node.userData.focusHalo) node.visible = value;
      if (current?.view!=='orbit' && node.isMesh && node.material?.emissive) { node.material.emissive.setHex(color().gold); node.material.emissiveIntensity = value ? 0.035 : 0; }
    });
    requestRender();
  }
  function requestRender() {
    root.dataset.zoom = camera.zoom.toFixed(4);
    root.querySelector('[data-zoom]').textContent = `${Math.round(camera.zoom*100)}%`;
    if (!frame && alive && !contextLost && visible && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function draw() {
    frame = 0;
    if (!alive || contextLost || !visible || document.hidden) return;
    for (const marker of world.userData.markers || []) marker.scale.setScalar(1/Math.sqrt(camera.zoom));
    scene.updateMatrixWorld(true);
    ao.enabled=current?.view!=='orbit'&&stage.clientWidth>760;
    scene.environmentIntensity=current?.view==='orbit'?0:.25;
    if(current?.view==='orbit')renderer.render(scene,camera);else {syncOcclusionCamera(ao,camera);composer.render();}
    const rect = stage.getBoundingClientRect(), placed = [];
    for (const entry of labels) {
      const point = entry.object.getWorldPosition(new THREE.Vector3()).project(camera);
      const x = (point.x+1)*rect.width/2, y = (1-point.y)*rect.height/2;
      const back = entry.surface && entry.object.position.clone().normalize().dot(camera.position.clone().normalize()) < 0.15;
      if (back || point.z < -1 || point.z > 1 || x < 0 || x > rect.width || y < 0 || y > rect.height) { entry.element.hidden = true; entry.leader.style.display = 'none'; continue; }
      entry.element.hidden = false;
      const width = entry.element.offsetWidth, height = entry.element.offsetHeight;
      const bodyPadding = entry.object.userData.labelRadius ? entry.object.userData.labelRadius*entry.object.scale.x*camera.zoom*rect.width/(camera.right-camera.left)+7 : 9;
      const left = Math.max(4,Math.min(rect.width-width-4,x+bodyPadding));
      let top = Math.max(4,Math.min(rect.height-height-4,y-10+(entry.offsetY || 0)));
      // Reserve label offsets once per layout, not on every camera frame.
      if (entry.offsetY === undefined) {
        for (let attempt=0; attempt<12 && placed.some(p=>left<p.x+p.w+4 && left+width>p.x-4 && top<p.y+p.h+3 && top+height>p.y-3); attempt++) top = Math.max(4,Math.min(rect.height-height-4,top + (y>rect.height/2?-1:1)*(height+4)));
        entry.offsetY = top-(y-10);
      }
      entry.element.style.left = `${left}px`; entry.element.style.top = `${top}px`;
      entry.leader.style.display = '';
      for (const [name,value] of Object.entries({x1:x,y1:y,x2:left,y2:top+height/2})) entry.leader.setAttribute(name,String(value));
      placed.push({x:left,y:top,w:width,h:height});
    }
    if (status.hidden && root.dataset.renderState!=='ready') {root.dataset.renderState='ready';onReady?.();}
  }
  function resize() {
    if (!alive || stage.hidden) return;
    const width = stage.clientWidth, height = stage.clientHeight;
    if (!width || !height) return;
    const previousSize = renderer.getSize(new THREE.Vector2());
    if (previousSize.x !== width || previousSize.y !== height) labels.forEach(entry=>delete entry.offsetY);
    renderer.setSize(width,height,false);composer.setSize(width,height);
    const aspect = width/height, halfHeight = Math.max(radiusY,radius/aspect);
    camera.left = -halfHeight*aspect; camera.right = halfHeight*aspect; camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix(); requestRender();
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(stage);
  controls.addEventListener('change', requestRender);
  function setVisible(value) {
    visible = value;
    controls.enabled = value && !contextLost && (!coarse.matches || touch);
    if (!value) { cancelAnimationFrame(frame); frame = 0; }
    else { resize(); requestRender(); }
  }
  function setTouch(value) { touch = value; controls.enabled = visible && !contextLost && (!coarse.matches || touch); }
  coarse.addEventListener('change', () => setTouch(false), { signal });
  function reset() {
    camera.zoom = 1;
    labels.forEach(entry=>delete entry.offsetY);
    const distance = current?.view === 'orbit' ? Math.max(12,radius*3) : 4;
    camera.position.set(0, current?.view === 'orbit' && current.angle === 'tilt' ? -distance*7/12 : 0, distance);
    camera.up.set(0,1,0); controls.target.set(0,0,0); camera.lookAt(0,0,0); controls.update(); resize();
  }
  function label(object, name, id, pending) {
    const button = document.createElement(id==='sun'?'span':'button');
    if (id!=='sun') button.type = 'button';
    button.className = 'planetary-label'; button.textContent = name; button.dataset.object = id;
    button.title = name; button.setAttribute('aria-label', `Inspect ${name}`);
    button.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') e.stopPropagation(); });
    button.addEventListener('click', () => {
      if (id === 'inner') { root.querySelector('[data-scope]').value = 'inner'; root.querySelector('[data-scope]').dispatchEvent(new Event('change',{bubbles:true})); }
      else if (id === 'equator') onFeature(id);
      else if (id !== 'sun') onSelect(id);
    });
    const leader = document.createElementNS('http://www.w3.org/2000/svg','line');
    pending.push({ object, element: button, leader, surface: id==='equator' });
  }
  async function orbitTexture(name) {
    if (!orbitTextures.has(name)) {
      const pending = new THREE.TextureLoader().loadAsync(`/assets/img/arrival/${name}`).then(texture => {
        if (!alive) { texture.dispose(); throw new DOMException('Viewer disposed','AbortError'); }
        texture.colorSpace = name.endsWith('.jpg') ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.anisotropy = Math.min(4,renderer.capabilities.getMaxAnisotropy());
        texture.userData.cached = true;
        return texture;
      });
      orbitTextures.set(name,pending);
      pending.catch(() => orbitTextures.delete(name));
    }
    return orbitTextures.get(name);
  }
  async function orbitGroup(state) {
    const [bennu,ryugu,day,clouds] = await Promise.all([model('bennu'),model('ryugu'),orbitTexture('earth-day.jpg'),orbitTexture('earth-clouds.png')]);
    const shapes = {bennu,ryugu};
    const group = new THREE.Group(), pending = [], targets = [], colors = color();
    const extent = state.scope === 'solar' ? 34 : 2.05;
    const outer = ['jupiter','saturn','uranus','neptune'];
    const bodies = data.bodies.filter(b => state.scope === 'solar' || !outer.includes(b.id));
    for (const body of bodies) {
      const selected = body.id === state.inspected;
      const asteroid = ['bennu','ryugu'].includes(body.id);
      const tint = selected ? colors.gold : asteroid || body.id === 'earth' ? colors.blue : colors.line;
      const geometry = new THREE.BufferGeometry().setFromPoints(body.points.map(p=>new THREE.Vector3(...p)));
      group.add(new THREE.Line(geometry,new THREE.LineBasicMaterial({color:tint,transparent:true,opacity:selected ? 1 : asteroid ? 0.55 : 0.42})));
      // At solar-system extent, keep the inner bodies small enough to sit behind
      // the central Sun marker; zooming reveals them at their unchanged positions.
      const bodyExtent = state.scope==='solar' && !outer.includes(body.id) ? 2.05 : extent;
      const mesh = createOrbitBody(body.id,bodyExtent,{shape:shapes[body.id],day,clouds});
      mesh.position.set(...ephemeris.position(body.id,state.day)); mesh.userData.id = body.id; group.add(mesh); targets.push(mesh);
      if (selected) mesh.add(halo(extent*0.12));
      if (state.scope !== 'solar' || outer.includes(body.id)) label(mesh,body.id[0].toUpperCase()+body.id.slice(1),body.id,pending);
    }
    const sun = createOrbitBody('sun',extent); group.add(sun);
    label(sun,state.scope==='solar'?'Inner solar system':'Sun',state.scope==='solar'?'inner':'sun',pending);
    group.userData.markers = [...targets,sun];
    const axis = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-extent,0,0),new THREE.Vector3(extent,0,0),new THREE.Vector3(0,-extent,0),new THREE.Vector3(0,extent,0)]);
    group.add(new THREE.LineSegments(axis,new THREE.LineBasicMaterial({color:colors.line,transparent:true,opacity:0.22})));
    return {group,pending,targets,radius:extent};
  }
  async function model(id) {
    if (!cache.has(id)) {
      const pending = (async () => {
        const response = await fetch(`/assets/data/planetary/${id === 'ryugu' ? 'ryugu.obj' : 'bennu.glb'}`, { signal });
        if (!response.ok) throw new Error('Shape model unavailable');
        const object = id === 'ryugu' ? new OBJLoader().parse(await response.text()) : (await new GLTFLoader().parseAsync(await response.arrayBuffer(),'')).scene;
        if (!alive) { disposeObject(object,true); throw new DOMException('Viewer disposed','AbortError'); }
        return normalizeAsteroid(object,id);
      })();
      cache.set(id,pending);
      pending.catch(() => cache.delete(id));
    }
    return cache.get(id);
  }
  async function shapeGroup(state) {
    const ids = state.compare ? ['bennu','ryugu'] : [state.material];
    const originals = await Promise.all(ids.map(model));
    const group = new THREE.Group(), pending = [];
    originals.forEach((original,i) => {
      const object = original.clone(true);
      object.traverse(node => {
        if (node.isMesh) { node.userData.cached = true; node.material = new THREE.MeshStandardMaterial({color:color().body,roughness:0.87,metalness:0,wireframe:state.wireframe}); }
      });
      const scale = state.compare ? object.userData.kilometersPerUnit*1.55 : 1.5;
      object.scale.multiplyScalar(scale);
      object.position.x = state.compare ? (i===0?-0.75:0.6) : 0;
      group.add(object);
      const anchor = new THREE.Object3D(); anchor.position.set(object.position.x,-scale*0.6,0); group.add(anchor);
      if (state.compare) label(anchor,`${ids[i]==='bennu'?'Bennu · mean ~492 m':'Ryugu · mean ~900 m'}`,ids[i],pending);
      else {
        // Anchor the annotation to an actual front-facing vertex near the display equator.
        object.updateMatrixWorld(true);
        let equator = null;
        object.traverse(node => {
          const positions = node.geometry?.attributes.position;
          if (!positions) return;
          for (let vertex=0; vertex<positions.count; vertex++) {
            const point = new THREE.Vector3().fromBufferAttribute(positions,vertex).applyMatrix4(node.matrixWorld);
            if (Math.abs(point.y)<0.06 && (!equator || point.z>equator.z)) equator = point;
          }
        });
        if (equator) { const marker = new THREE.Object3D(); marker.position.copy(equator); group.add(marker); label(marker,'Equatorial profile','equator',pending); }
      }
    });
    const bounds=new THREE.Box3().setFromObject(group);
    return {group,pending,targets:[],radius:state.compare?Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x))*1.16:0.94,radiusY:state.compare?1.05:0.94};
  }
  async function show(next) {

    const state = {...next}, ticket = ++version;
    const changed = !current || ['view','scope','angle','compare','mineral'].some(key=>current[key]!==state[key]) || state.view !== 'orbit' && current.material !== state.material;
    requested = state;
    controls.maxZoom = state.view === 'orbit' ? 64 : 8;
    if (contextLost) { onError(new Error('WebGL context lost')); return; }
    if (state.view === 'shape') { root.dataset.modelReady = 'loading'; status.hidden = false; status.textContent = 'Loading public shape model...'; }
    try {
      const built = state.view === 'orbit' ? await orbitGroup(state) : state.view === 'minerals' ? {group:createMineralGroup(state.mineral,state.separated),pending:[],targets:[],radius:1.55} : await shapeGroup(state);
      if (!alive || contextLost || ticket !== version) { disposeObject(built.group); return false; }
      current = state;
      root.dataset.renderState='rendering';
      radius = built.radius;
      radiusY = built.radiusY || radius;
      scene.remove(world); disposeObject(world); world = built.group; scene.add(world);
      const central = entry => ['sun','inner'].includes(entry.element.dataset.object) ? 0 : 1;
      labels = built.pending.sort((a,b)=>central(a)-central(b)); clickable = built.targets;
      labels.forEach(entry=> { if (entry.element.tagName==='BUTTON') entry.element.setAttribute('aria-pressed',String(entry.element.dataset.object===state.inspected)); });
      const leaders = document.createElementNS('http://www.w3.org/2000/svg','svg');
      leaders.classList.add('planetary-leaders'); leaders.setAttribute('aria-hidden','true'); leaders.append(...labels.map(x=>x.leader));
      const focusedId = labelLayer.contains(document.activeElement) ? document.activeElement.dataset.object : null;
      labelLayer.replaceChildren(leaders,...labels.map(x=>x.element));
      if (focusedId) labels.find(x=>x.element.dataset.object===focusedId)?.element.focus({preventScroll:true});
      labelLayer.hidden = false;
      root.querySelector('[data-fallback]').hidden = true;
      renderer.domElement.style.visibility = '';
      renderer.setClearColor(color().bg);scene.background=new THREE.Color(state.view==='orbit'?color().bg:0x050a0d);
      status.hidden = true;
      root.querySelector('[data-retry]').hidden = true;
      if (state.view === 'minerals') root.dataset.modelReady = state.mineral;
      else if (state.view === 'shape') root.dataset.modelReady = state.compare ? 'compare' : state.material;
      else delete root.dataset.modelReady;
      if (changed) reset(); else resize();
      setFx(focusFx);
      requestRender();
      return true;
    } catch (error) { if (ticket===version) onError(error); return false; }
  }
  function action(name) {

    if (name==='reset') reset();
    else if (name==='zoom-in' || name==='zoom-out') { camera.zoom = THREE.MathUtils.clamp(camera.zoom*(name==='zoom-in'?1.4:1/1.4),controls.minZoom,controls.maxZoom); camera.updateProjectionMatrix(); requestRender(); }
  }
  function rotate(key) {

    const axis = key==='ArrowLeft'||key==='ArrowRight' ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
    camera.position.sub(controls.target).applyAxisAngle(axis,(key==='ArrowLeft'||key==='ArrowUp'?1:-1)*0.14).add(controls.target); camera.lookAt(controls.target); controls.update(); requestRender();
  }
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e=> {down=[e.clientX,e.clientY];}, {signal});
  // OrbitControls captures pointers on the stage, so pointerup is retargeted there.
  stage.addEventListener('pointerup', e=> {
    const start = down; down = null;
    if (!start || Math.hypot(e.clientX-start[0],e.clientY-start[1])>5 || current?.view!=='orbit') return;
    const r = stage.getBoundingClientRect(), ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);
    const hit = ray.intersectObjects(clickable,true)[0]; if (hit) onSelect(hit.object.userData.id);
  }, {signal});
  stage.addEventListener('pointercancel',()=> { down = null; },{signal});
  renderer.domElement.addEventListener('webglcontextlost', event=> {
    event.preventDefault(); contextLost = true; version++;
    cancelAnimationFrame(frame); frame = 0; controls.enabled = false;
    onError(new Error('WebGL context lost'));
  }, {signal});
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    contextLost = false; setVisible(visible); if (requested) show(requested);
  }, {signal});
  return {
    show, setVisible, setTouch, action, rotate, setFx,
    cancelPending() {version++;},
    position: ephemeris.position,
    cameraState() { return {position:camera.position.toArray(),target:controls.target.toArray(),up:camera.up.toArray(),zoom:camera.zoom}; },
    restoreCamera(pose) {
      // This viewer uses a fixed Y-up convention, including after pointer rotation.
      if (!pose || pose.up.some((v,i)=>Math.abs(v-(i===1?1:0))>0.000001)) return;
      camera.position.fromArray(pose.position); controls.target.fromArray(pose.target);
      camera.zoom=THREE.MathUtils.clamp(pose.zoom,controls.minZoom,controls.maxZoom);
      camera.lookAt(controls.target);controls.update();camera.updateProjectionMatrix();requestRender();
    },
    setTime(day) {
      if (requested) requested.day = day;
      if (!current) return;
      current.day = day;
      if (current.view !== 'orbit') return;
      for (const mesh of clickable) mesh.position.set(...ephemeris.position(mesh.userData.id,day));
      requestRender();
    },
    highlight(id) { if (current) show({...current,inspected:id}); },
    theme() { if (requested) show(requested); },
    dispose() {
      if(!alive)return;
      alive = false; lifetime.abort(); version++; cancelAnimationFrame(frame); resizeObserver.disconnect(); controls.dispose();
      disposeObject(world); for (const promise of cache.values()) promise.then(object=>disposeObject(object,true)).catch(()=>{});
      cache.clear(); for (const promise of orbitTextures.values()) promise.then(texture=>texture.dispose()).catch(()=>{}); orbitTextures.clear();ao.dispose();composer.passes.forEach(pass=>{if(pass!==ao)pass.dispose?.();});composer.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); labelLayer.replaceChildren();
    }
  };
}
