"""Export actual OpenFOAM VOF probes and cell fields; standard-library only."""
from pathlib import Path
import json,re,math,csv
root=Path(__file__).resolve().parent;case=root/'completed_shear'
def rows(path):
 return [[float(v) for v in line.replace('(',' ').replace(')',' ').split()] for line in path.read_text().splitlines() if line.strip() and not line.lstrip().startswith('#')]
def field(path,vector=False):
 s=path.read_text();m=re.search(r'internalField\s+nonuniform\s+List<(?:scalar|vector)>\s+(\d+)\s*\((.*?)\)\s*;',s,re.S)
 if m:
  data=[float(v) for v in m[2].replace('(',' ').replace(')',' ').split()];n=int(m[1]);assert len(data)==n*(3 if vector else 1);return [data[i:i+3] for i in range(0,len(data),3)] if vector else data
 m=re.search(r'internalField\s+uniform\s+([^;]+);',s)
 if not m:raise ValueError(str(path))
 v=[float(q) for q in m[1].strip(' ()').split()];return [v if vector else v[0] for _ in range(2560)]
def capacitance(f):return 8+2*math.pi*8.8541878128e-12*.025*(1+1.2*f)/math.log(.006/.004)*1e12
probe_dir=case/'postProcessing/probes/0';a=rows(probe_dir/'alpha.oil');p=rows(probe_dir/'p');u=rows(probe_dir/'U');assert len(a)==len(p)==len(u)
probes=json.loads((root/'shear_bench/assumptions.json').read_text(encoding='utf-8'))['probes'];samples=[]
for aa,pp,uu in zip(a,p,u):
 assert abs(aa[0]-pp[0])<1e-8 and abs(aa[0]-uu[0])<1e-8
 if aa[0]<1-1e-8:continue
 assert len(aa)==13 and len(pp)==13 and len(uu)==37
 signals=[]
 for i in range(12):
  raw=aa[i+1];oil=min(1,max(0,raw));velocity=uu[1+i*3:4+i*3]
  signals.append({'id':probes[i]['id'],'oil_fraction':oil,'air_fraction':1-oil,'raw_oil_fraction':raw,'pressure_relative_pa':pp[i+1],'velocity_m_s':math.sqrt(sum(v*v for v in velocity)),'velocity_vector_m_s':velocity,'capacitance_ideal_pf':capacitance(oil)})
 samples.append({'time_s':round(aa[0]-1,10),'sensors':signals})
volume_candidates=[(q,rows(q)) for q in (case/'postProcessing/oilVolume/0').glob('volFieldValue*.dat')]
volume_path,volume=next((q,v) for q,v in volume_candidates if v[-1][0]>=3-1e-8 and abs(v[0][1]-.095)<1e-7)
initial=volume[0][1]*1000;error=max(abs(v[1]*1000-95)/95*100 for v in volume)
log=(case/'log.interFoam').read_text();bounds_min=[float(v) for v in re.findall(r'min\(alpha\.oil\)\s*=\s*([^\s]+)',log)];bounds_max=[float(v) for v in re.findall(r'max\(alpha\.oil\)\s*=\s*([^\s]+)',log)];speeds=[float(v) for v in re.findall(r'max\(mag\(U\)\)\s*=\s*([^\s]+)',log)]
energies={};slices=[];nx,ny,nz=20,16,8;dv=.4/(nx*ny*nz)
for t in (.5,1,3):
 directory=case/str(t).rstrip('0').rstrip('.') if '.' in str(t) else case/str(t)
 alpha=field(directory/'alpha.oil');velocity=field(directory/'U',True);assert len(alpha)==nx*ny*nz
 energies[str(t)]=sum(.5*(1.06+(900-1.06)*f)*dv*sum(q*q for q in v) for f,v in zip(alpha,velocity))
 if t>=1:
  layer=[];vectors=[]
  for j in range(ny):
   for i in range(nx):
    ids=[k*nx*ny+j*nx+i for k in (3,4)];layer.append(sum(alpha[q] for q in ids)/2);vectors.append([sum(velocity[q][c] for q in ids)/2 for c in (0,1)])
  slices.append({'time_s':t-1,'alpha':layer,'velocity_xy_m_s':vectors})
checks={'measurement_at_least_2_s':samples[-1]['time_s']>=2-1e-8,'initial_oil_95_liters':abs(initial-95)<.00001,'mass_balance_below_point_one_percent':error<.1,'finite_fields':all(math.isfinite(q) for f in samples for s in f['sensors'] for q in [s['raw_oil_fraction'],s['pressure_relative_pa'],s['velocity_m_s']]),'phase_fraction_bounded':min(bounds_min)>-1e-5 and max(bounds_max)<1+1e-5,'velocity_bounded':max(speeds)<20,'mesh_quality_passed':'Mesh OK.' in (case/'log.checkMesh').read_text(),'solver_finished':bool(re.search(r'\nEnd\s*$',log)),'wall_motion_changes_internal_flow':energies['3']>energies['0.5']+.000001}
report={'accepted':all(checks.values()),'status':'Banco de cizalla bifásico calculado; simulación sin validación experimental','backend':'OpenFOAM 1912.200626 interFoam VOF','geometry':'Closed 3D planar moving-wall benchmark, local gear-face shear approximation; not full reducer or annular rotor','oil_liters':95,'cells':2560,'duration_s':samples[-1]['time_s'],'preparation_s':1,'measurement_start_s':1,'inventory_initial_liters':initial,'max_inventory_error_percent':error,'raw_alpha_min':min(bounds_min),'raw_alpha_max':max(bounds_max),'max_speed_m_s':max(speeds),'internal_kinetic_energy_j':energies,'numerical_checks':checks,'full_reducer_accepted':False,'scientifically_validated':False,'probes':probes,'samples':samples,'slices':slices,'slice_grid':[20,16],'slice_dimensions_m':[1,.8],'slice_description':'Mean of the two central z layers, cell-centered finite-volume field','sensor_model':'Direct VOF point fractions; analytical ideal capacitance, without electronics/film calibration','pressure_basis':'Relative solver gauge; not absolute atmospheric pressure','volume_source_file':volume_path.name}
(root/'reference.json').write_text(json.dumps(report,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
with (root/'reference.csv').open('w',newline='',encoding='utf-8-sig') as f:
 writer=csv.writer(f);writer.writerow(['time_s','sensor_id','oil_fraction','air_fraction','pressure_relative_pa','velocity_m_s','capacitance_ideal_pf'])
 for frame in samples:
  for s in frame['sensors']:writer.writerow([frame['time_s'],s['id'],s['oil_fraction'],s['air_fraction'],s['pressure_relative_pa'],s['velocity_m_s'],s['capacitance_ideal_pf']])
public={k:v for k,v in report.items() if k not in ('samples','slices','probes')};(root.parent/'reports/cfd_shear_validation.json').write_text(json.dumps(public,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(public,ensure_ascii=False))
if not report['accepted']:raise SystemExit('CFD result rejected')
