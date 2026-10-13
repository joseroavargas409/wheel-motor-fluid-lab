import * as THREE from './vendor/three.module.js';
// Screen-space surface: depth splats + bilateral filtering + reconstructed normal.
// This changes only the displayed surface. Physics positions and sensor samples are untouched.
const quadVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const blurFragment=`precision highp float;varying vec2 vUv;uniform sampler2D inputMap;uniform vec2 texel,axis;void main(){float center=textureLod(inputMap,vUv,0.).r;if(center<=0.){gl_FragColor=vec4(0.);return;}float sum=0.,weight=0.;for(int i=-8;i<=8;i++){float fi=float(i);float d=textureLod(inputMap,vUv+axis*texel*fi,0.).r;if(d>0.){float delta=d-center;float w=exp(-fi*fi/32.-delta*delta/.0036);sum+=d*w;weight+=w;}}gl_FragColor=vec4(sum/max(weight,.00001),0.,0.,1.);}`;
const surfaceFragment=`precision highp float;varying vec2 vUv;
uniform sampler2D surfaceMap,sceneColor,sceneDepth;uniform mat4 inverseProjection,cameraWorld;uniform vec2 texel;uniform float nearPlane,farPlane;
vec3 eyePosition(vec2 uv,float distance){vec4 ray=inverseProjection*vec4(uv*2.-1.,1.,1.);return ray.xyz*(-distance/ray.z);}
float opaqueDistance(float d){return nearPlane*farPlane/(farPlane-(farPlane-nearPlane)*d);}
void main(){vec4 bg=texture2D(sceneColor,vUv);bg.rgb=pow(max(bg.rgb,vec3(0.)),vec3(1./2.2));float d=texture2D(surfaceMap,vUv).r;if(d<=0.){gl_FragColor=bg;return;}
 if(d>opaqueDistance(texture2D(sceneDepth,vUv).r)+.002){gl_FragColor=bg;return;}
 vec3 p=eyePosition(vUv,d);vec3 world=(cameraWorld*vec4(p,1.)).xyz;if(length(world.xz)>.515||abs(world.y)>.465){gl_FragColor=bg;return;}
 float dl=texture2D(surfaceMap,vUv-vec2(texel.x,0.)).r,dr=texture2D(surfaceMap,vUv+vec2(texel.x,0.)).r;
 float db=texture2D(surfaceMap,vUv-vec2(0.,texel.y)).r,dt=texture2D(surfaceMap,vUv+vec2(0.,texel.y)).r;
 if(dl<=0.)dl=d;if(dr<=0.)dr=d;if(db<=0.)db=d;if(dt<=0.)dt=d;
 vec3 dx=eyePosition(vUv+vec2(texel.x,0.),dr)-eyePosition(vUv-vec2(texel.x,0.),dl);
 vec3 dy=eyePosition(vUv+vec2(0.,texel.y),dt)-eyePosition(vUv-vec2(0.,texel.y),db);
 vec3 normal=normalize(cross(dx,dy));if(normal.z<0.)normal=-normal;
 vec3 light=normalize(vec3(-.45,.7,1.));vec3 view=normalize(-p);float diffuse=max(dot(normal,light),0.);
 float spec=pow(max(dot(normal,normalize(light+view)),0.),70.);float fresnel=pow(1.-max(dot(normal,view),0.),4.);
 vec3 amber=vec3(.69,.32,.055)*(.55+.6*diffuse);vec3 reflection=mix(vec3(.08,.21,.28),vec3(.68,.81,.81),max(normal.y*.5+.5,0.));
 vec3 refracted=texture2D(sceneColor,clamp(vUv+normal.xy*.006,vec2(.001),vec2(.999))).rgb;
 refracted=pow(max(refracted,vec3(0.)),vec3(1./2.2));vec3 oil=mix(amber,refracted*.5+amber*.5,.18)+spec*vec3(.8,.78,.6);
 oil=mix(oil,reflection,.08+.38*fresnel);gl_FragColor=vec4(oil,1.);
}`;
export class FluidRenderer {
 constructor(renderer,scene,camera,positions,radius=.016){this.renderer=renderer;this.scene=scene;this.camera=camera;this.mode='smooth';this.width=1;this.height=1;
   this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
   this.pointsMaterial=new THREE.PointsMaterial({color:'#ffcc72',size:radius*1.8,transparent:true,opacity:.85});
   this.rawPoints=new THREE.Points(this.geometry,this.pointsMaterial);this.rawPoints.frustumCulled=false;
   this.fluidScene=new THREE.Scene();this.fluidScene.add(this.rawPoints);
   this.depthMaterial=new THREE.ShaderMaterial({uniforms:{radius:{value:radius*1.4},height:{value:1},projection:{value:camera.projectionMatrix}},
     vertexShader:`uniform float radius,height;varying vec3 eyeCenter;void main(){vec4 p=modelViewMatrix*vec4(position,1.);eyeCenter=p.xyz;gl_Position=projectionMatrix*p;gl_PointSize=radius*height*projectionMatrix[1][1]/max(.01,-p.z);}`,
     fragmentShader:`precision highp float;uniform float radius;uniform mat4 projection;varying vec3 eyeCenter;void main(){vec2 q=gl_PointCoord*2.-1.;q.y=-q.y;float r2=dot(q,q);if(r2>1.)discard;vec3 p=eyeCenter+radius*vec3(q,sqrt(1.-r2));vec4 clip=projection*vec4(p,1.);gl_FragDepth=clip.z/clip.w*.5+.5;gl_FragColor=vec4(-p.z,0.,0.,1.);}`});
   this.quadScene=new THREE.Scene();this.quadCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial());this.quadScene.add(this.quad);
   this.blurMaterial=new THREE.ShaderMaterial({uniforms:{inputMap:{value:null},texel:{value:new THREE.Vector2(1,1)},axis:{value:new THREE.Vector2(1,0)}},vertexShader:quadVertex,fragmentShader:blurFragment,depthTest:false,depthWrite:false});
   this.surfaceMaterial=new THREE.ShaderMaterial({uniforms:{surfaceMap:{value:null},sceneColor:{value:null},sceneDepth:{value:null},inverseProjection:{value:camera.projectionMatrixInverse},cameraWorld:{value:camera.matrixWorld},texel:{value:new THREE.Vector2()},nearPlane:{value:camera.near},farPlane:{value:camera.far}},vertexShader:quadVertex,fragmentShader:surfaceFragment,depthTest:false,depthWrite:false});
   this.targets=[];this.resize(640,420);
 }
 resize(w,h){const width=Math.max(1,Math.round(w)),height=Math.max(1,Math.round(h));if(width===this.width&&height===this.height)return;this.width=width;this.height=height;this.targets.forEach(t=>t.dispose());
   const make=()=>new THREE.WebGLRenderTarget(width,height,{type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});
   this.opaque=make();this.opaque.depthTexture=new THREE.DepthTexture(width,height,THREE.UnsignedIntType);
   this.depth=make();this.a=make();this.b=make();this.targets=[this.opaque,this.depth,this.a,this.b];this.depthMaterial.uniforms.height.value=height;
   this.blurMaterial.uniforms.texel.value.set(1/width,1/height);this.surfaceMaterial.uniforms.texel.value.set(1/width,1/height);
 }
 setPositions(){this.geometry.attributes.position.needsUpdate=true;}
 render(){const r=this.renderer;if(this.mode==='particles'){r.setRenderTarget(null);r.render(this.scene,this.camera);r.autoClear=false;this.rawPoints.material=this.pointsMaterial;r.render(this.fluidScene,this.camera);r.autoClear=true;return;}
   r.setRenderTarget(this.opaque);r.setClearColor('#091823',1);r.render(this.scene,this.camera);
   r.setRenderTarget(this.depth);r.setClearColor(0,0);this.rawPoints.material=this.depthMaterial;r.render(this.fluidScene,this.camera);
   this.quad.material=this.blurMaterial;let current=this.depth;
   for(let pass=0;pass<8;pass++){const target=pass%2?this.b:this.a;this.blurMaterial.uniforms.inputMap.value=current.texture;this.blurMaterial.uniforms.axis.value.set(pass%2?0:1,pass%2?1:0);r.setRenderTarget(target);r.render(this.quadScene,this.quadCamera);current=target;}
   const u=this.surfaceMaterial.uniforms;u.surfaceMap.value=current.texture;u.sceneColor.value=this.opaque.texture;u.sceneDepth.value=this.opaque.depthTexture;this.quad.material=this.surfaceMaterial;r.setRenderTarget(null);r.render(this.quadScene,this.quadCamera);
 }
 dispose(){this.targets.forEach(t=>t.dispose());this.geometry.dispose();this.depthMaterial.dispose();this.pointsMaterial.dispose();this.blurMaterial.dispose();this.surfaceMaterial.dispose();}
}
