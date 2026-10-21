
/* ---------- renderer & world ---------- */
// One airport region at a time: loadRegion() disposes the old scene and builds the new one from b_airports.js.
const glCanvas=$('#gl');
let renderer,scene,camera,sun,hemi,skyMat,maxAniso=4;
const W3={pts:[],papi:[],rabbit:[],cityLights:null,glowTex:null,rings:[],parked:[],clouds:[],grid:new Map(),boxes:new Map()};
const GRID=60;
function gridKey(x,z){return Math.floor(x/GRID)+','+Math.floor(z/GRID);}
function addObstacle(x0,x1,z0,z1,h){for(let x=Math.floor(x0/GRID);x<=Math.floor(x1/GRID);x++)for(let z=Math.floor(z0/GRID);z<=Math.floor(z1/GRID);z++){const k=x+','+z;if((W3.grid.get(k)||0)<h)W3.grid.set(k,h);}}
// precise boxes for the airport (buildings and parked aircraft), so taxiing past a hangar never counts as a collision
function addBox(x0,x1,z0,z1,h){const b=[x0,x1,z0,z1,h];for(let x=Math.floor(x0/100);x<=Math.floor(x1/100);x++)for(let z=Math.floor(z0/100);z<=Math.floor(z1/100);z++){const k=x+','+z;if(!W3.boxes.has(k))W3.boxes.set(k,[]);W3.boxes.get(k).push(b);}}
function obstacleH(x,z){let h=W3.grid.get(gridKey(x,z))||0;const l=W3.boxes.get(Math.floor(x/100)+','+Math.floor(z/100));if(l)for(const b of l)if(x>=b[0]&&x<=b[1]&&z>=b[2]&&z<=b[3]&&b[4]>h)h=b[4];return h;}
function tex(w,h,draw,rep){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new THREE.CanvasTexture(cv);t.anisotropy=maxAniso;t.encoding=THREE.sRGBEncoding;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;}return t;}
function glowTex(){return tex(64,64,(c)=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.25,'rgba(255,255,255,.7)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,64,64);});}
function lightPoints(arr,size,night){
  const g=new THREE.BufferGeometry();const pos=[],col=[];for(const p of arr){pos.push(p[0],p[1],p[2]);const c=new THREE.Color(p[3]);col.push(c.r,c.g,c.b);}
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  const m=new THREE.PointsMaterial({size,sizeAttenuation:false,map:W3.glowTex,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false});
  const pts=new THREE.Points(g,m);pts.frustumCulled=false;scene.add(pts);W3.pts.push({pts,size,night});return pts;}

/* ---- the region's geography in local metres: city districts, water, rivers, hills ---- */
let CITY_C=[],WATER=[],RIVERS=[],HILLS=[];
function prepareRegion(){const R=REGION;
  CITY_C=(R.districts||[]).map(c=>{const p=geo(c[0],c[1]);return{x:p.x,z:p.z,w:c[2],s2:2*(c[3]*1000)**2,tall:c[4]||1};});
  WATER=(R.water||[]).map(poly=>{const f=[];for(const [la,lo] of poly){const p=geo(la,lo);f.push(p.x,p.z);}let b=[1e9,-1e9,1e9,-1e9];for(let i=0;i<f.length;i+=2)b=[Math.min(b[0],f[i]),Math.max(b[1],f[i]),Math.min(b[2],f[i+1]),Math.max(b[3],f[i+1])];return{p:f,b};});
  RIVERS=(R.rivers||[]).map(r=>({name:r.name,w:r.w,bank:r.bank||0,pts:smoothLine(r.pts.map(q=>geo(q[0],q[1])),10)}));
  HILLS=(R.hills||[]).map(h=>{const p=geo(h[0],h[1]);return{x:p.x,z:p.z,s2:2*(h[2]*1000*0.5)**2,h:h[3]};});}
function inWater(x,z){for(const w of WATER)if(x>=w.b[0]&&x<=w.b[1]&&z>=w.b[2]&&z<=w.b[3]&&pointInPoly(x,z,w.p))return true;
  for(const r of RIVERS){for(let i=0;i<r.pts.length-1;i+=1){const a=r.pts[i],b=r.pts[i+1];const dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz||1;const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/l2,0,1);if(Math.hypot(x-a.x-dx*t,z-a.z-dz*t)<r.w/2+20)return true;}}return false;}
// terrain height above the field (hills), used for drawing, ground proximity and collisions
function terrainH(x,z){let h=0;for(const k of HILLS){const d2=(x-k.x)**2+(z-k.z)**2;if(d2<k.s2*6)h+=k.h*Math.exp(-d2/k.s2);}return h;}
// buildings stay low under the final approaches (a simplified obstacle-limitation surface)
function approachLimit(x,z){let lim=1e9;for(const e of ENDS){const rx=x-e.T.x,rz=z-e.T.z;const along=-(rx*e.dx+rz*e.dz),cross=Math.abs(rx*(-e.dz)+rz*e.dx);
  // the approach surface: 2% (1 in 50) from 60 m before the threshold, widening 15% each side
  if(along>-60&&along<15000&&cross<150+Math.max(0,along)*0.15)lim=Math.min(lim,Math.max(0,along-60)*0.02);}
  // beside the runways: the transitional surface rises 1 in 7 from 150 m off the centreline
  for(const rw of RWYS){const l=rwLocal(rw,x,z);if(l.along>-300&&l.along<rw.len+300)lim=Math.min(lim,Math.max(0,(Math.abs(l.cross)-150)/7));}return lim;}
function cityDensity(x,z){let d=0,tall=1;for(const c of CITY_C){const v=c.w*Math.exp(-((x-c.x)**2+(z-c.z)**2)/c.s2);if(v>d){d=v;tall=c.tall;}}
  d*=0.75+0.5*vnoise2(x/1400,z/1400);
  if(OSM_BOX&&x>OSM_BOX.x0-300&&x<OSM_BOX.x1+300&&z>OSM_BOX.z0-300&&z<OSM_BOX.z1+300){if(nearAerodrome(x,z)||osmBuilt(x,z))return 0;}
  else if(!OSM_BOX&&Math.abs(x)<2500&&Math.abs(z)<3500)return 0;
  cityDensity.tall=tall;return clamp(d,0,1);}
function disposeScene(){if(!scene)return;scene.traverse(o=>{if(o.geometry)o.geometry.dispose();const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];for(const m of ms){for(const k of ['map','alphaMap','emissiveMap'])if(m[k])m[k].dispose();m.dispose();}});
  for(const k of ['pts','papi','rabbit','rings','parked','clouds'])W3[k]=[];W3.grid=new Map();W3.boxes=new Map();W3.cityLights=null;W3.terminal=null;PAVE.segs.clear();PAVE.polys.length=0;OSM_CELLS=null;}
