import {CAVITY} from './coupling.js';
// The same three uniforms are shared by all context materials. These only control
// inspection visibility; they do not change particle fields, collisions or sensors.
export function contextClipUniforms() {
  return {labExcludeCavity:{value:1},labCutHousing:{value:1}};
}
export function installContextClip(material,uniforms,isHousing) {
  material.onBeforeCompile=shader=>{
    shader.uniforms.labExcludeCavity=uniforms.labExcludeCavity;
    shader.uniforms.labCutHousing=uniforms.labCutHousing;
    shader.vertexShader='varying vec3 labWorldPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nlabWorldPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader='varying vec3 labWorldPosition;\nuniform float labExcludeCavity;\nuniform float labCutHousing;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
      if(labExcludeCavity>0.5 && dot(labWorldPosition.xz,labWorldPosition.xz)<${(CAVITY.radius**2).toFixed(9)} && abs(labWorldPosition.y)<${CAVITY.halfLength.toFixed(9)})discard;
      ${isHousing?'if(labCutHousing>0.5 && labWorldPosition.x>0.0 && labWorldPosition.z>0.0)discard;':''}`);
  };
  material.customProgramCacheKey=()=>`mechanical-context-v2-${isHousing?'housing':'part'}`;
  material.needsUpdate=true;
}
