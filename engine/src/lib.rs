//! Open-source fluid engine exported through a plain WebAssembly ABI.
//! Prescribed constant mechanism, no proprietary native library or Python binding.
use std::cell::RefCell;
use std::f32::consts::PI;
use nalgebra::Vector3;
use salva3d::{LiquidWorld,TimestepManager};
use salva3d::object::{Fluid,FluidHandle,Boundary,BoundaryHandle};
use salva3d::object::interaction_groups::InteractionGroups;
use salva3d::solver::{DFSPHSolver,NonPressureForce};
use salva3d::geometry::ParticlesContacts;

type V=Vector3<f32>;
const R:f32=0.50; const L:f32=0.90; const PR:f32=0.016;
const OMEGA:f32=300.*2.*PI/60.; const RATIO:f32=750./23.;
const NU:f32=0.000264238; const RHO:f32=900.; const DT:f32=0.001;
const SIGMA:f32=0.030; // N/m, assumed oil-air surface tension; not an OEM measurement.

/// Native execution uses the same SPH implementation as WebAssembly.
/// Files contain actual particle trajectories; preparation is excluded from the measurement window.
pub fn simulate_native(liters:f32,pr:f32,duration:f64,dt:f32,settle:f64,ramp:f64,output:&std::path::Path,surface:bool,drive:bool) {
 use std::io::Write;
 assert!(duration>0. && settle>=0. && ramp>=0.);
 std::fs::create_dir_all(output).unwrap();
 let mut engine=Engine::configured(liters,pr,dt,surface);
 let frame_dt=0.02;let frames=(duration/frame_dt).round() as usize+1;
 let started=std::time::Instant::now();
 let advance=|e:&mut Engine,target:f64,preparing:bool| {
  while e.elapsed<target-1e-9 {
   let speed=e.world.fluids()[e.fluid].velocities.iter().map(|v|v.norm()).fold(OMEGA*0.18,f32::max);
   let actual_dt=(e.dt.min(0.4*2.*e.pr/speed.max(1.))).min((target-e.elapsed) as f32);
   let mid=e.elapsed+actual_dt as f64/2.;
   let scale=if !drive || (preparing && mid<settle) {0.} else if preparing && ramp>0. && mid<settle+ramp {
    (0.5-0.5*(std::f64::consts::PI*(mid-settle)/ramp).cos()) as f32
   } else {1.};
   e.step_sized(actual_dt,scale);
   if !e.finite {panic!("Nonfinite fluid state; run rejected")}
  }
 };
 for k in 1..=((settle+ramp)/0.25).ceil() as usize {
  let target=(k as f64*0.25).min(settle+ramp);advance(&mut engine,target,true);engine.export();
  println!("{{\"preparation_s\":{},\"max_speed\":{},\"max_projection\":{},\"wall_s\":{:.3}}}",target,engine.stats[5],engine.stats[6],started.elapsed().as_secs_f64());
 }
 engine.export();let prep_phase=engine.phase_time;let prep_energy=engine.stats[3];
 let preparation=settle+ramp;
 let mut positions=std::io::BufWriter::new(std::fs::File::create(output.join("positions.bin")).unwrap());
 let mut stats=std::io::BufWriter::new(std::fs::File::create(output.join("frames.ndjson")).unwrap());
 let mut geometry=String::from("[");
 for (i,v) in engine.geometry.iter().enumerate(){if i>0{geometry.push(',')};geometry.push_str(&format!("{}",v));}geometry.push(']');
 let meta=format!("{{\"particles\":{},\"frames\":{},\"duration_s\":{},\"radius_m\":{},\"dt_max_s\":{},\"settle_s\":{},\"ramp_s\":{},\"phase_offset_s\":{},\"preparation_energy_j\":{},\"surface_tension\":{},\"drive\":{},\"geometry_flat\":{}}}",engine.flat.len()/3,frames,duration,pr,dt,settle,ramp,prep_phase,prep_energy,surface,drive,geometry);
 std::fs::write(output.join("meta.json"),meta).unwrap();
 for frame in 0..frames {
  let physical=frame as f64*frame_dt;
  advance(&mut engine,preparation+physical,false);engine.export();
  for value in &engine.flat {positions.write_all(&value.to_le_bytes()).unwrap();}
  let values=engine.stats.iter().map(|v|v.to_string()).collect::<Vec<_>>().join(",");
  writeln!(stats,"{{\"time_s\":{},\"mechanism_time_s\":{},\"metrics\":[{}]}}",physical,engine.phase_time,values).unwrap();
  if frame%50==0 || frame+1==frames {println!("{{\"progress\":{},\"physical_s\":{},\"particles\":{},\"wall_s\":{:.3}}}",frame as f64/(frames-1).max(1) as f64,physical,engine.flat.len()/3,started.elapsed().as_secs_f64());}
 }
}