// ground palettes: Punjab fields, arid Sindh, Gulf desert, temperate Europe and North America
const GROUNDS={
  fields:{base:'#7a8648',pal:['#7f8d4a','#8f9a52','#a69e5f','#6c7c3c','#b3a56b','#617539','#8a904e','#9d905a','#748a44'],lines:'rgba(70,62,38,.4)',furrows:0.07,tracks:'rgba(176,158,118,.75)',grass:'#6d7c40'},
  arid:{base:'#b49f78',pal:['#b8a47e','#a9946c','#c2b08a','#9c8a66','#a59a6e','#8f8a5c','#c8b591'],lines:'rgba(110,92,60,.25)',furrows:0.03,tracks:'rgba(205,190,160,.7)',grass:'#9a9466'},
  desert:{base:'#d7c39b',pal:['#d8c39a','#cfb88c','#e0cca4','#c8ae84','#dcc8a0','#d2bd92'],lines:'rgba(160,130,90,0)',furrows:0,tracks:'rgba(230,215,185,.6)',grass:'#c9b48a'},
  temperate:{base:'#6c8a46',pal:['#6f8f4a','#7a9a50','#5f803e','#88a058','#6a8a44','#94a462','#7d8f4c','#a9a86a'],lines:'rgba(40,58,28,.55)',furrows:0.05,tracks:'rgba(150,140,110,.6)',grass:'#5f7d3c'}};
