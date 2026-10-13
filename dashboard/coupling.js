// Rigid change of basis only: no scaling or deformation of calculated particles.
// Inspector (X,Y,Z) -> SPH (-X, Z + 1.34, Y). Determinant +1.
export const AXIAL_OFFSET = 1.34;
export const OMEGA = 300 * 2 * Math.PI / 60;
export function inspectorToFluid([x,y,z]) { return [-x,z+AXIAL_OFFSET,y]; }
export function fluidToInspector([x,y,z]) { return [-x,z,y-AXIAL_OFFSET]; }
export function bodyPose(b,time) {
  const orbit = b.phase-b.orbit_factor*OMEGA*time;
  return {position:[b.orbit*Math.cos(orbit),b.center_y,b.orbit*Math.sin(orbit)],angle:b.speed_factor*OMEGA*time};
}
export function frameAt(times,time) {
  let lo=0,hi=times.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(times[mid]<=time+1e-9)lo=mid;else hi=mid-1;}
  return lo;
}
// The polygon is the solver's actual coarse collision geometry, including tooth flanks.
export function bodyVertices(b) {
  const n=b.teeth?b.teeth*4:72,vertices=[],indices=[];
  for(let ring=0;ring<4;ring++)for(let j=0;j<n;j++){
    const a=j*2*Math.PI/n;let r=ring<2?b.outer:b.inner;
    if(b.teeth&&j%4>=2){if(b.inward&&ring>=2)r+=.014;if(!b.inward&&ring<2)r-=.014;}
    vertices.push(r*Math.cos(a),(ring%2?1:-1)*b.length/2,r*Math.sin(a));
  }
  for(let j=0;j<n;j++){const k=(j+1)%n;for(const q of [[j,k,n+k,n+j],[2*n+j,3*n+j,3*n+k,2*n+k],[j,2*n+j,2*n+k,k],[n+j,n+k,3*n+k,3*n+j]])indices.push(q[0],q[1],q[2],q[0],q[2],q[3]);}
  return {vertices,indices};
}
export const BODY_NAMES=['Solar','Satélite','Corona fija','Portaplanetas','Acoplamiento'];
