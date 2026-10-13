"""Closed Cartesian oil-air shear benchmark: moving gear-face tangent approximation.
Solver dictionaries adapt the GPL-3+ OpenFOAM 1912 damBreak example.
This isolates viscosity, gravity and electrode sampling; it is not a reducer geometry.
"""
from pathlib import Path
import math,json
out=Path(__file__).resolve().parent/'shear_bench'
for name in ('0','constant','system'): (out/name).mkdir(parents=True,exist_ok=True)
def write(name,body,cls='dictionary'):
 (out/name).write_text('FoamFile {version 2.0; format ascii; class '+cls+'; object '+Path(name).name+';}\n'+body+'\n',encoding='utf-8')
write('system/blockMeshDict','convertToMeters 1; vertices ((0 0 0)(1 0 0)(1 .8 0)(0 .8 0)(0 0 .5)(1 0 .5)(1 .8 .5)(0 .8 .5)); blocks (hex (0 1 2 3 4 5 6 7) (20 16 8) simpleGrading (1 1 1)); edges (); boundary (movingFace {type wall; faces ((1 2 6 5));} housing {type wall; faces ((0 4 7 3)(0 1 5 4)(3 7 6 2)(0 3 2 1)(4 5 6 7));}); mergePatchPairs ();')
write('constant/transportProperties','phases (oil air); oil {transportModel Newtonian; nu .000264238; rho 900;} air {transportModel Newtonian; nu .000019; rho 1.06;} sigma .030;')
write('constant/turbulenceProperties','simulationType laminar;')
write('constant/g','dimensions [0 1 -2 0 0 0 0]; value (0 -9.81 0);','uniformDimensionedVectorField')
write('0/U','dimensions [0 1 -1 0 0 0 0]; internalField uniform (0 0 0); boundaryField {housing {type fixedValue; value uniform (0 0 0);} movingFace {type uniformFixedValue; uniformValue table ((0 (0 0 0))(0.5 (0 0 0))(0.75 (0 .35 0))(1 (0 .7 0))); value uniform (0 0 0);}}','volVectorField')
write('0/alpha.oil','dimensions [0 0 0 0 0 0 0]; internalField uniform 0; boundaryField {housing {type zeroGradient;} movingFace {type zeroGradient;}}','volScalarField')
write('0/p_rgh','dimensions [1 -1 -2 0 0 0 0]; internalField uniform 0; boundaryField {housing {type fixedFluxPressure; value uniform 0;} movingFace {type fixedFluxPressure; value uniform 0;}}','volScalarField')
probes=[{'id':f'C{k+1}','name':f'{"Cerca" if k%2 else "Lejos"} de pared · {height:.2f} m','position':[.92 if k%2 else .25,height,.25]} for k,height in enumerate(h for h in (.1,.22,.3,.4,.55,.7) for _ in (0,1))]
vec=lambda p:'('+' '.join(map(str,p))+')'
write('system/controlDict','application interFoam; startFrom startTime; startTime 0; stopAt endTime; endTime 3; deltaT .0005; writeControl adjustableRunTime; writeInterval .1; purgeWrite 0; writeFormat ascii; writePrecision 10; writeCompression off; timeFormat general; timePrecision 10; runTimeModifiable true; adjustTimeStep yes; maxCo .3; maxAlphaCo .2; maxDeltaT .004; functions {probes {type probes; libs ("libsampling.so"); writeControl adjustableRunTime; writeInterval .02; fields (alpha.oil p U); probeLocations ('+' '.join(vec(p['position']) for p in probes)+');} oilVolume {type volFieldValue; libs ("libfieldFunctionObjects.so"); writeControl adjustableRunTime; writeInterval .02; regionType all; writeFields false; operation volIntegrate; fields (alpha.oil);} extrema {type fieldMinMax; libs ("libfieldFunctionObjects.so"); writeControl timeStep; writeInterval 1; fields (U alpha.oil rho); log true;}}')
write('system/fvSchemes','ddtSchemes {default Euler;} gradSchemes {default Gauss linear;} divSchemes {div(rhoPhi,U) Gauss linearUpwind grad(U); div(phi,alpha) Gauss vanLeer; div(phirb,alpha) Gauss linear; div(((rho*nuEff)*dev2(T(grad(U))))) Gauss linear;} laplacianSchemes {default Gauss linear orthogonal;} interpolationSchemes {default linear;} snGradSchemes {default orthogonal;}')
write('system/fvSolution','solvers {"alpha.oil.*" {nAlphaCorr 2; nAlphaSubCycles 1; cAlpha 1; MULESCorr yes; nLimiterIter 3; solver smoothSolver; smoother symGaussSeidel; tolerance 1e-8; relTol 0;} "pcorr.*" {solver PCG; preconditioner DIC; tolerance 1e-8; relTol 0;} p_rgh {solver PCG; preconditioner DIC; tolerance 1e-7; relTol .05;} p_rghFinal {$p_rgh; relTol 0;} "U.*" {solver smoothSolver; smoother symGaussSeidel; tolerance 1e-6; relTol 0; minIter 1;}} PIMPLE {momentumPredictor no; nOuterCorrectors 1; nCorrectors 3; nNonOrthogonalCorrectors 0; pRefCell 0; pRefValue 0;} relaxationFactors {equations {".*" 1;}}')
# Structured single block, x-fastest cell ordering. Actual volume checked after meshing.
nx,ny,nz=20,16,8;dy=.8/ny;alpha=[]
for k in range(nz):
 for j in range(ny):
  alpha.extend([min(1,max(0,(.19-j*dy)/dy))]*nx)
write('0/alpha.oil','dimensions [0 0 0 0 0 0 0]; internalField nonuniform List<scalar> '+str(len(alpha))+' ( '+' '.join(map(str,alpha))+' ); boundaryField {housing {type zeroGradient;} movingFace {type zeroGradient;}}','volScalarField')
(out/'assumptions.json').write_text(json.dumps({'maturity':'Simulada, no validada','geometry':'Closed 3D planar moving-wall benchmark; local gear-face shear approximation, not full reducer or rotor','dimensions_m':[1,.8,.5],'cells':len(alpha),'oil_liters':95,'oil_initial_height_m':.19,'wall_velocity_m_s':.7,'settle_s':.5,'ramp_s':.5,'measurement_s':2,'gas_compressibility':False,'no_foam_no_oem_CAD':True,'probes':probes},ensure_ascii=False,indent=2),encoding='utf-8')
print(out)