function groundTex(G){return tex(1024,1024,(c,w,h)=>{const r=rng(11);c.fillStyle=G.base;c.fillRect(0,0,w,h);const cell=64;
  for(let y=0;y<h;y+=cell)for(let x=0;x<w;x+=cell){const n=1+Math.floor(r()*3),vert=r()<0.5;
    for(let k=0;k<n;k++){c.fillStyle=G.pal[Math.floor(r()*G.pal.length)];const a=k*cell/n;if(vert)c.fillRect(x+a,y,cell/n,cell);else c.fillRect(x,y+a,cell,cell/n);
      if(G.furrows){c.globalAlpha=G.furrows;c.fillStyle='#2b2a18';for(let f=0;f<8;f++){if(vert)c.fillRect(x+a+f*(cell/n)/8,y,1,cell);else c.fillRect(x,y+a+f*(cell/n)/8,cell,1);}c.globalAlpha=1;}}
    c.strokeStyle=G.lines;c.lineWidth=G===GROUNDS.temperate?2.5:1.5;c.strokeRect(x+0.75,y+0.75,cell-1.5,cell-1.5);}
  if(G===GROUNDS.desert){c.strokeStyle='rgba(170,140,95,.25)';c.lineWidth=3;for(let i=0;i<60;i++){c.beginPath();const y=r()*h;c.moveTo(0,y);for(let x=0;x<=w;x+=32)c.lineTo(x,y+Math.sin(x*0.02+i)*12);c.stroke();}}
  else for(let i=0;i<260;i++){c.fillStyle=`rgba(${40+r()*20},${58+r()*20},${28},.65)`;const x=r()*w,y=r()*h;c.beginPath();c.arc(x,y,1.5+r()*3.5,0,7);c.fill();}
  c.strokeStyle=G.tracks;c.lineWidth=2.2;for(let i=0;i<5;i++){c.beginPath();const y=r()*h;c.moveTo(0,y);for(let x=0;x<=w;x+=64)c.lineTo(x,y+Math.sin(x*0.01+i)*20);c.stroke();}
},true);}
function buildWorld(){
  W3.glowTex=W3.glowTex||glowTex();
  disposeScene();scene=new THREE.Scene();prepareRegion();osmBoxFrom(REGION_OSM);
  if(!camera)camera=new THREE.PerspectiveCamera(60,1,0.5,60000);
  hemi=new THREE.HemisphereLight('#bcd2e8','#7a7350',0.6);scene.add(hemi);
  sun=new THREE.DirectionalLight('#fff3df',1.0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  const sc=sun.shadow.camera;sc.left=-90;sc.right=90;sc.top=90;sc.bottom=-90;sc.near=10;sc.far=1400;sun.shadow.bias=-0.0006;scene.add(sun);scene.add(sun.target);
  scene.fog=new THREE.Fog(REGION.haze||'#c9cfc8',3000,20000);
  // sky dome
  skyMat=new THREE.ShaderMaterial({uniforms:{top:{value:new THREE.Color('#5f8fbf')},hz:{value:new THREE.Color('#cfd6d2')}},side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform vec3 top;uniform vec3 hz;varying vec3 vP;void main(){float h=clamp(vP.y,0.0,1.0);gl_FragColor=vec4(mix(hz,top,pow(h,0.55)),1.0);}'});
  const sky=new THREE.Mesh(new THREE.SphereGeometry(45000,32,16),skyMat);sky.frustumCulled=false;sky.renderOrder=-1;scene.add(sky);W3.sky=sky;
  // ground, tinted where the city is and on the airfield
  const G=GROUNDS[REGION.ground]||GROUNDS.fields;W3.G=G;const fields=groundTex(G);fields.repeat.set(44,44);
  const GS=70000,seg=180;const gg=new THREE.PlaneGeometry(GS,GS,seg,seg);gg.rotateX(-Math.PI/2);
  const gcol=[];const gp=gg.attributes.position;const desert=G===GROUNDS.desert;
  for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getZ(i);const d=cityDensity(x,z);let r=1,g=1,b=1;
    const air=inBoundary(x,z)?1:0;
    r=lerp(1,desert?1.05:1.32,d);g=lerp(1,desert?1.02:1.14,d);b=lerp(1,desert?1.1:1.7,d);if(air){r=0.95;g=1.02;b=0.85;}
    const n=0.92+0.16*vnoise2(x/3000,z/3000);gcol.push(r*n,g*n,b*n);}
  gg.setAttribute('color',new THREE.Float32BufferAttribute(gcol,3));
  const ground=new THREE.Mesh(gg,new THREE.MeshLambertMaterial({map:fields,vertexColors:true}));ground.receiveShadow=true;scene.add(ground);W3.ground=ground;
  buildWater();buildHills();buildAirport();buildCity();buildLandmarks();buildTrees();buildClouds();
}
function ribbon(points,width,y,mat){const pos=[],idx=[];for(let i=0;i<points.length;i++){const p=points[i],q=points[Math.min(i+1,points.length-1)],o=points[Math.max(i-1,0)];
    let dx=q.x-o.x,dz=q.z-o.z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;pos.push(p.x-dz*width/2,y,p.z+dx*width/2,p.x+dz*width/2,y,p.z-dx*width/2);if(i<points.length-1){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.receiveShadow=true;scene.add(m);return m;}
function smoothLine(pts,n){const out=[];for(let i=0;i<pts.length-1;i++){const p0=pts[Math.max(i-1,0)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(i+2,pts.length-1)];
  for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t;const f=(a,b,c,d)=>0.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);out.push({x:f(p0.x,p1.x,p2.x,p3.x),z:f(p0.z,p1.z,p2.z,p3.z)});}}out.push(pts[pts.length-1]);return out;}
function buildWater(){
  const wm=new THREE.MeshStandardMaterial({color:REGION.ground==='desert'?'#3f7c8a':'#4e6f78',roughness:0.22,metalness:0.12});W3.waterM=wm;
  for(const w of WATER){const s=new THREE.Shape();for(let i=0;i<w.p.length;i+=2){i?s.lineTo(w.p[i],-w.p[i+1]):s.moveTo(w.p[i],-w.p[i+1]);}const g=new THREE.ShapeGeometry(s);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,wm);m.position.y=0.25;m.receiveShadow=true;scene.add(m);}
  for(const r of RIVERS){const line=r.bank?r.pts.map((p,i)=>({x:p.x+Math.sin(i*0.7)*r.w*0.4,z:p.z})):r.pts;
    if(r.bank)ribbon(line,r.bank,0.15,new THREE.MeshLambertMaterial({color:'#b9aa86'}));ribbon(line,r.w,0.3,wm);}}
function buildHills(){if(!HILLS.length)return;const G=W3.G;
  for(const k of HILLS){const R=Math.sqrt(k.s2)*2.4,seg=48;const g=new THREE.PlaneGeometry(R*2,R*2,seg,seg);g.rotateX(-Math.PI/2);const p=g.attributes.position,col=[];const c1=new THREE.Color('#5b6b3a'),c2=new THREE.Color('#8a8466'),tmp=new THREE.Color();
    for(let i=0;i<p.count;i++){const x=p.getX(i)+k.x,z=p.getZ(i)+k.z;const h=terrainH(x,z)*(0.9+0.2*vnoise2(x/700,z/700));p.setY(i,h);tmp.copy(c1).lerp(c2,clamp(h/1000,0,1));col.push(tmp.r,tmp.g,tmp.b);}
    g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true}));m.position.set(k.x,0,k.z);m.receiveShadow=true;scene.add(m);}}