/// Continuum surface force: a = sigma/rho * curvature * inward color gradient.
/// The solid extension excludes a false liquid-air interface along a wet wall.
struct SurfaceForce { sigma:f32 }
impl NonPressureForce for SurfaceForce {
 fn solve(&mut self,_dt:&TimestepManager,h:f32,ff:&ParticlesContacts,fb:&ParticlesContacts,
          fluid:&mut Fluid,boundaries:&[Boundary],densities:&[f32]) {
  let mut gradients=vec![V::zeros();fluid.positions.len()];
  for (i,n) in gradients.iter_mut().enumerate() {
   for c in ff.particle_contacts(i).read().unwrap().iter() {if c.i_model==c.j_model {
    *n+=c.gradient*fluid.volumes[c.j]*RHO/densities[c.j].max(RHO*0.2);
   }}
   for c in fb.particle_contacts(i).read().unwrap().iter() { *n+=c.gradient*boundaries[c.j_model].volumes[c.j]; }
  }
  let unit:Vec<V>=gradients.iter().map(|n|if n.norm()>0.08/h{n.normalize()}else{V::zeros()}).collect();
  for i in 0..fluid.positions.len() {
   if unit[i].norm_squared()<0.5 {continue}
   let mut curvature=0.;
   for c in ff.particle_contacts(i).read().unwrap().iter() {if c.i_model==c.j_model && unit[c.j].norm_squared()>0.5 {
    curvature-=(unit[c.j]-unit[i]).dot(&c.gradient)*fluid.volumes[c.j]*RHO/densities[c.j].max(RHO*0.2);
   }}
   // Resolution-limited curvature regularization, not a microscopic film claim.
   curvature=curvature.clamp(-2./h,2./h);
   fluid.accelerations[i]+=gradients[i]*(self.sigma*curvature/densities[i].max(RHO*0.2));
  }
 }
 fn apply_permutation(&mut self,_:&[usize]){}
}

/// Empirical short-range wall adhesion, independent of surface tension.
/// Gain in m/s2; an uncalibrated wetting surrogate, not a specified contact angle.
struct WallWetting { gain:f32 }
impl NonPressureForce for WallWetting {
 fn solve(&mut self,_dt:&TimestepManager,h:f32,_ff:&ParticlesContacts,fb:&ParticlesContacts,
          fluid:&mut Fluid,boundaries:&[Boundary],_densities:&[f32]) {
  for i in 0..fluid.positions.len() {
   let mut direction=V::zeros();let mut weight=0.;
   for c in fb.particle_contacts(i).read().unwrap().iter() {
    let delta=boundaries[c.j_model].positions[c.j]-fluid.positions[i];let d=delta.norm();
    if d>h*0.15 && d<h {let w=(1.-d/h).powi(2)*boundaries[c.j_model].volumes[c.j];direction+=delta/d*w;weight+=w;}
   }
   if weight>1e-12 {fluid.accelerations[i]+=direction*(self.gain/weight);}
  }
 }
 fn apply_permutation(&mut self,_:&[usize]){}
}

