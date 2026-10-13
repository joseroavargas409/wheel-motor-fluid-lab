import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {FIXED} from './dashboard/constants.js';import {SensorArray} from './dashboard/sensor-model.js';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
export const statsKeys=['engine_elapsed_s','particles','mass_kg','kinetic_energy_j','max_speed_m_s','max_native_speed_m_s','max_projection_m','projected_particle_steps','max_solid_penetration','outside_particles','finite','oil_top_z_m','splash_particles','initial_surface_z_m','particle_radius_m','motor_omega_rad_s'];
const bodyKeys=['index','stage','role','center_y','inner','outer','length','teeth','inward','phase','orbit','speed_factor','orbit_factor'];
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export const engineHash=()=>hash(path.join(ROOT,'dashboard/oil_engine.wasm'));
function nativeRun(exe,args){return new Promise((resolve,reject)=>{const child=spawn(exe,args,{cwd:ROOT,env:{...process.env,RAYON_NUM_THREADS:process.env.RAYON_NUM_THREADS||'2'},stdio:['ignore','inherit','inherit']});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Motor nativo rechazo el calculo: '+code)));});}
export async function computeCase(liters,{output=path.join(ROOT,'data/volumes',String(liters)),drive=true,radius=FIXED.particle_radius_m,duration=FIXED.duration_s,settle=FIXED.settle_s,ramp=FIXED.ramp_s,dt=.001,surface=true,rawOnly=false}={}){
 if(!Number.isFinite(liters)||liters<30||liters>145)throw new Error('Volumen permitido: 30 a 145 L.');
 const start=performance.now(),raw=path.join(output,'raw'),exe=process.env.OA2IS_ENGINE||path.join(ROOT,'engine/target/release',process.platform==='win32'?'oa2is_oil_native.exe':'oa2is_oil_native');
 fs.mkdirSync(raw,{recursive:true});let nativeMeta;
 if(fs.existsSync(exe)){
  await nativeRun(exe,[liters,radius,duration,dt,settle,ramp,raw,surface?1:0,drive?1:0].map(String));nativeMeta=JSON.parse(fs.readFileSync(path.join(raw,'meta.json'),'utf8'));
 }else{
  const module=new WebAssembly.Module(fs.readFileSync(path.join(ROOT,'dashboard/oil_engine.wasm')));if(WebAssembly.Module.imports(module).length)throw new Error('WASM requiere importaciones inesperadas.');
  const e=new WebAssembly.Instance(module,{}).exports,n=e.initialize_configured(liters,radius,dt,surface?1:0);
  e.advance_to(settle,0);
  for(let t=settle+.01;t<settle+ramp-1e-8;t+=.01)e.advance_to(t,drive?.5-.5*Math.cos(Math.PI*(t-settle)/ramp):0);
  e.advance_to(settle+ramp,drive?1:0);
  const geometry_flat=Array.from(new Float32Array(e.memory.buffer,e.geometry_ptr(),13*e.body_count()));
  nativeMeta={particles:n,frames:Math.round(duration/FIXED.frame_interval_s)+1,duration_s:duration,radius_m:radius,dt_max_s:dt,settle_s:settle,ramp_s:ramp,phase_offset_s:e.phase_time(),geometry_flat,backend:'WASM'};
  fs.writeFileSync(path.join(raw,'meta.json'),JSON.stringify(nativeMeta));
  const fd=fs.openSync(path.join(raw,'positions.bin'),'w'),logs=[];
  try{for(let frame=0;frame<nativeMeta.frames;frame++){const time_s=frame*FIXED.frame_interval_s;e.advance_to(settle+ramp+time_s,drive?1:0);fs.writeSync(fd,Buffer.from(e.memory.buffer,e.positions_ptr(),n*12));logs.push(JSON.stringify({time_s,mechanism_time_s:e.phase_time(),metrics:Array.from(new Float32Array(e.memory.buffer,e.stats_ptr(),16))}));if(frame%50===0)console.log(JSON.stringify({physical_s:time_s,backend:'WASM'}));}}finally{fs.closeSync(fd);}
  fs.writeFileSync(path.join(raw,'frames.ndjson'),logs.join('\n'));
 }
 if(rawOnly)return nativeMeta;
 return finalizeCase(liters,{output,raw,nativeMeta,start,drive});
}
export function finalizeCase(liters,{output,raw=path.join(output,'raw'),nativeMeta=JSON.parse(fs.readFileSync(path.join(raw,'meta.json'),'utf8')),start=performance.now(),drive=true}={}){
 const {particles:n,frames,radius_m:radius}=nativeMeta;
 const geometry=Array.from({length:nativeMeta.geometry_flat.length/13},(_,i)=>Object.fromEntries(nativeMeta.geometry_flat.slice(i*13,i*13+13).map((x,j)=>[bodyKeys[j],x])));
 const lines=fs.readFileSync(path.join(raw,'frames.ndjson'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
 const sensor=new SensorArray(liters/1000/n,{particleRadius:radius,geometry}),samples=[],times=[],fd=fs.openSync(path.join(raw,'positions.bin'),'r'),buffer=Buffer.alloc(n*12);
 try{for(let frame=0;frame<frames;frame++){if(fs.readSync(fd,buffer,0,buffer.length,frame*buffer.length)!==buffer.length)throw new Error('Trayectorias incompletas.');const positions=new Float32Array(buffer.buffer,buffer.byteOffset,n*3),f=lines[frame];if(!f)throw new Error('Faltan metricas.');const metrics=Object.fromEntries(f.metrics.map((x,i)=>[statsKeys[i],x]));times.push(f.time_s);samples.push({time_s:f.time_s,mechanism_time_s:f.mechanism_time_s,metrics,sensors:sensor.sample(f.time_s,positions,f.mechanism_time_s)});if(frame%100===0)console.log(JSON.stringify({sensor_frame:frame,frames}));}}finally{fs.closeSync(fd);}
 const last=samples.at(-1).metrics;
 const checks={duration_at_least_20_s:times.at(-1)>=20-1e-6,finite:samples.every(s=>s.metrics.finite===1),mass_preserved:samples.every(s=>Math.abs(s.metrics.mass_kg-liters/1000*FIXED.density_kg_m3)<1e-4),particles_preserved:samples.every(s=>s.metrics.particles===n),contained:samples.every(s=>s.metrics.outside_particles===0),solid_free:last.max_solid_penetration===0,bounded_projection:last.max_projection_m<=FIXED.numerical_projection_limit_m,bounded_speed:last.max_native_speed_m_s<20};
 const nativeExe=path.join(ROOT,'engine/target/release',process.platform==='win32'?'oa2is_oil_native.exe':'oa2is_oil_native');
 const summary={oil_liters:liters,particles:n,mass_kg:last.mass_kg,duration_s:times.at(-1),frames,particle_radius_m:radius,spacing_m:2*radius,settle_s:nativeMeta.settle_s,ramp_s:nativeMeta.ramp_s,phase_offset_s:nativeMeta.phase_offset_s,engine:'Salva DFSPH · SI viscosity · surface tension · relative moving-wall divergence',engine_sha256:engineHash(),native_sha256:fs.existsSync(nativeExe)?hash(nativeExe):null,numerical_checks:checks,numerically_accepted:Object.values(checks).every(Boolean),maturity:'Simulada – no validada con mediciones',wall_clock_s:(performance.now()-start)/1000,max_projection_m:last.max_projection_m,max_native_speed_m_s:last.max_native_speed_m_s,final_kinetic_energy_j:last.kinetic_energy_j,drive,constants:{...FIXED,particle_radius_m:radius},sensor_model:'Coaxial analytical permittivity + unresolved film model + first-order electronics; virtual non-intrusive probes',air_model:'Inferred from SPH liquid occupancy; no gas momentum in this backend'};
 const data={summary,constants:summary.constants,times,samples,geometry,positions_file:'positions.bin',particle_stride:3};
 fs.mkdirSync(output,{recursive:true});fs.copyFileSync(path.join(raw,'positions.bin'),path.join(output,'positions.bin'));fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(data));fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(summary,null,2));
 if(!summary.numerically_accepted)throw new Error('Controles numericos rechazados: '+JSON.stringify(checks));return data;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const liters=Number(process.argv[2]||95),output=process.argv[3]||path.join(ROOT,'data/volumes',String(liters));
 try{if(process.argv.includes('--finalize'))finalizeCase(liters,{output});else await computeCase(liters,{output,drive:!process.argv.includes('--stopped')});}catch(e){console.error(e.stack||e.message);process.exitCode=1;}
}