/* ---- airport ---- */
const PAINT='rgba(244,244,236,.92)';
function runwayEndTex(rw,end){
  const ppm=3.6,L=1000,Wd=rw.w;const w=Math.round(Wd*ppm),h=Math.round(L*ppm);
  return tex(w,h,(c)=>{const m=v=>v*ppm;const cx=w/2;
    c.fillStyle=PAINT;c.fillRect(0,0,m(0.9),h);c.fillRect(w-m(0.9),0,m(0.9),h);c.fillRect(0,0,w,m(2.4));
    const sw=1.8,nst=Math.max(4,Math.min(8,Math.floor((Wd-6)/(sw*4))));for(let i=0;i<nst;i++){const off=m(3+i*sw*2);c.fillRect(cx-m(2)-off-m(sw),m(6),m(sw),m(30));c.fillRect(cx+m(2)+off,m(6),m(sw),m(30));}
    // designator, rotated 180° so it reads correctly from the approach
    const num=end.name.replace(/[LRC]$/,''),let_=end.name.slice(num.length);
    c.save();c.translate(cx,m(80));c.rotate(Math.PI);c.fillStyle=PAINT;c.textAlign='center';c.textBaseline='middle';
    c.font=`700 ${Math.round(m(17))}px "Arial Narrow",Arial,sans-serif`;c.fillText(num,0,m(-9));if(let_)c.fillText(let_,0,m(12));c.restore();
    for(let y=110;y<L;y+=50)c.fillRect(cx-m(0.45),m(y),m(0.9),m(30));
    const tdz=[[150,3],[300,3],[450,2],[600,2],[750,1],[900,1]];
    for(const [d,n] of tdz){if(d===300)continue;for(let k=0;k<n;k++){const o=m(4+k*3);c.fillRect(cx-o-m(1.8),m(d),m(1.8),m(22.5));c.fillRect(cx+o,m(d),m(1.8),m(22.5));}}
    c.fillRect(cx-m(15),m(300),m(9),m(45));c.fillRect(cx+m(6),m(300),m(9),m(45));
    const r=rng(end.name.charCodeAt(0)*7+end.name.charCodeAt(end.name.length>2?2:1));c.fillStyle='rgba(20,20,20,.22)';
    for(let i=0;i<70;i++){const y=m(260+r()*560),x=cx+(r()-0.5)*m(12);c.save();c.translate(x,y);c.rotate((r()-0.5)*0.08);c.fillRect(-m(0.5),0,m(1),m(18+r()*50));c.restore();}
  });}
// arrows on a displaced-threshold area, pointing to the threshold
function arrowsTex(w){return tex(64,256,(c,W,H)=>{c.fillStyle=PAINT;c.fillRect(W/2-2,40,4,150);c.beginPath();c.moveTo(W/2,10);c.lineTo(W/2-14,50);c.lineTo(W/2+14,50);c.fill();},true);}
function surfaceTex(color,dark){return tex(256,256,(c,w,h)=>{c.fillStyle=color;c.fillRect(0,0,w,h);const r=rng(dark?3:5);for(let i=0;i<2500;i++){const v=r();c.fillStyle=`rgba(${v<0.5?0:255},${v<0.5?0:255},${v<0.5?0:255},${0.02+r()*0.04})`;c.fillRect(r()*w,r()*h,1+r()*2,1+r()*2);}
  if(!dark){c.strokeStyle='rgba(0,0,0,.1)';c.lineWidth=1;for(let i=0;i<=w;i+=w/4){c.beginPath();c.moveTo(i,0);c.lineTo(i,h);c.stroke();c.beginPath();c.moveTo(0,i);c.lineTo(w,i);c.stroke();}}},true);}