/// Morris/Brookshaw laminar viscosity with SI kinematic viscosity.
struct LaminarViscosity { nu:f32 }
impl NonPressureForce for LaminarViscosity {
    fn solve(&mut self,_dt:&TimestepManager,h:f32,ff:&ParticlesContacts,fb:&ParticlesContacts,
             fluid:&mut Fluid,boundaries:&[Boundary],densities:&[f32]) {
        let eps=0.01*h*h;
        for i in 0..fluid.positions.len() {
            let pi=fluid.positions[i];let vi=fluid.velocities[i];let mut a=V::zeros();
            for c in ff.particle_contacts(i).read().unwrap().iter() {
                if c.i_model==c.j_model && c.j!=i {
                    let delta=pi-fluid.positions[c.j];let lap=2.*delta.dot(&c.gradient)/(delta.norm_squared()+eps);
                    let volume=fluid.volumes[c.j]*RHO*RHO/
                        (densities[i].max(RHO*0.1)*densities[c.j].max(RHO*0.1));
                    a+=(vi-fluid.velocities[c.j])*(self.nu*volume*lap);
                }
            }
            for c in fb.particle_contacts(i).read().unwrap().iter() {
                let b=&boundaries[c.j_model];let delta=pi-b.positions[c.j];
                let lap=2.*delta.dot(&c.gradient)/(delta.norm_squared()+eps);
                // Mirror ghost velocity approximates no slip; 2 is a fixed numerical assumption.
                a+=(vi-b.velocities[c.j])*(2.*self.nu*b.volumes[c.j]*lap*RHO/densities[i].max(RHO*0.1));
            }
            fluid.accelerations[i]+=a;
        }
    }
    fn apply_permutation(&mut self,_:&[usize]){}
}

#[derive(Clone)]
struct Body { name:u32,stage:u32,role:u32,y:f32,inner:f32,outer:f32,length:f32,teeth:usize,
              inward:bool,phase:f32,orbit:f32,factor:f32,orbit_factor:f32 }
impl Body {
    fn center(&self,t:f32)->V { let a=self.phase-self.orbit_factor*OMEGA*t;V::new(self.orbit*a.cos(),self.y,self.orbit*a.sin()) }
    fn radii(&self,angle:f32)->(f32,f32) {
        if self.teeth==0{return (self.inner,self.outer)}
        let n=self.teeth*4;let scaled=angle.rem_euclid(2.*PI)*n as f32/(2.*PI);
        let j=scaled.floor() as usize;let fraction=scaled-scaled.floor();let da=2.*PI/n as f32;
        let vertex=|index:usize| {
            if self.inward {(self.inner+if index%4>=2 {0.014}else{0.},self.outer)}
            else {(self.inner,self.outer-if index%4>=2 {0.014}else{0.})}
        };
        let (a,b)=vertex(j);let (c,d)=vertex((j+1)%n);let beta=fraction*da;
        let ray=|r1:f32,r2:f32|r1*r2*da.sin()/(r2*(da-beta).sin()+r1*beta.sin());
        (ray(a,c),ray(b,d))
    }
    fn local(&self,p:V,t:f32)->V { rotate(p-self.center(t),-self.factor*OMEGA*t) }
    fn contains(&self,p:V,t:f32,margin:f32)->bool {
        if (p.y-self.y).abs()>=self.length/2.+margin{return false}
        let delta=p-self.center(t);let rad=delta.x.hypot(delta.z);
        if rad>=self.outer+margin || rad<=(self.inner-margin).max(0.){return false}
        if self.teeth==0{return true}
        if !self.inward && rad<self.outer-0.014+margin{return true}
        if self.inward && rad>self.inner+0.014-margin{return true}
        let q=rotate(delta,-self.factor*OMEGA*t);let (lo,hi)=self.radii(q.z.atan2(q.x));
        rad>lo-margin && rad<hi+margin
    }
    fn velocity(&self,p:V,t:f32)->V {
        let c=self.center(t);V::new(0.,self.orbit_factor*OMEGA,0.).cross(&V::new(c.x,0.,c.z))+
            V::new(0.,self.factor*OMEGA,0.).cross(&(p-c))
    }
    /// Nearest point on the polygonal tooth faces and caps, including flank normals.
    fn project_local(&self,q:V,clearance:f32)->(V,V) {
        let mut distance=(self.length/2.-q.y).abs();let mut normal=V::new(0.,1.,0.);let mut projected=V::new(q.x,self.length/2.,q.z);
        let lower=(self.length/2.+q.y).abs();if lower<distance{distance=lower;normal=V::new(0.,-1.,0.);projected.y=-self.length/2.;}
        if self.teeth==0 {
            let r=q.x.hypot(q.z);let n=V::new(q.x/r.max(1e-9),0.,q.z/r.max(1e-9));
            for (radius,sign) in [(self.inner,-1.),(self.outer,1.)] {let d=(r-radius).abs();if d<distance{distance=d;normal=n*sign;projected=V::new(n.x*radius,q.y,n.z*radius);}}
        }else{
            let n=self.teeth*4;let da=2.*PI/n as f32;
            for j in 0..n {let a=j as f32*da;let c=(j+1) as f32*da;
                let vertex=|k:usize|if self.inward{(self.inner+if k%4>=2{0.014}else{0.},self.outer)}else{(self.inner,self.outer-if k%4>=2{0.014}else{0.})};
                let (lo,hi)=vertex(j);let (lc,hc)=vertex((j+1)%n);
                for (r1,r2,sign) in [(lo,lc,-1.),(hi,hc,1.)]{let p=V::new(r1*a.cos(),q.y,r1*a.sin());let end=V::new(r2*c.cos(),q.y,r2*c.sin());let edge=end-p;let v=p+edge*((q-p).dot(&edge)/edge.norm_squared()).clamp(0.,1.);let d=(v-q).norm();if d<distance{distance=d;projected=v;normal=V::new(edge.z,0.,-edge.x).normalize()*sign;}}
            }
        }
        (projected+normal*clearance,normal)
    }
}
fn rotate(p:V,a:f32)->V {let (s,c)=a.sin_cos();V::new(c*p.x+s*p.z,p.y,-s*p.x+c*p.z)}

