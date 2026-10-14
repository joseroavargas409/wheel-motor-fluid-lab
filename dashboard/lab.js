import * as THREE from 'three';
import {createModel} from './inspector/assembly-v3.js';
import {FluidRenderer} from './fluid-renderer.js';
import {COLORS} from './constants.js';
import {OMEGA,AXIAL_OFFSET,bodyPose,bodyMotion,transmission,insideCalculatedCavity,frameAt,bodyVertices,BODY_NAMES} from './coupling.js';
import {contextClipUniforms,installContextClip} from './mechanical-context.js';
const $=id=>document.getElementById(id),fmt=(n,d=1)=>n===null||n===undefined?'—':Number(n).toLocaleString('es-CL',{minimumFractionDigits:d,maximumFractionDigits:d});
const state={data:null,positions:null,frame:0,clock:0,playing:false,ticket:0,count:6,dirty:true,selectedBody:null,selectedInspector:null};
const orbit={theta:-.8,phi:1.16,distance:6,target:new THREE.Vector3(0,1,0)};
let renderer,scene,camera,model,fluid,particleBuffer,bodies=[],probes=[],chamber,previous=performance.now(),drag;
const rawCache=new Map(),dataCache=new Map(),raycaster=new THREE.Raycaster(),clipUniforms=contextClipUniforms();
const shellIDs=new Set(['housing','flange','hub','spindle','bearingSeats','endShields','parkingHousing','jointBands']);
const replacedIDs=new Set(['ringHigh','sunHigh','planetsHigh','carrierHigh','intermediate','ringLow','sunLow','planetsLow','carrierLow','planetBearings','thrust']);
function geometryFor(b){const {vertices,indices}=bodyVertices(b),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;}
function disposeGroup(group){group?.traverse(o=>{o.geometry?.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){m?.map?.dispose();m?.dispose();}});group?.parent?.remove(group);}
function init(){
 scene=new THREE.Scene();scene.background=new THREE.Color('#091823');camera=new THREE.PerspectiveCamera(38,1,.015,40);camera.up.set(0,0,1);
 renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.localClippingEnabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#091823');$('viewport').prepend(renderer.domElement);
 scene.add(new THREE.HemisphereLight('#d8edff','#27454e',2.5));for(const [color,power,xyz] of [['#fff0d3',3.5,[2,-2,4]],['#80cfe2',2,[-3,3,2]],['#efb763',1,[1,4,-1]]]){const light=new THREE.DirectionalLight(color,power);light.position.fromArray(xyz);scene.add(light);}
 const grid=new THREE.GridHelper(8,40,'#365163','#18303e');grid.rotation.x=Math.PI/2;grid.position.z=-.63;scene.add(grid);
 model=createModel();model.assembly.applyMatrix4(new THREE.Matrix4().set(-1,0,0,0, 0,0,1,AXIAL_OFFSET, 0,1,0,0, 0,0,0,1));scene.add(model.assembly);
 for(const p of model.parts.values())for(const m of p.meshes){m.userData.inspectorPart=p.id;installContextClip(m.material,clipUniforms,shellIDs.has(p.id));}
 // The cavity is a closed fixed cylinder, exactly as in the engine. Transparency is visual only.
 const shellMaterial=new THREE.MeshStandardMaterial({color:'#b8d8e4',metalness:.2,roughness:.25,transparent:true,opacity:.075,depthWrite:false,side:THREE.DoubleSide});
 chamber=new THREE.Mesh(geometryFor({inner:.5,outer:.506,length:.9,teeth:0}),shellMaterial);chamber.userData.label='Recinto SPH fijo · Ø1,0 × 0,9 m';installContextClip(shellMaterial,{labExcludeCavity:{value:0},labCutHousing:clipUniforms.labCutHousing},true);scene.add(chamber);
 for(const [id,text,point] of [['high','ALTA · 300 → 60 rpm',[.34,.21,.40]],['low','BAJA · 60 → 9,20 rpm',[-.24,-.21,.42]],['hub','CUBO · 9,20 rpm',[.48,-.35,-.27]]]){const label=document.createElement('span');label.className='mechanism-label '+id;label.textContent=text;label.dataset.point=JSON.stringify(point);$('mechanism-labels').append(label);}
 const el=renderer.domElement;el.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,pan:e.shiftKey};el.setPointerCapture(e.pointerId);});
 el.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(drag.pan){const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);orbit.target.addScaledVector(right,-dx*.001*orbit.distance).addScaledVector(up,dy*.001*orbit.distance);}else{orbit.theta-=dx*.006;orbit.phi=THREE.MathUtils.clamp(orbit.phi+dy*.006,.06,Math.PI-.06);}drag.x=e.clientX;drag.y=e.clientY;state.dirty=true;});
 el.addEventListener('pointerup',e=>{if(drag&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<4)pick(e);drag=null;});el.addEventListener('pointercancel',()=>drag=null);el.addEventListener('contextmenu',e=>e.preventDefault());
 el.addEventListener('wheel',e=>{e.preventDefault();orbit.distance=THREE.MathUtils.clamp(orbit.distance*Math.exp(e.deltaY*.001),.75,13);state.dirty=true;},{passive:false});
 $('viewport').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')orbit.theta-=.12;if(e.key==='ArrowRight')orbit.theta+=.12;if(e.key==='ArrowUp')orbit.phi=Math.max(.06,orbit.phi-.12);if(e.key==='ArrowDown')orbit.phi=Math.min(Math.PI-.06,orbit.phi+.12);if(e.key==='+')orbit.distance*=.9;if(e.key==='-')orbit.distance*=1.1;state.dirty=true;});
 new ResizeObserver(resize).observe($('viewport'));resize();requestAnimationFrame(animate);
}
function resize(){if(!renderer)return;const v=$('viewport');if(!v.clientWidth||!v.clientHeight)return;const aspect=v.clientWidth/v.clientHeight;orbit.distance*=Math.max(1,1/aspect)/Math.max(1,1/camera.aspect);renderer.setSize(v.clientWidth,v.clientHeight,false);camera.aspect=aspect;camera.updateProjectionMatrix();fluid?.resize(Math.round(v.clientWidth*renderer.getPixelRatio()),Math.round(v.clientHeight*renderer.getPixelRatio()));state.dirty=true;plotAll();}
function resetCamera(){const focus=$('view').value==='reducer';orbit.target.set(0,focus?0:1.05,0);orbit.distance=(focus?2.45:5.6)*Math.max(1,1/camera.aspect);orbit.theta=-.8;orbit.phi=1.16;state.dirty=true;}
function visuals(){
 const original=$('view').value==='inspector',presentation=$('mechanical-view').value;
 clipUniforms.labExcludeCavity.value=original?0:1;clipUniforms.labCutHousing.value=presentation==='cutaway'?1:0;
 for(const p of model.parts.values()){
  p.group.visible=!['rims','tires','outerFrame'].includes(p.id)&&$('view').value!=='reducer'&&(original||!replacedIDs.has(p.id));
  if(shellIDs.has(p.id)&&!$('shell').checked)p.group.visible=false;
  for(const m of p.meshes){const mat=m.material,shell=shellIDs.has(p.id);mat.opacity=shell?(presentation==='transparent'?.13:1):1;if(['stator','rotor'].includes(p.id))mat.opacity=p.id==='stator'?.23:.6;if(['carrierHigh','carrierLow'].includes(p.id))mat.opacity=.32;mat.transparent=mat.opacity<1;mat.depthWrite=!mat.transparent;mat.clippingPlanes=[];mat.needsUpdate=true;if(m.userData.role==='lamination')m.visible=false;}
 }
 for(const b of bodies)b.visible=!original;
 chamber.visible=!original&&$('shell').checked;
 for(const p of probes)p.visible=!original&&$('probes').checked&&p.userData.index<state.count;
 $('style').disabled=original;$('probes').disabled=original;$('motion-labels').disabled=original;$('mechanical-part').disabled=original;
 $('scene-title').textContent=original?'Inspector original · revisión 03':$('view').value==='reducer'?'Aceite dentro del doble planetario':'Ensamble integrado';
 $('scene-note').textContent=original?'Geometría de referencia del inspector · aceite oculto':$('style').value==='particles'?'Aceite calculado · partículas físicas de 32 mm':'Cubo móvil · coronas fijas · aceite dentro del reductor';
 if(fluid)fluid.mode=$('style').value==='particles'?'particles':'smooth';if(state.data)updateMotionReadout(state.data.samples[state.frame].mechanism_time_s??state.data.times[state.frame]);state.dirty=true;
}
function makeProbe(p,index){const group=new THREE.Group();group.position.fromArray(p.position);group.userData={index,label:`${p.id} · ${p.name}`};
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(.012,14,10),new THREE.MeshBasicMaterial({color:COLORS[index]}));mesh.userData.label=group.userData.label;group.add(mesh);
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle='#08141fe8';ctx.fillRect(7,6,114,52);ctx.font='bold 31px sans-serif';ctx.textAlign='center';ctx.fillStyle=COLORS[index];ctx.fillText(p.id,64,44);
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthWrite:false,depthTest:false}));sprite.scale.set(.12,.06,1);sprite.position.z=.045;sprite.renderOrder=8;group.add(sprite);scene.add(group);return group;
}
function buildCase(d){
 bodies.forEach(disposeGroup);probes.forEach(disposeGroup);bodies=[];probes=[];fluid?.dispose();
 const counts={};for(const [index,b] of d.geometry.entries()){const stage=b.stage?'baja':'alta',key=stage+':'+b.role;counts[key]=(counts[key]||0)+1;const suffix=b.role===1?' '+counts[key]:'';
  const mesh=new THREE.Mesh(geometryFor(b),new THREE.MeshStandardMaterial({color:b.role===0?(b.stage?'#81b4f0':'#e4ba68'):b.role===1?'#b4c8d9':b.role===2?'#667883':b.role===3?(b.stage?'#81b4f0':'#d4aa69'):'#b2c4cf',metalness:.65,roughness:.35,transparent:[2,3].includes(b.role),opacity:b.role===2?.32:b.role===3?.52:1,depthWrite:![2,3].includes(b.role),side:THREE.DoubleSide}));
  const label=b.role===4?(b.center_y>.2?'Eje de entrada del rotor':b.center_y<-.2?'Acoplamiento de salida al cubo':'Acoplamiento entre alta y baja'):`${BODY_NAMES[b.role]}${suffix} · etapa ${stage}`;
  mesh.userData={body:b,index,label};
  // Orientation marks lie on the existing metal face and share its exact motion.
  for(const sign of [-1,1]){const mark=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(b.inner+.004,sign*(b.length/2+.0003),0),new THREE.Vector3(Math.max(b.inner+.005,b.outer-.019),sign*(b.length/2+.0003),0)]),new THREE.LineBasicMaterial({color:'#fff1cf'}));mesh.add(mark);}
  scene.add(mesh);bodies.push(mesh);
 }
 mechanicalPartList();
 particleBuffer=new Float32Array(d.summary.particles*3);fluid=new FluidRenderer(renderer,scene,camera,particleBuffer,d.summary.particle_radius_m||.016);d.probes.forEach((p,i)=>probes.push(makeProbe(p,i)));resize();visuals();selectBody(state.selectedBody);
}
function mechanism(sample){const t=sample.mechanism_time_s??sample.time_s;
 for(const mesh of bodies){const pose=bodyPose(mesh.userData.body,t);mesh.position.fromArray(pose.position);mesh.rotation.y=pose.angle;}
 // The inspector's Z rotations transform into SPH Y rotations with the same sign.
 for(const m of model.motions)m.object.rotation.z=OMEGA*t*m.ratio+(m.phase||0);
 updateMotionReadout(t);
}
function mechanicalPartList(){const select=$('mechanical-part');select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Selecciona una pieza de la transmisión';select.append(empty);for(const [i,m] of bodies.entries()){const op=document.createElement('option');op.value=String(i);op.textContent=m.userData.label;select.append(op);}if(state.selectedBody!==null&&bodies[state.selectedBody])select.value=String(state.selectedBody);else state.selectedBody=null;}
function motionDescription(b){const stage=b.stage?'baja':'alta';if(b.role===0)return b.stage?'Recibe el movimiento del portaplanetas de alta y lo entrega a los satélites de baja.':'Recibe el movimiento del rotor y entrega la entrada a la primera reducción.';if(b.role===1)return `Gira sobre su eje mientras su centro orbita con el portaplanetas de ${stage}. El signo negativo indica giro propio contrario a la entrada.`;if(b.role===2)return 'Permanece fija y recibe la reacción de los satélites a través del soporte. No gira con el cubo de salida.';if(b.role===3)return b.stage?'Transporta los centros de los satélites de baja y entrega el giro reducido al cubo de rueda.':'Transporta los centros de los satélites de alta y conecta la salida de esta etapa con el solar de baja.';return b.center_y>.2?'Acoplamiento de entrada ligado al rotor.':b.center_y<-.2?'Acoplamiento de salida ligado al portaplanetas de baja.':'Acoplamiento intermedio: enlaza la salida de alta con la entrada de baja.';}
function selectBody(index){state.selectedBody=Number.isInteger(index)?index:null;state.selectedInspector=null;$('mechanical-part').value=state.selectedBody===null?'':String(state.selectedBody);for(const [i,m] of bodies.entries()){m.material.emissive.set(i===state.selectedBody?'#a65b15':'#000000');m.material.emissiveIntensity=i===state.selectedBody?.30:0;}for(const p of model.parts.values())for(const m of p.meshes)m.material.emissive.set('#000000');const body=bodies[state.selectedBody];if(body){$('selection').replaceChildren();const b=document.createElement('b'),text=document.createElement('span');b.textContent=body.userData.label;text.textContent=' · '+motionDescription(body.userData.body);$('selection').append(b,text);}else $('selection').textContent='Pulsa una pieza del modelo o selecciona un componente de la transmisión.';if(state.data)updateMotionReadout(state.data.samples[state.frame].mechanism_time_s??state.data.times[state.frame]);state.dirty=true;}
function updateMotionReadout(time){
 if(!state.data)return;
 const chain=transmission(state.data.geometry,time);
 for(const name of ['input','intermediate','output'])$(name+'-rpm').textContent=fmt(chain[name].rotationRpm,name==='output'?2:0)+' rpm';
 const m=bodies[state.selectedBody];$('motion-readout').hidden=!m||$('view').value==='inspector';
 if(!m){$('motion-function').textContent='Las coronas permanecen fijas; los satélites giran y orbitan; el portaplanetas de baja entrega el movimiento al cubo.';return;}
 const motion=bodyMotion(m.userData.body,time);
 $('rotation-rpm').textContent=fmt(motion.rotationRpm,2)+' rpm';$('orbit-rpm').textContent=fmt(motion.orbitRpm,2)+' rpm';$('rotation-angle').textContent=fmt(motion.angle,1)+'°';$('motion-function').textContent=motionDescription(m.userData.body);
}
function updateMechanismLabels(){
 const original=$('view').value==='inspector',boxes=[],viewport=$('viewport');
 for(const label of $('mechanism-labels').children){
  const point=new THREE.Vector3().fromArray(JSON.parse(label.dataset.point));point.project(camera);
  label.hidden=original||!$('motion-labels').checked||point.z>1||Math.abs(point.x)>.9||Math.abs(point.y)>.9||(label.classList.contains('hub')&&$('view').value==='reducer');
  if(label.hidden)continue;
  const width=label.offsetWidth||130;
  const x=THREE.MathUtils.clamp((point.x+1)*.5*viewport.clientWidth,width/2+7,viewport.clientWidth-width/2-7);
  let y=(1-point.y)*.5*viewport.clientHeight;
  for(let n=0;n<4&&boxes.some(p=>Math.abs(x-p.x)<(width+p.width)/2&&Math.abs(y-p.y)<30);n++)y-=31;
  y=THREE.MathUtils.clamp(y,18,viewport.clientHeight-58);
  boxes.push({x,y,width});label.style.left=x+'px';label.style.top=y+'px';
 }
}
function setTime(clock){if(!state.data)return;const d=state.data;state.clock=THREE.MathUtils.clamp(clock,0,d.times.at(-1));const frame=frameAt(d.times,state.clock);state.frame=frame;
 const stride=d.summary.particles*3;particleBuffer.set(state.positions.subarray(frame*stride,(frame+1)*stride));fluid.setPositions();mechanism(d.samples[frame]);
 $('seek').value=frame;$('time').textContent=fmt(d.times[frame],3)+' s';
 if(state.tableFrame!==frame){state.tableFrame=frame;readings();plotAll();}state.dirty=true;
}
function sensorList(){if(!state.data)return;const previous=$('sensor').value;$('sensor').replaceChildren();for(const p of state.data.probes.slice(0,state.count)){const op=document.createElement('option');op.value=p.id;op.textContent=`${p.id} · ${p.name}`;$('sensor').append(op);}if(state.data.probes.slice(0,state.count).some(p=>p.id===previous))$('sensor').value=previous;
 $('count-value').textContent=state.count;$('case-name').textContent=`${state.data.lab_backend==='v41'?'V4.1':'V4'} / ${state.data.summary.oil_liters} L / ${state.count} SONDAS`;
 $('sensor-note').textContent=state.data.lab_backend==='v41'?'Capacitancia coaxial ilustrativa; película residual y respuesta electrónica modeladas. Las sondas no están calibradas con un sensor comercial.':'V4 usa un proxy lineal de capacitancia; no modela película ni exclusión local de metal. No corresponde a un sensor comercial calibrado.';
 history.replaceState(null,'','?'+new URLSearchParams({oil:String(state.data.summary.oil_liters),sensors:String(state.count),backend:state.data.lab_backend}));
 $('csv').href=`/api/csv?backend=${state.data.lab_backend}&oil=${state.data.summary.oil_liters}&sensors=${state.count}`;visuals();readings();plotAll();
}
function readings(){if(!state.data)return;const f=state.data.samples[state.frame],selected=$('sensor').value,index=state.data.probes.findIndex(p=>p.id===selected),s=f.sensors[index];$('rows').replaceChildren();
 const names={wet:'Aceite',mixed:'Mixto',dry:'Seco / aire',unavailable:'Sin lectura'};
 for(const [i,p] of state.data.probes.slice(0,state.count).entries()){const reading=f.sensors[i],row=document.createElement('tr');const values=[p.id,p.name,reading.oil_fraction===null?'—':fmt(reading.oil_fraction*100,1)+' %',reading.air_fraction===null?'—':fmt(reading.air_fraction*100,1)+' %',fmt(reading.capacitance_pf??reading.capacitance_proxy_pf,3)+' pF',reading.film_thickness_um===undefined?'No modelada':fmt(reading.film_thickness_um,1)+' µm',fmt(reading.level_mm,0)+' mm',names[reading.state]||reading.state];
  const first=document.createElement('td'),id=document.createElement('b'),name=document.createElement('span');id.textContent=values[0];id.style.color=COLORS[i];name.textContent=values[1];first.append(id,name);row.append(first);for(let j=2;j<values.length;j++){const td=document.createElement('td');if(j===values.length-1){const badge=document.createElement('span');badge.className='state '+reading.state;badge.textContent=values[j];td.append(badge);}else td.textContent=values[j];row.append(td);}$('rows').append(row);
 }
 if(s){$('live').replaceChildren();const value=document.createElement('b'),description=document.createElement('span');value.textContent=s.oil_fraction===null?'—':fmt(s.oil_fraction*100,1)+' %';description.textContent=`${selected} · ${names[s.state]||s.state} · ${fmt(s.capacitance_pf??s.capacitance_proxy_pf,3)} pF`;$('live').append(value,description);$('plot-sensor').textContent=selected;}
}
function plot(id,key){const c=$(id),w=c.clientWidth,h=c.clientHeight;if(!state.data||!w||!h)return;const dpr=Math.min(devicePixelRatio,2);c.width=w*dpr;c.height=h*dpr;const ctx=c.getContext('2d');ctx.scale(dpr,dpr);const idx=state.data.probes.findIndex(p=>p.id===$('sensor').value);if(idx<0)return;
 const samples=state.data.samples,values=samples.map(f=>key==='capacitance'?f.sensors[idx].capacitance_pf??f.sensors[idx].capacitance_proxy_pf:f.sensors[idx].oil_fraction),valid=values.filter(v=>Number.isFinite(v)),min=key==='capacitance'?Math.floor(Math.min(...valid)*2)/2:0,max=key==='capacitance'?Math.ceil(Math.max(...valid)*2)/2+.25:1,left=32,top=8,bottom=22,pw=w-left-8,ph=h-top-bottom,end=state.data.times.at(-1);
 ctx.font='9px sans-serif';for(let k=0;k<=3;k++){const y=top+ph*k/3;ctx.strokeStyle='#28404f';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-8,y);ctx.stroke();ctx.fillStyle='#6f8da3';ctx.textAlign='right';ctx.fillText(fmt(min+(max-min)*(1-k/3),key==='capacitance'?1:1),left-5,y+3);}ctx.textAlign='left';ctx.fillText('0 s',left,h-3);ctx.textAlign='right';ctx.fillText(fmt(end,1)+' s',w-8,h-3);
 ctx.strokeStyle=COLORS[idx];ctx.lineWidth=1.5;ctx.beginPath();let pen=false;samples.forEach((f,i)=>{if(!Number.isFinite(values[i])){pen=false;return;}const x=left+f.time_s/end*pw,y=top+ph*(1-(values[i]-min)/(max-min));if(pen)ctx.lineTo(x,y);else ctx.moveTo(x,y);pen=true;});ctx.stroke();const cursor=left+state.data.times[state.frame]/end*pw;ctx.strokeStyle='#ebf4fb8c';ctx.beginPath();ctx.moveTo(cursor,top);ctx.lineTo(cursor,top+ph);ctx.stroke();
}
function plotAll(){plot('occupation','oil');plot('capacitance','capacitance');}
async function api(url){const r=await fetch(url),d=await r.json();if(!r.ok)throw new Error(d.error||'No se pudo cargar el caso.');return d;}
async function load(){const ticket=++state.ticket,backend=$('backend').value,oil=Number($('oil').value),key=backend+':'+oil;state.playing=false;$('play').textContent='▶ Reproducir';$('play').disabled=true;$('loading').hidden=false;$('loading').textContent='Cargando las trayectorias físicas y las sondas…';
 try{let d=dataCache.get(key);if(!d){d=await api(`/api/result?backend=${backend}&oil=${oil}&sensors=12`);dataCache.set(key,d);}let positions=rawCache.get(key);if(!positions){const r=await fetch(d.positions_url);if(!r.ok)throw new Error('No se pudieron cargar las trayectorias.');positions=new Float32Array(await r.arrayBuffer());rawCache.set(key,positions);if(rawCache.size>2)rawCache.delete(rawCache.keys().next().value);}
  if(ticket!==state.ticket)return;if(positions.length!==d.summary.particles*3*d.times.length)throw new Error('Trayectorias incompletas.');state.data=d;state.positions=positions;state.frame=0;state.clock=0;state.tableFrame=-1;buildCase(d);sensorList();resetCamera();setTime(0);
  $('mass').textContent=fmt(d.summary.mass_kg,1)+' kg';$('duration').textContent=fmt(d.summary.duration_s,1)+' s';$('particles').textContent=d.summary.particles.toLocaleString('es-CL');$('projection').textContent=fmt(d.summary.max_projection_m*1000,3)+' mm';$('seek').max=d.times.length-1;$('quality').textContent='Controles numéricos aprobados';$('quality').classList.remove('error');$('play').disabled=false;$('sampling').textContent=`${d.times.length} cuadros · 50 Hz · posiciones fijas`;$('loading').hidden=true;
  const params=new URLSearchParams({oil:String(oil),sensors:String(state.count),backend});history.replaceState(null,'','?'+params);await compare(oil,ticket);
 }catch(e){if(ticket!==state.ticket)return;$('loading').hidden=false;$('loading').textContent=e.message;$('quality').textContent='Caso no disponible';$('quality').classList.add('error');console.error(e);}
}
async function compare(oil,ticket){const data=await api(`/api/compare?oil=${oil}`);if(ticket!==state.ticket)return;$('compare').replaceChildren();const rows=[['', 'V4','V4.1'],['Ventana medida',fmt(data.v4.duration_s,1)+' s',fmt(data.v41.duration_s,1)+' s'],['Preparación', 'Sin preparación','3 s + 2 s de rampa'],['Masa',fmt(data.v4.mass_kg,1)+' kg',fmt(data.v41.mass_kg,1)+' kg'],['Corrección máx.',fmt(data.v4.max_projection_m*1000,3)+' mm',fmt(data.v41.max_projection_m*1000,3)+' mm'],['Sonda','Proxy lineal','Coaxial + mojado']];for(const values of rows){const row=document.createElement('div');row.className='compare-row';values.forEach((value,i)=>{const el=document.createElement(i===0?'span':'b');el.textContent=value;row.append(el);});$('compare').append(row);}}
function pick(e){const r=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);scene.updateMatrixWorld(true);const hit=raycaster.intersectObjects(scene.children,true).find(h=>{const o=h.object;if(!o.visible||!o.material||o.material.opacity<.25)return false;let p=o;while(p){if(!p.visible)return false;p=p.parent;}if(o.userData.inspectorPart&&$('view').value!=='inspector'&&insideCalculatedCavity(h.point.toArray()))return false;const isHousing=o===chamber||shellIDs.has(o.userData.inspectorPart);if(isHousing&&$('mechanical-view').value==='cutaway'&&h.point.x>0&&h.point.z>0)return false;return o.userData.inspectorPart||o.userData.body||o.userData.label;});if(!hit)return;if(hit.object.userData.body){selectBody(hit.object.userData.index);return;}selectBody(null);const p=model.parts.get(hit.object.userData.inspectorPart);state.selectedInspector=p?.id;for(const part of model.parts.values())for(const mesh of part.meshes){mesh.material.emissive.set(part.id===p?.id?'#a65b15':'#000000');mesh.material.emissiveIntensity=.22;}$('selection').replaceChildren();const title=document.createElement('b'),text=document.createElement('span');title.textContent=p?p.name:hit.object.userData.label;text.textContent=' · '+(p?p.description:'Ubicación virtual de observación, sin cuerpo sólido intrusivo.');$('selection').append(title,text);state.dirty=true;}
function render(){camera.position.set(orbit.target.x+orbit.distance*Math.sin(orbit.phi)*Math.cos(orbit.theta),orbit.target.y+orbit.distance*Math.sin(orbit.phi)*Math.sin(orbit.theta),orbit.target.z+orbit.distance*Math.cos(orbit.phi));camera.lookAt(orbit.target);camera.updateMatrixWorld(true);if(fluid&&$('view').value!=='inspector'&&$('style').value!=='hidden')fluid.render();else{renderer.setRenderTarget(null);renderer.render(scene,camera);}updateMechanismLabels();}
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.08,(now-previous)/1000);previous=now;if(state.playing&&state.data){const next=state.clock+dt*Number($('speed').value);if(next>=state.data.times.at(-1)){state.playing=false;$('play').textContent='▶ Reproducir';setTime(state.data.times.at(-1));}else setTime(next);}if(state.dirty){render();state.dirty=false;}}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
$('backend').addEventListener('change',load);$('oil').addEventListener('change',load);$('count').addEventListener('input',()=>{state.count=Number($('count').value);sensorList();});$('view').addEventListener('change',()=>{visuals();resetCamera();});for(const id of ['style','shell','probes'])$(id).addEventListener('change',visuals);$('fit').addEventListener('click',resetCamera);$('sensor').addEventListener('change',()=>{readings();plotAll();});$('play').addEventListener('click',()=>{if(!state.playing&&state.clock>=state.data.times.at(-1))setTime(0);state.playing=!state.playing;$('play').textContent=state.playing?'Ⅱ Pausar':'▶ Reproducir';});$('seek').addEventListener('input',()=>{state.playing=false;$('play').textContent='▶ Reproducir';setTime(state.data.times[Number($('seek').value)]);});$('snapshot').addEventListener('click',()=>{render();renderer.domElement.toBlob(b=>b&&download(b,'wheel-motor-fluid-lab.png'));});$('evidence').addEventListener('click',()=>$('evidence-dialog').showModal());$('close-evidence').addEventListener('click',()=>$('evidence-dialog').close());
$('mechanical-view').addEventListener('change',visuals);$('motion-labels').addEventListener('change',()=>state.dirty=true);$('mechanical-part').addEventListener('change',()=>selectBody($('mechanical-part').value===''?null:Number($('mechanical-part').value)));document.querySelectorAll('[data-chain]').forEach(button=>button.addEventListener('click',()=>{if(!state.data)return;if($('view').value==='inspector'){$('view').value='all';visuals();}const type=button.dataset.chain,index=state.data.geometry.findIndex(b=>type==='input'?b.stage===0&&b.role===0:type==='intermediate'?b.stage===0&&b.role===3:b.stage===1&&b.role===3);selectBody(index);}));
const params=new URLSearchParams(location.search);if(['55','95','125'].includes(params.get('oil')))$('oil').value=params.get('oil');if(['v4','v41'].includes(params.get('backend')))$('backend').value=params.get('backend');const initialCount=Number(params.get('sensors')||6);if(Number.isInteger(initialCount)&&initialCount>=2&&initialCount<=12){state.count=initialCount;$('count').value=initialCount;}
try{init();load();}catch(e){$('loading').textContent='No se pudo abrir la vista 3D. '+e.message;console.error(e);}