function flat(w,l,mat,x,z,ang,y){const g=new THREE.PlaneGeometry(w,l);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);m.rotation.y=ang;m.receiveShadow=true;scene.add(m);return m;}
function box(w,h,d,mat,x,y,z,ry){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y+h/2,z);if(ry)m.rotation.y=ry;m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
function buildAirport(){
  if(!RWYS.length)return;
  const G=W3.G;const grassT=tex(128,128,(c,w,h)=>{c.fillStyle=G.grass;c.fillRect(0,0,w,h);const r=rng(4);for(let i=0;i<600;i++){c.fillStyle=`rgba(${r()<0.5?40:150},${r()<0.5?60:160},30,.12)`;c.fillRect(r()*w,r()*h,2,2);}for(let x=0;x<w;x+=16){c.fillStyle='rgba(255,255,255,.04)';c.fillRect(x,0,8,h);}},true);grassT.repeat.set(26,58);
  const grass=new THREE.MeshLambertMaterial({map:grassT});
  const pts=[];const concrete=surfaceTex('#9d9a90',false),asphalt=surfaceTex('#4b4d4f',true);const pole=new THREE.MeshLambertMaterial({color:'#6e6e66'}),papiM=new THREE.MeshLambertMaterial({color:'#3a3b36'});
  const paintM=t=>new THREE.MeshLambertMaterial({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  for(const rw of RWYS){
    const cx=(rw.A.x+rw.B.x)/2,cz=(rw.A.z+rw.B.z)/2,ang=Math.atan2(rw.dx,rw.dz);
    const t=rw.surf==='concrete'?concrete.clone():asphalt.clone();t.needsUpdate=true;t.repeat.set(rw.w/24,rw.len/24);
    flat(rw.w,rw.len+60,new THREE.MeshLambertMaterial({map:t}),cx,cz,ang,0.12);
    flat(rw.w+30,rw.len+120,new THREE.MeshLambertMaterial({color:rw.surf==='concrete'?'#9c9a8e':'#5c5e5c'}),cx,cz,ang,0.09);
    for(const e of rw.ends){flat(rw.w,1000,paintM(runwayEndTex(rw,e)),e.T.x+e.dx*500,e.T.z+e.dz*500,Math.atan2(e.dx,e.dz),0.18);
      if(e.disp>30){const at=arrowsTex();at.repeat.set(Math.max(1,Math.round(rw.w/14)),e.disp/60);flat(rw.w*0.7,e.disp-6,paintM(at),e.end.x+e.dx*e.disp/2,e.end.z+e.dz*e.disp/2,Math.atan2(e.dx,e.dz),0.18);}}
    // centreline between the two touchdown-zone markings
    const a0=rw.ends[0].disp+1000,a1=rw.len-rw.ends[1].disp-1000;
    if(a1>a0){const mid=tex(32,64,(c,w,h)=>{c.fillStyle=PAINT;c.fillRect(w/2-1,0,2,h*0.6);c.fillRect(0,0,1,h);c.fillRect(w-1,0,1,h);});mid.repeat.set(1,(a1-a0)/50);
      flat(rw.w,a1-a0,paintM(mid),rw.A.x+rw.dx*(a0+a1)/2,rw.A.z+rw.dz*(a0+a1)/2,ang,0.18);}
    // edge lights; green threshold bars and red runway-end bars
    const px=-rw.dz,pz=rw.dx;
    for(let a=0;a<=rw.len;a+=60)for(const s of [-1,1]){pts.push([rw.A.x+rw.dx*a+px*s*(rw.w/2+1.5),0.6,rw.A.z+rw.dz*a+pz*s*(rw.w/2+1.5),a>rw.len-600||a<600?'#ffd890':'#fff4dc']);}
    for(const e of rw.ends){const ex=-e.dz,ez=e.dx;for(let k=-rw.w/2;k<=rw.w/2;k+=3){pts.push([e.T.x+ex*k-e.dx*2,0.5,e.T.z+ez*k-e.dz*2,'#4dff7a']);pts.push([e.end.x+ex*k+e.dx*1,0.5,e.end.z+ez*k+e.dz*1,'#ff4030']);}
      // approach lights: a 900 m system with a sequenced flasher on ILS runways, a short one otherwise
      const alsL=e.ils?900:420;for(let a=60;a<=alsL+e.disp;a+=30){const x=e.T.x-e.dx*a,z=e.T.z-e.dz*a;for(const o of [-1.5,0,1.5])pts.push([x+ex*o,2.5,z+ez*o,'#fff8e8']);
        if(a===300||(e.ils&&a===600))for(let o=-15;o<=15;o+=2)pts.push([x+ex*o,2.5,z+ez*o,'#fff8e8']);
        if(a>e.disp){const pl=box(0.2,2.4,0.2,pole,x,0,z);pl.castShadow=false;}}
      if(e.ils){const r=[];for(let a=60;a<=alsL;a+=30)r.push([e.T.x-e.dx*a,2.8,e.T.z-e.dz*a,'#ffffff']);W3.rabbit.push(lightPoints(r,9,true));}
      // PAPI on the pilot's left
      const left=-1;const pp=[];for(let i=0;i<4;i++){const off=rw.w/2+15+i*9;pp.push([e.T.x+e.dx*300+ex*left*off,1.0,e.T.z+e.dz*300+ez*left*off,'#ff3020']);}
      for(const p of pp)box(1.6,0.9,1.0,papiM,p[0],0,p[2]);
      W3.papi.push({end:e,pts:lightPoints(pp,7,false)});
      // windsock
      const wsx=e.T.x+e.dx*150+ex*-(rw.w/2+60),wsz=e.T.z+e.dz*150+ez*-(rw.w/2+60);box(0.25,8,0.25,new THREE.MeshLambertMaterial({color:'#d9d9d2'}),wsx,0,wsz);
      const sock=new THREE.Mesh(new THREE.ConeGeometry(0.6,3.2,10,1,true),new THREE.MeshLambertMaterial({color:'#ee7a2c',side:THREE.DoubleSide}));sock.rotation.z=Math.PI/2;sock.position.set(wsx+1.6,7.6,wsz);scene.add(sock);
    }
  }
  lightPoints(pts,4.5,false);
  if(REGION_OSM)buildAirportOSM(REGION_OSM,{grass,concrete,asphalt});else buildAirportGeneric({grass,concrete,asphalt});
}
function buildCity(){
  const r=rng(42+REGION.icao.charCodeAt(1));const tmp=new THREE.Object3D();const col=new THREE.Color();
  const pal=REGION.ground==='desert'||REGION.ground==='arid'?['#e3d6bd','#d8c8a8','#efe6d3','#cbb894','#e6dccb','#bfae8e','#f2ede2','#d3c3a0']:REGION.ground==='temperate'?['#b9a593','#a8927e','#c9c0b2','#8f7f72','#b4a89a','#9a8f86','#d8d2c6','#a67c64','#c2b9ad']:['#c9bba0','#b8a88a','#d6cdb8','#a89c86','#c4b296','#9e8e7a','#d9d2c3','#b08a6c','#c7c2b5','#a3876b'];
  const items=[];const lightsP=[];
  // sample the area covered by the city districts, out to 30 km from the airport
  let x0=-3000,x1=3000,z0=-3000,z1=3000;for(const c of CITY_C){const R=Math.sqrt(c.s2)*1.6;x0=Math.min(x0,c.x-R);x1=Math.max(x1,c.x+R);z0=Math.min(z0,c.z-R);z1=Math.max(z1,c.z+R);}
  x0=Math.max(x0,-30000);x1=Math.min(x1,30000);z0=Math.max(z0,-30000);z1=Math.min(z1,30000);
  for(let x=x0;x<=x1;x+=58)for(let z=z0;z<=z1;z+=58){
    const d=cityDensity(x,z);if(d<0.06)continue;if(r()>d*0.62)continue;const tall=cityDensity.tall||1;
    const bx=x+(r()-0.5)*30,bz=z+(r()-0.5)*30;if(inWater(bx,bz)||terrainH(bx,bz)>15)continue;
    let h=5+Math.pow(r(),3)*(d>0.85?55:22)*Math.min(tall,2);if(r()<0.004*d*tall*tall)h+=40+r()*50*tall;if(tall>2&&d>0.6&&r()<0.05)h+=60+r()*80*tall;
    h=Math.min(h,approachLimit(bx,bz));
    // towers keep realistic proportions (a slenderness of about 1:6 at most)
    const w=Math.max(12+r()*22*(0.6+d),h/6.5),dd=Math.max(12+r()*22*(0.6+d),h/7.5);items.push([bx,bz,w,h,dd]);}
  // thin evenly to the quality's budget so every district keeps its share
  const cap={low:14000,medium:30000,high:60000}[progress.quality]||60000;if(items.length>cap){const k=items.length/cap;const kept=[];for(let i=0;i<cap;i++)kept.push(items[Math.floor(i*k)]);items.length=0;items.push(...kept);}
  const geom=new THREE.BoxGeometry(1,1,1);geom.translate(0,0.5,0);
  const im=new THREE.InstancedMesh(geom,new THREE.MeshLambertMaterial(),Math.max(1,items.length));im.receiveShadow=true;im.count=items.length;
  items.forEach((b,i)=>{tmp.position.set(b[0],0,b[1]);tmp.scale.set(b[2],b[3],b[4]);tmp.rotation.y=(r()<0.7?0:r()*0.6);tmp.updateMatrix();im.setMatrixAt(i,tmp.matrix);
    col.set(pal[Math.floor(r()*pal.length)]);if(b[3]>70)col.lerp(new THREE.Color('#7f97a8'),0.6);col.multiplyScalar(0.85+r()*0.25);im.setColorAt(i,col);
    addObstacle(b[0]-b[2]/2,b[0]+b[2]/2,b[1]-b[4]/2,b[1]+b[4]/2,b[3]);
    if(r()<0.45)lightsP.push([b[0]+(r()-0.5)*b[2],b[3]+0.5,b[1]+(r()-0.5)*b[4],r()<0.75?'#ffc985':r()<0.5?'#fff0d0':'#a8d8ff']);});
  im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;scene.add(im);
  W3.cityLights=lightPoints(lightsP,2.6,true);
  // main roads (simplified): from the airport to the largest districts, with street lights
  const start=W3.terminal||{x:0,z:0};const big=CITY_C.slice().sort((a,b)=>b.w*b.s2-a.w*a.s2).slice(0,3);
  const rm=new THREE.MeshLambertMaterial({color:'#55575a'});const sl=[];
  for(const c of big){const mx=(start.x+c.x)/2+(c.z-start.z)*0.12,mz=(start.z+c.z)/2-(c.x-start.x)*0.12;const pts=smoothLine([{x:start.x,z:start.z},{x:mx,z:mz},{x:c.x,z:c.z}],24).filter(p=>!inWater(p.x,p.z)&&!inBoundary(p.x,p.z));
    if(pts.length<4)continue;ribbon(pts,22,0.2,rm);for(let i=0;i<pts.length;i+=2)sl.push([pts[i].x,8,pts[i].z,'#ffb35c']);}
  if(sl.length)lightPoints(sl,3,true);
}
/* ---- landmarks: simplified, recognisable shapes, labelled in the README as such ---- */
const LANDMARK_BUILD={
  minar(g,M){const cream=M.std('#e9e4d6',0.6),marble=M.std('#f2efe8',0.4);const add=(geo,mat,y)=>M.add(g,geo,mat,0,y,0);
    add(new THREE.CylinderGeometry(26,28,2,10),cream,1);add(new THREE.CylinderGeometry(17,19,6,10),cream,5);
    add(new THREE.CylinderGeometry(3.4,7.2,50,16),cream,33);add(new THREE.CylinderGeometry(5.2,5.2,1.2,16),cream,30);add(new THREE.CylinderGeometry(4.4,4.4,1.2,16),cream,46);
    add(new THREE.CylinderGeometry(3.2,3.4,4,16),cream,60);add(new THREE.SphereGeometry(3.2,16,10,0,Math.PI*2,0,Math.PI/2),marble,62);add(new THREE.ConeGeometry(0.4,3,8),marble,66.5);
    for(let i=0;i<4;i++){const a=i*Math.PI/2+0.4;M.add(g,new THREE.ConeGeometry(14,0.3,3),new THREE.MeshLambertMaterial({color:'#6e8b4a'}),Math.cos(a)*60,0.3,Math.sin(a)*60);}return [20,68];},
  badshahi(g,M){const sand=M.std('#a2533a',0.8),marble=M.std('#f2efe8',0.4);const S2=165;const bb=(w,h,d,mat,x,z)=>M.add(g,new THREE.BoxGeometry(w,h,d),mat,x,h/2,z);
    bb(S2,9,8,sand,0,-S2/2);bb(S2,9,8,sand,0,S2/2);bb(8,9,S2,sand,S2/2,0);bb(8,9,S2,sand,-S2/2,0);bb(82,22,26,sand,-S2/2+18,0);bb(18,26,30,sand,S2/2,0);
    for(const [z,r] of [[0,10],[-24,7.5],[24,7.5]])M.add(g,new THREE.SphereGeometry(r,18,12,0,Math.PI*2,0,Math.PI*0.62),marble,-S2/2+18,22+r*0.35,z);
    for(const [x,z] of [[S2/2,S2/2],[S2/2,-S2/2],[-S2/2,S2/2],[-S2/2,-S2/2]])M.minaret(g,x,z,54,3.2,sand,marble);return [90,62];},
  fort(g,M){M.add(g,new THREE.BoxGeometry(420,18,300),M.std('#9b5a3c',0.85),0,9,0);return [210,18];},
  faisal(g,M){const w=M.std('#e8e6e0',0.5);// the tent-shaped prayer hall and four 88 m pencil minarets
    M.add(g,new THREE.ConeGeometry(48,42,8,1),w,0,21,0).rotation.y=Math.PI/8;M.add(g,new THREE.BoxGeometry(170,3,170),M.std('#d9d4c8',0.7),0,1.5,0);
    for(const [x,z] of [[70,70],[70,-70],[-70,70],[-70,-70]]){M.add(g,new THREE.CylinderGeometry(2.2,2.8,80,8),w,x,40,z);M.add(g,new THREE.ConeGeometry(2.4,9,8),w,x,84.5,z);}return [85,90];},
  mazar(g,M){const w=M.std('#f3f2ee',0.35);M.add(g,new THREE.BoxGeometry(110,4,110),M.std('#d6d2c6',0.7),0,2,0);M.add(g,new THREE.BoxGeometry(56,28,56),w,0,18,0);
    const d=M.add(g,new THREE.SphereGeometry(30,24,12,0,Math.PI*2,0,Math.PI/2),w,0,32,0);d.scale.set(0.95,0.55,0.95);return [55,48];},
  burj(g,M){const gl=M.std('#c9d5dd',0.2,0.55);let y=0;const segs=[[34,160],[29,130],[24,120],[19,110],[14,90],[10,70],[7,50]];
    for(const [r,h] of segs){M.add(g,new THREE.CylinderGeometry(r*0.92,r,h,6),gl,0,y+h/2,0).rotation.y=0.3;y+=h;}M.add(g,new THREE.CylinderGeometry(1,4,98,6),gl,0,y+49,0);return [40,828];},
  sail(g,M){const w=M.std('#f2f4f4',0.3);const s=M.add(g,new THREE.ConeGeometry(40,321,3,1),w,0,160,0);s.scale.set(1,1,0.35);M.add(g,new THREE.CylinderGeometry(70,75,4,16),M.std('#d9cfb8',0.8),0,2,0);return [45,321];},
  castle(g,M){const st=M.std('#b9b3a3',0.85);M.add(g,new THREE.CylinderGeometry(15,30,18,16),M.std('#6d8a4a',0.9),0,9,0);M.add(g,new THREE.CylinderGeometry(18,19,22,16),st,0,29,0);
    for(const [x,z,w,d] of [[-140,0,60,120],[120,0,120,90],[0,-70,300,14],[0,70,300,14]])M.add(g,new THREE.BoxGeometry(w,15,d),st,x,7.5,z);return [190,40];},
  shard(g,M){const gl=M.std('#a9bccb',0.12,0.85);const s=M.add(g,new THREE.ConeGeometry(36,310,4,1),gl,0,155,0);s.rotation.y=Math.PI/4;return [30,310];},
  empire(g,M){const st=M.std('#b8b0a0',0.7);M.add(g,new THREE.BoxGeometry(130,25,60),st,0,12.5,0);M.add(g,new THREE.BoxGeometry(60,300,45),st,0,170,0);
    M.add(g,new THREE.BoxGeometry(40,40,32),st,0,340,0);M.add(g,new THREE.CylinderGeometry(6,9,22,8),st,0,371,0);M.add(g,new THREE.CylinderGeometry(0.6,2,61,6),st,0,412,0);return [65,443];},
  owtc(g,M){const gl=M.std('#9fb5c6',0.12,0.85);const t=M.add(g,new THREE.CylinderGeometry(19,43,417,4,1),gl,0,208.5,0);t.rotation.y=Math.PI/4;M.add(g,new THREE.CylinderGeometry(0.8,2.5,124,6),gl,0,479,0);return [45,541];},
  liberty(g,M){const st=M.std('#c8bfae',0.8),cu=M.std('#6fa595',0.6);M.add(g,new THREE.BoxGeometry(60,10,60),st,0,5,0);M.add(g,new THREE.CylinderGeometry(9,13,37,8),st,0,28,0);
    M.add(g,new THREE.CylinderGeometry(4,7,34,10),cu,0,63,0);M.add(g,new THREE.SphereGeometry(3.5,10,8),cu,0,82,0);M.add(g,new THREE.CylinderGeometry(0.9,0.9,13,6),cu,3,88,0);return [40,93];},
  hagia(g,M){const w=M.std('#c98f6d',0.8),d=M.std('#8c9aa0',0.5);M.add(g,new THREE.BoxGeometry(100,30,80),w,0,15,0);M.add(g,new THREE.SphereGeometry(16,20,12,0,Math.PI*2,0,Math.PI/2),d,0,40,0);
    for(const [x,z] of [[55,45],[55,-45],[-55,45],[-55,-45]])M.minaret(g,x,z,60,2.6,M.std('#e9e2d4',0.6),d);return [70,60];},
  mosque6(g,M){const w=M.std('#d9d6cf',0.6),d=M.std('#8f9ea6',0.5);M.add(g,new THREE.BoxGeometry(72,22,72),w,0,11,0);M.add(g,new THREE.SphereGeometry(16,20,12,0,Math.PI*2,0,Math.PI/2),d,0,30,0);
    for(const [x,z] of [[40,40],[40,-40],[-40,40],[-40,-40],[110,40],[110,-40]])M.minaret(g,x,z,64,2.2,w,d);return [120,64];},
  fountain(g,M){const jet=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0.55,depthWrite:false});M.add(g,new THREE.CylinderGeometry(2,7,260,10,1,true),jet,0,130,0);
    const top=M.add(g,new THREE.SphereGeometry(18,12,8),jet,0,255,0);top.scale.set(1,0.6,1);return [10,0];}};