fn body_specs()->Vec<Body> {
    let mut out=Vec::new();
    for (stage,y,ns,np,nr,sun,carrier) in [(0,0.21,18,27,72,1.,1./5.),(1,-0.21,23,52,127,1./5.,1./RATIO)] {
        let sr=0.425*ns as f32/nr as f32;let planet=0.425*np as f32/nr as f32;
        let base=Body{name:out.len() as u32,stage,role:0,y,inner:0.038,outer:sr+0.006,length:0.10,teeth:ns,
            inward:false,phase:0.,orbit:0.,factor:sun,orbit_factor:0.};out.push(base.clone());
        for j in 0..3 {let mut b=base.clone();b.name=out.len() as u32;b.role=1;b.inner=0.041;b.outer=planet+0.006;b.teeth=np;
            b.phase=PI/2.+j as f32*2.*PI/3.;b.orbit=sr+planet;b.factor=carrier-(ns as f32/np as f32)*(sun-carrier);
            b.orbit_factor=carrier;out.push(b);}
        let mut ring=base.clone();ring.name=out.len() as u32;ring.role=2;ring.inner=0.425;ring.outer=0.47;ring.length=0.12;
        ring.teeth=nr;ring.inward=true;ring.factor=0.;out.push(ring);
        let mut ca=base;ca.name=out.len() as u32;ca.role=3;ca.y=y-0.073;ca.inner=0.066;ca.outer=0.34;
        ca.length=0.024;ca.teeth=0;ca.factor=carrier;out.push(ca);
    }
    for (y,len,rad,factor,stage) in [(0.36,0.18,0.034,1.,0),(0.,0.29,0.031,1./5.,0),(-0.377,0.144,0.055,1./RATIO,1)] {
        out.push(Body{name:out.len() as u32,stage,role:4,y,inner:0.0005,outer:rad,length:len,teeth:0,
            inward:false,phase:0.,orbit:0.,factor,orbit_factor:0.});
    }
    out
}

fn samples_at(b:&Body,pr:f32)->Vec<V> {
    let step=pr*1.5;let n=((2.*PI*b.outer/(1.1*pr)).ceil() as usize).max(32).max(b.teeth*2);let layers=(b.length/step).ceil() as usize;
    let mut p=Vec::new();
    for k in 0..=layers {let y=-b.length/2.+b.length*k as f32/layers as f32;
        for j in 0..n {let a=j as f32*2.*PI/n as f32;let(lo,hi)=b.radii(a);p.push(V::new(hi*a.cos(),y,hi*a.sin()));
            if b.inner>0.01 {p.push(V::new(lo*a.cos(),y,lo*a.sin()));}}
    }
    let radial=((b.outer-b.inner)/step).ceil() as usize;
    for k in 1..radial {let r=b.inner+(b.outer-b.inner)*k as f32/radial as f32;let na=(2.*PI*r/step).ceil() as usize;
        for j in 0..na {let a=j as f32*2.*PI/na as f32;let(lo,hi)=b.radii(a);if r<lo||r>hi{continue}
            for sign in [-1.,1.] {p.push(V::new(r*a.cos(),sign*b.length/2.,r*a.sin()));}}
    }p
}
#[cfg(test)] fn samples(b:&Body)->Vec<V>{samples_at(b,PR)}
fn housing_samples(pr:f32)->Vec<V> {
    let step=pr*1.5;let n=(2.*PI*R/step).ceil() as usize;let layers=(L/step).ceil() as usize;let mut p=Vec::new();
    for k in 0..=layers {for j in 0..n {let a=j as f32*2.*PI/n as f32;p.push(V::new(R*a.cos(),-L/2.+L*k as f32/layers as f32,R*a.sin()));}}
    let count=(R/step).floor() as i32;
    for ix in -count..=count {for iz in -count..=count {let x=ix as f32*step;let z=iz as f32*step;if x.hypot(z)<R-step*0.3 {
        p.push(V::new(x,-L/2.,z));p.push(V::new(x,L/2.,z));}}}p
}

struct Engine {world:LiquidWorld,fluid:FluidHandle,bodies:Vec<Body>,handles:Vec<BoundaryHandle>,samples:Vec<Vec<V>>,
    time:f32,elapsed:f64,phase_time:f64,drive_scale:f32,steps:u32,liters:f32,pr:f32,dt:f32,flat:Vec<f32>,stats:Vec<f32>,geometry:Vec<f32>,
    max_projection:f32,projection_steps:u32,max_native_speed:f32,max_solid_overlap:u32,finite:bool,initial_surface:f32}
impl Engine {
    fn new(liters:f32)->Self {
        Self::configured(liters,PR,DT,true)
    }
    fn configured(liters:f32,pr:f32,dt:f32,surface:bool)->Self {
        assert!((0.004..=0.016).contains(&pr) && dt>0. && dt<=0.001);
        let bodies=body_specs();let spacing=2.*pr;let volume=0.8*spacing.powi(3);let target=(liters/1000./volume).round() as usize;
        let mut candidates=Vec::new();let pad=1.10*spacing;
        let nx=(2.*R/spacing).ceil() as i32;let ny=(L/spacing).ceil() as i32;
        for iz in 0..nx {for ix in 0..nx {for iy in 0..ny {
            let p=V::new(-R+spacing/2.+ix as f32*spacing,-L/2.+spacing/2.+iy as f32*spacing,-R+spacing/2.+iz as f32*spacing);
            if p.x.hypot(p.z)<R-pad && p.y.abs()<L/2.-pad && !bodies.iter().any(|b|b.contains(p,0.,pad)) {candidates.push(p)}
        }}}
        assert!(target>0 && target<=candidates.len(),"Inventory outside coarse geometry capacity");
        // Fill the final layer uniformly instead of truncating it on one side.
        let final_z=candidates[target-1].z;
        let start=candidates.partition_point(|p|p.z<final_z-1e-6);
        let stop=candidates.partition_point(|p|p.z<=final_z+1e-6);
        let quota=target-start;let layer=stop-start;
        let selected:Vec<V>=(0..quota).map(|k|candidates[start+(((k as f64+0.5)*layer as f64/quota as f64).floor() as usize).min(layer-1)]).collect();
        candidates.truncate(start);candidates.extend(selected);let initial_surface=final_z;
        let mut fluid=Fluid::new(candidates,pr,RHO,InteractionGroups::default());
        for v in &mut fluid.volumes {*v=liters/1000./target as f32;}
        fluid.nonpressure_forces.push(Box::new(LaminarViscosity{nu:NU}));
        if surface {fluid.nonpressure_forces.push(Box::new(SurfaceForce{sigma:SIGMA}));fluid.nonpressure_forces.push(Box::new(WallWetting{gain:0.3}));}
        let mut solver:DFSPHSolver=DFSPHSolver::new();solver.min_pressure_iter=2;solver.max_pressure_iter=60;
        solver.max_density_error=0.01;solver.min_divergence_iter=1;solver.max_divergence_iter=60;
        let mut world=LiquidWorld::new(solver,pr,2.,1.);let handle=world.add_fluid(fluid);
        world.cache_rigid_boundary_volumes=true;
        world.add_boundary(Boundary::new(housing_samples(pr),InteractionGroups::default()));
        let mut handles=Vec::new();let mut locals=Vec::new();let mut geometry=Vec::new();
        for b in &bodies {let s=samples_at(b,pr);let positions=s.iter().map(|p|*p+b.center(0.)).collect();
            handles.push(world.add_boundary(Boundary::new(positions,InteractionGroups::default())));locals.push(s);
            geometry.extend([b.name as f32,b.stage as f32,b.role as f32,b.y,b.inner,b.outer,b.length,b.teeth as f32,
                if b.inward{1.}else{0.},b.phase,b.orbit,b.factor,b.orbit_factor]);}
        let mut e=Self{world,fluid:handle,bodies,handles,samples:locals,time:0.,elapsed:0.,phase_time:0.,drive_scale:0.,steps:0,liters,pr,dt,
            flat:Vec::new(),stats:vec![0.;16],geometry,max_projection:0.,projection_steps:0,max_native_speed:0.,max_solid_overlap:0,finite:true,initial_surface};
        e.update_boundaries();e.export();e
    }
    fn update_boundaries(&mut self) {
        for (i,b) in self.bodies.iter().enumerate() {
            let phase=self.phase_time as f32;
            let boundary=&mut self.world.boundaries_mut()[self.handles[i]];let angle=b.factor*OMEGA*phase;let center=b.center(phase);
            let (sin,cos)=angle.sin_cos();let orbital=V::new(b.orbit_factor*OMEGA*center.z,0.,-b.orbit_factor*OMEGA*center.x)*self.drive_scale;
            let spin=b.factor*OMEGA*self.drive_scale;
            if b.factor==0. && b.orbit_factor==0. {continue}
            for (j,q) in self.samples[i].iter().enumerate() {let offset=V::new(cos*q.x+sin*q.z,q.y,-sin*q.x+cos*q.z);boundary.positions[j]=offset+center;boundary.velocities[j]=orbital+V::new(spin*offset.z,0.,-spin*offset.x);}
        }
    }
    fn step(&mut self,drive:bool) {
        self.step_sized(self.dt,if drive{1.}else{0.});
    }
    fn step_sized(&mut self,dt:f32,scale:f32) {
        self.drive_scale=scale;let drive=scale>0.;
        if drive {self.update_boundaries();} else {for b in self.world.boundaries_mut().values_mut() {b.velocities.fill(V::zeros());}}
        self.world.step(dt,&V::new(0.,0.,-9.81));self.elapsed+=dt as f64;self.time=self.elapsed as f32;self.phase_time+=dt as f64*scale as f64;self.steps+=1;
        let f=&mut self.world.fluids_mut()[self.fluid];let t=self.phase_time as f32;
        for i in 0..f.positions.len() {
            let before=f.positions[i];self.max_native_speed=self.max_native_speed.max(f.velocities[i].norm());
            for _ in 0..3 {
                let p=&mut f.positions[i];let rad=p.x.hypot(p.z);
                if rad>R-0.0005 {let n=V::new(p.x/rad,0.,p.z/rad);p.x*= (R-0.0005)/rad;p.z*= (R-0.0005)/rad;
                    let vn=f.velocities[i].dot(&n);if vn>0.{f.velocities[i]-=n*vn}}
                if p.y.abs()>L/2.-0.0005 {p.y=p.y.signum()*(L/2.-0.0005);f.velocities[i].y=0.;}
                for b in &self.bodies {if b.contains(*p,t,0.) {
                    let (q,mut normal)=b.project_local(b.local(*p,t),0.0005);
                    let a=b.factor*OMEGA*t;*p=rotate(q,a)+b.center(t);normal=rotate(normal,a);
                    let wall=if drive{b.velocity(*p,t)*scale}else{V::zeros()};let vn=(f.velocities[i]-wall).dot(&normal);
                    if vn<0.{f.velocities[i]-=normal*vn;}
                }}
            }
            let correction=(f.positions[i]-before).norm();if correction>0.{self.projection_steps+=1;}
            self.max_projection=self.max_projection.max(correction);
            if !f.positions[i].iter().all(|x|x.is_finite()) || !f.velocities[i].iter().all(|x|x.is_finite()){self.finite=false;}
        }
        if self.steps%25==0 {let overlap=f.positions.iter().filter(|p|self.bodies.iter().any(|b|b.contains(**p,t,0.))).count() as u32;
            self.max_solid_overlap=self.max_solid_overlap.max(overlap);}
    }
    fn export(&mut self) {
        let f=&self.world.fluids()[self.fluid];self.flat.clear();let mut energy=0.;let mut speed=0.;let mut top=-R;let mut outside=0;let mut splash=0;
        for (p,v) in f.positions.iter().zip(f.velocities.iter()) {self.flat.extend([p.x,p.y,p.z]);energy+=v.norm_squared();speed=f32::max(speed,v.norm());top=f32::max(top,p.z);
            if p.x.hypot(p.z)>R+1e-6 || p.y.abs()>L/2.+1e-6 {outside+=1;}if p.z>self.initial_surface+2.*self.pr{splash+=1;}}
        let n=f.positions.len();let mass=(f.volumes.iter().map(|v|*v as f64).sum::<f64>()*RHO as f64) as f32;
        self.stats.copy_from_slice(&[self.time,n as f32,mass,0.5*mass*energy/n as f32,speed,self.max_native_speed,
            self.max_projection,self.projection_steps as f32,self.max_solid_overlap as f32,outside as f32,
            if self.finite{1.}else{0.},top,splash as f32,self.initial_surface,self.pr,OMEGA*self.drive_scale]);
    }
}
thread_local!{static SIM:RefCell<Option<Engine>>=const{RefCell::new(None)};}
#[no_mangle]pub extern "C" fn initialize(liters:f32)->u32{SIM.with(|s|{let e=Engine::new(liters);let n=e.flat.len()/3;*s.borrow_mut()=Some(e);n as u32})}
#[no_mangle]pub extern "C" fn initialize_configured(liters:f32,radius:f32,dt:f32,surface:u32)->u32{SIM.with(|s|{let e=Engine::configured(liters,radius,dt,surface!=0);let n=e.flat.len()/3;*s.borrow_mut()=Some(e);n as u32})}
#[no_mangle]pub extern "C" fn advance_to(target:f64,scale:f32){SIM.with(|s|{let mut e=s.borrow_mut();let e=e.as_mut().unwrap();while e.elapsed<target-1e-9{let speed=e.world.fluids()[e.fluid].velocities.iter().map(|v|v.norm()).fold(OMEGA*0.18,f32::max);let dt=e.dt.min(0.4*2.*e.pr/speed.max(1.)).min((target-e.elapsed) as f32);e.step_sized(dt,scale);}e.export();})}
#[no_mangle]pub extern "C" fn phase_time()->f64{SIM.with(|s|s.borrow().as_ref().unwrap().phase_time)}
#[no_mangle]pub extern "C" fn advance(steps:u32,drive:u32){SIM.with(|s|{let mut e=s.borrow_mut();let e=e.as_mut().unwrap();for _ in 0..steps{e.step(drive!=0)}e.export();})}
#[no_mangle]pub extern "C" fn positions_ptr()->u32{SIM.with(|s|s.borrow().as_ref().unwrap().flat.as_ptr() as u32)}
#[no_mangle]pub extern "C" fn stats_ptr()->u32{SIM.with(|s|s.borrow().as_ref().unwrap().stats.as_ptr() as u32)}
#[no_mangle]pub extern "C" fn geometry_ptr()->u32{SIM.with(|s|s.borrow().as_ref().unwrap().geometry.as_ptr() as u32)}
#[no_mangle]pub extern "C" fn body_count()->u32{SIM.with(|s|s.borrow().as_ref().unwrap().bodies.len() as u32)}
#[no_mangle]pub extern "C" fn time_step()->f32{DT}