function buildLandmarks(){
  const M={std:(c,r,m)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m||0}),
    add(g,geo,mat,x,y,z){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;},
    minaret(g,x,z,h,r,mat,cap){this.add(g,new THREE.CylinderGeometry(r*0.75,r,h,10),mat,x,h/2,z);this.add(g,new THREE.CylinderGeometry(r,r,4,10),cap,x,h+2,z);this.add(g,new THREE.ConeGeometry(r*0.8,8,10),cap,x,h+8,z);}};
  for(const l of REGION.landmarks||[]){const b=LANDMARK_BUILD[l.type];if(!b)continue;const p=geo(l.lat,l.lon),g=new THREE.Group();g.position.set(p.x,0,p.z);scene.add(g);const [r,h]=b(g,M);if(h)addObstacle(p.x-r,p.x+r,p.z-r,p.z+r,h);}}
function buildTrees(){
  if(REGION.ground==='desert')return;const r=rng(9);const items=[];const n=REGION.ground==='arid'?2500:9000;
  for(let i=0;i<n;i++){const x=(r()-0.5)*44000,z=(r()-0.5)*44000;if(cityDensity(x,z)>0.35)continue;if(OSM_BOX&&x>OSM_BOX.x0-100&&x<OSM_BOX.x1+100&&z>OSM_BOX.z0-100&&z<OSM_BOX.z1+100)continue;
    if(inWater(x,z)||approachLimit(x,z)<40||inBoundary(x,z))continue;items.push([x,z,0.7+r()*0.8]);}
  const g=new THREE.IcosahedronGeometry(5,0);g.translate(0,7,0);const im=new THREE.InstancedMesh(g,new THREE.MeshLambertMaterial({color:REGION.ground==='arid'?'#6b6a3c':'#4a5e30'}),Math.max(1,items.length));im.count=items.length;
  const t=new THREE.Object3D();items.forEach((it,i)=>{t.position.set(it[0],terrainH(it[0],it[1]),it[1]);t.scale.set(it[2],it[2]*(0.8+r()*0.6),it[2]);t.rotation.y=r()*6;t.updateMatrix();im.setMatrixAt(i,t.matrix);});scene.add(im);
}
function buildClouds(){
  const ct=tex(256,256,(c)=>{const r=rng(5);for(let i=0;i<26;i++){const x=60+r()*136,y=90+r()*70,rad=30+r()*50;const g=c.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,256,256);}});
  const r=rng(77);for(let i=0;i<70;i++){const m=new THREE.SpriteMaterial({map:ct,transparent:true,depthWrite:false,fog:true,opacity:0.85});const s=new THREE.Sprite(m);const sc=500+r()*900;s.scale.set(sc,sc*0.55,1);
    s.position.set((r()-0.5)*50000,1400+r()*1400,(r()-0.5)*50000);scene.add(s);W3.clouds.push(s);}
}
const SKIES={
  day:{top:'#5d8ec2',hz:'#d3d8d0',fog:'#cdd2c9',near:2500,far:19000,sun:'#fff2dc',si:1.05,sd:[0.5,0.85,0.35],hs:'#c3d6ea',hg:'#7f7652',hi:0.62,night:false,cl:1},
  evening:{top:'#34426e',hz:'#e8a677',fog:'#c79a7e',near:2000,far:15000,sun:'#ffbe82',si:0.85,sd:[-0.85,0.25,0.2],hs:'#8f8fb0',hg:'#5a4a3a',hi:0.45,night:false,cl:0.8},
  night:{top:'#050912',hz:'#1b2335',fog:'#151b2a',near:1200,far:13000,sun:'#7d8db5',si:0.16,sd:[0.3,0.8,-0.4],hs:'#2c3a5c',hg:'#141820',hi:0.28,night:true,cl:0.25}
};
function applySky(name){
  const S=SKIES[name];W3.skyName=name;skyMat.uniforms.top.value.set(S.top);skyMat.uniforms.hz.value.set(name==='day'&&REGION.haze?REGION.haze:S.hz);
  const fog=name==='day'&&REGION.haze?REGION.haze:S.fog;const vis=(REGION.vis||19)*1000/19000;scene.fog.color.set(fog);scene.fog.near=S.near*vis;scene.fog.far=Math.min(44000,S.far*vis);renderer.setClearColor(fog);
  sun.color.set(S.sun);sun.intensity=S.si;W3.sunDir=new THREE.Vector3(...S.sd).normalize();hemi.color.set(S.hs);hemi.groundColor.set(S.hg);hemi.intensity=S.hi;
  for(const c of W3.clouds)c.material.opacity=0.85*S.cl;
  for(const p of W3.pts){p.pts.visible=!p.night||S.night||name==='evening';p.pts.material.size=p.size*(S.night?1.25:name==='evening'?1:0.75);}
  if(W3.cityLights)W3.cityLights.visible=S.night||name==='evening';
}