#[cfg(test)]mod tests {
    use super::*;
    #[test]fn valid_three_planet_assembly(){for(ns,np,nr)in[(18,27,72),(23,52,127)]{assert_eq!(ns+2*np,nr);assert_eq!((ns+nr)%3,0);}}
    #[test]fn willis_speed_identity(){for(ns,nr,sun,carrier)in[(18.,72.,1.,1./5.),(23.,127.,1./5.,1./RATIO)]{assert!(((sun-carrier)*ns-carrier*nr).abs()<1e-5);}}
    #[test]fn ratio_matches_reference_within_point_one_percent(){assert!((RATIO/32.62-1.).abs()<0.001);}
    #[test]fn orbital_velocity_is_derivative(){for b in body_specs().iter().filter(|b|b.orbit>0.){let t=0.1;let eps=1e-4;let numeric=(b.center(t+eps)-b.center(t-eps))/(2.*eps);let v=b.velocity(b.center(t),t);assert!((numeric-v).norm()<0.002);}}
    #[test]fn tangential_sun_wall_velocity(){let b=&body_specs()[0];let p=V::new(b.outer,b.y,0.);let v=b.velocity(p,0.);assert!(v.x.abs()<1e-6);assert!((v.z+OMEGA*b.outer).abs()<1e-5);}
    #[test]fn samples_are_on_geometric_boundary(){for b in body_specs(){for q in samples(&b){let(lo,hi)=b.radii(q.z.atan2(q.x));let r=q.x.hypot(q.z);assert!((r-lo).abs()<1e-4||(r-hi).abs()<1e-4||(q.y.abs()-b.length/2.).abs()<1e-4);}}}
    #[test]fn laminar_pair_viscosity_dissipates_and_conserves_momentum(){let vi=V::new(1.,2.,0.);let vj=V::new(-1.,0.,0.);let delta=V::new(0.02,0.,0.);let grad=V::new(-20.,0.,0.);let di=600.;let dj=800.;let massi=0.02;let massj=0.03;
        let lap=2.*delta.dot(&grad)/(delta.norm_squared()+0.00001);let ai=(vi-vj)*(NU*massj*RHO/(di*dj)*lap);let aj=(vj-vi)*(NU*massi*RHO/(di*dj)*lap);
        assert!((ai*massi+aj*massj).norm()<1e-10);assert!(vi.dot(&(ai*massi))+vj.dot(&(aj*massj))<0.);}
    #[test]fn volume_changes_particle_count(){let a=Engine::new(55.);let b=Engine::new(95.);assert!(a.flat.len()<b.flat.len());for e in [&a,&b]{let f=&e.world.fluids()[e.fluid];let mass:f64=f.volumes.iter().map(|v|*v as f64).sum::<f64>()*RHO as f64;assert!((mass-e.liters as f64/1000.*RHO as f64).abs()<0.00001);}}
    #[test]fn rigid_cache_matches_uncached_contacts(){let mut a=Engine::configured(55.,0.016,DT,false);let mut b=Engine::configured(55.,0.016,DT,false);b.world.cache_rigid_boundary_volumes=false;for _ in 0..5 {a.step(true);b.step(true);}a.export();b.export();let rms=(a.flat.iter().zip(&b.flat).map(|(x,y)|(*x as f64-*y as f64).powi(2)).sum::<f64>()/a.flat.len() as f64).sqrt();assert!(rms<1e-6,"rigid cache RMS {rms}");}
    #[test]fn co_translating_walls_are_galilean_invariant(){let mut a=Engine::configured(55.,0.016,DT,false);let mut b=Engine::configured(55.,0.016,DT,false);let shift=V::new(2.,0.,0.);b.world.fluids_mut()[b.fluid].velocities.fill(shift);for boundary in b.world.boundaries_mut().values_mut(){boundary.velocities.fill(shift);}a.world.step(DT,&V::zeros());b.world.step(DT,&V::zeros());let fa=&a.world.fluids()[a.fluid];let fb=&b.world.fluids()[b.fluid];let error=fa.velocities.iter().zip(&fb.velocities).map(|(u,v)|(*v-*u-shift).norm_squared() as f64).sum::<f64>()/fa.positions.len() as f64;assert!(error.sqrt()<1e-5,"co-moving wall velocity RMS {}",error.sqrt());}
    #[test]fn tooth_flank_projection_uses_the_short_exit(){let b=&body_specs()[0];let da=2.*PI/(b.teeth*4) as f32;let j=1.;let a=j*da;let c=(j+1.)*da;let p=V::new(b.outer*a.cos(),0.,b.outer*a.sin());let end=V::new((b.outer-0.014)*c.cos(),0.,(b.outer-0.014)*c.sin());let edge=end-p;let outward=V::new(edge.z,0.,-edge.x).normalize();let q=(p+end)/2.-outward*0.001;let (projected,normal)=b.project_local(q,0.0005);assert!((projected-q).norm()<0.0016);assert!(normal.dot(&outward)>0.999);assert!(!b.contains(projected+V::new(0.,b.y,0.),0.,0.));}
}
