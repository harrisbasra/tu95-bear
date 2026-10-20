
/* ---------- renderer & world ---------- */
const glCanvas=$('#gl');
let renderer,scene,camera,sun,hemi,skyMat,maxAniso=4;
const W3={pts:[],papi:[],rabbit:[],cityLights:null,glowTex:null,rings:[],parked:[],clouds:[],grid:new Map(),dayOnly:[],nightOnly:[]};
const GRID=60;
function gridKey(x,z){return Math.floor(x/GRID)+','+Math.floor(z/GRID);}
function addObstacle(x0,x1,z0,z1,h){for(let x=Math.floor(x0/GRID);x<=Math.floor(x1/GRID);x++)for(let z=Math.floor(z0/GRID);z<=Math.floor(z1/GRID);z++){const k=x+','+z;if((W3.grid.get(k)||0)<h)W3.grid.set(k,h);}}
function obstacleH(x,z){return W3.grid.get(gridKey(x,z))||0;}
function tex(w,h,draw,rep){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new THREE.CanvasTexture(cv);t.anisotropy=maxAniso;t.encoding=THREE.sRGBEncoding;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;}return t;}
function glowTex(){return tex(64,64,(c)=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.25,'rgba(255,255,255,.7)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,64,64);});}
function lightPoints(arr,size,night){
  const g=new THREE.BufferGeometry();const pos=[],col=[];for(const p of arr){pos.push(p[0],p[1],p[2]);const c=new THREE.Color(p[3]);col.push(c.r,c.g,c.b);}
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  const m=new THREE.PointsMaterial({size,sizeAttenuation:false,map:W3.glowTex,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false});
  const pts=new THREE.Points(g,m);pts.frustumCulled=false;scene.add(pts);W3.pts.push({pts,size,night});return pts;}

const CITY_C=[[31.583,74.315,1.0,3.2],[31.515,74.345,0.95,2.8],[31.47,74.28,0.85,3.5],[31.475,74.41,0.75,2.6],[31.512,74.372,0.55,1.6],[31.48,74.325,0.85,2.6],[31.625,74.282,0.55,2.4],[31.448,74.31,0.75,3.0],[31.54,74.31,0.9,2.8],[31.565,74.36,0.7,2.4],[31.42,74.25,0.55,3.5]].map(c=>{const p=geo(c[0],c[1]);return{x:p.x,z:p.z,w:c[2],s2:2*(c[3]*1000)**2};});
function cityDensity(x,z){let d=0;for(const c of CITY_C){const v=c.w*Math.exp(-((x-c.x)**2+(z-c.z)**2)/c.s2);if(v>d)d=v;}
  d*=0.75+0.5*vnoise2(x/1400,z/1400);
  if(Math.abs(x+120)<1500&&Math.abs(z)<2900)return 0;
  return clamp(d,0,1);}
const RAVI=[[31.72,74.45],[31.67,74.37],[31.635,74.315],[31.613,74.285],[31.585,74.255],[31.54,74.22],[31.48,74.19],[31.41,74.12]].map(p=>geo(p[0],p[1]));

function buildWorld(){
  W3.glowTex=glowTex();
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(60,1,0.5,60000);
  hemi=new THREE.HemisphereLight('#bcd2e8','#7a7350',0.6);scene.add(hemi);
  sun=new THREE.DirectionalLight('#fff3df',1.0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  const sc=sun.shadow.camera;sc.left=-90;sc.right=90;sc.top=90;sc.bottom=-90;sc.near=10;sc.far=1400;sun.shadow.bias=-0.0006;scene.add(sun);scene.add(sun.target);
  scene.fog=new THREE.Fog('#c9cfc8',3000,20000);
  // sky dome
  skyMat=new THREE.ShaderMaterial({uniforms:{top:{value:new THREE.Color('#5f8fbf')},hz:{value:new THREE.Color('#cfd6d2')}},side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform vec3 top;uniform vec3 hz;varying vec3 vP;void main(){float h=clamp(vP.y,0.0,1.0);gl_FragColor=vec4(mix(hz,top,pow(h,0.55)),1.0);}'});
  const sky=new THREE.Mesh(new THREE.SphereGeometry(45000,32,16),skyMat);sky.frustumCulled=false;sky.renderOrder=-1;scene.add(sky);W3.sky=sky;
  // ground
  const fields=tex(1024,1024,(c,w,h)=>{const r=rng(11);const pal=['#7f8d4a','#8f9a52','#a69e5f','#6c7c3c','#b3a56b','#617539','#8a904e','#9d905a','#748a44'];
    c.fillStyle='#7a8648';c.fillRect(0,0,w,h);const cell=64;
    for(let y=0;y<h;y+=cell)for(let x=0;x<w;x+=cell){const n=1+Math.floor(r()*3),vert=r()<0.5;
      for(let k=0;k<n;k++){c.fillStyle=pal[Math.floor(r()*pal.length)];const a=k*cell/n;if(vert)c.fillRect(x+a,y,cell/n,cell);else c.fillRect(x,y+a,cell,cell/n);
        c.globalAlpha=0.07;c.fillStyle='#2b2a18';for(let f=0;f<8;f++){if(vert)c.fillRect(x+a+f*(cell/n)/8,y,1,cell);else c.fillRect(x,y+a+f*(cell/n)/8,cell,1);}c.globalAlpha=1;}
      c.strokeStyle='rgba(70,62,38,.4)';c.lineWidth=1.5;c.strokeRect(x+0.75,y+0.75,cell-1.5,cell-1.5);}
    for(let i=0;i<260;i++){c.fillStyle=`rgba(${40+r()*20},${58+r()*20},${28},.65)`;const x=r()*w,y=r()*h;c.beginPath();c.arc(x,y,1.5+r()*3.5,0,7);c.fill();}
    c.strokeStyle='rgba(176,158,118,.75)';c.lineWidth=2.2;for(let i=0;i<5;i++){c.beginPath();const y=r()*h;c.moveTo(0,y);for(let x=0;x<=w;x+=64)c.lineTo(x,y+Math.sin(x*0.01+i)*20);c.stroke();}
    for(let i=0;i<14;i++){const x=r()*w,y=r()*h;c.fillStyle='rgba(150,130,100,.8)';for(let k=0;k<16;k++)c.fillRect(x+(r()-0.5)*26,y+(r()-0.5)*26,3+r()*4,3+r()*4);}
  },true);
  fields.repeat.set(44,44);
  const GS=70000,seg=180;const gg=new THREE.PlaneGeometry(GS,GS,seg,seg);gg.rotateX(-Math.PI/2);
  const gcol=[];const gp=gg.attributes.position;
  for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getZ(i);const d=cityDensity(x,z);let r=1,g=1,b=1;
    const air=(Math.abs(x+120)<1400&&Math.abs(z)<2800)?1:0;
    r=lerp(1,1.32,d);g=lerp(1,1.14,d);b=lerp(1,1.7,d);if(air){r=0.95;g=1.02;b=0.85;}
    const n=0.92+0.16*vnoise2(x/3000,z/3000);gcol.push(r*n,g*n,b*n);}
  gg.setAttribute('color',new THREE.Float32BufferAttribute(gcol,3));
  const ground=new THREE.Mesh(gg,new THREE.MeshLambertMaterial({map:fields,vertexColors:true}));ground.receiveShadow=true;scene.add(ground);W3.ground=ground;
  buildRiver();buildAirport();buildCity();buildLandmarks();buildTrees();buildClouds();
}
function ribbon(points,width,y,mat){const pos=[],idx=[];for(let i=0;i<points.length;i++){const p=points[i],q=points[Math.min(i+1,points.length-1)],o=points[Math.max(i-1,0)];
    let dx=q.x-o.x,dz=q.z-o.z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;pos.push(p.x-dz*width/2,y,p.z+dx*width/2,p.x+dz*width/2,y,p.z-dx*width/2);if(i<points.length-1){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.receiveShadow=true;scene.add(m);return m;}
function smoothLine(pts,n){const out=[];for(let i=0;i<pts.length-1;i++){const p0=pts[Math.max(i-1,0)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(i+2,pts.length-1)];
  for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t;const f=(a,b,c,d)=>0.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);out.push({x:f(p0.x,p1.x,p2.x,p3.x),z:f(p0.z,p1.z,p2.z,p3.z)});}}out.push(pts[pts.length-1]);return out;}
function buildRiver(){
  const line=smoothLine(RAVI,12).map((p,i)=>({x:p.x+Math.sin(i*0.7)*120,z:p.z}));
  ribbon(line,700,0.15,new THREE.MeshLambertMaterial({color:'#b9aa86'}));
  ribbon(line,240,0.3,new THREE.MeshStandardMaterial({color:'#56747a',roughness:0.25,metalness:0.1}));
}
/* ---- airport ---- */
const PAINT='rgba(244,244,236,.92)';
function runwayEndTex(rw,end){
  const ppm=3.6,L=1000,Wd=rw.w;const w=Math.round(Wd*ppm),h=Math.round(L*ppm);
  return tex(w,h,(c)=>{const m=v=>v*ppm;const cx=w/2;
    c.fillStyle=PAINT;c.fillRect(0,0,m(0.9),h);c.fillRect(w-m(0.9),0,m(0.9),h);c.fillRect(0,0,w,m(2.4));
    const sw=1.8;for(let i=0;i<6;i++){const off=m(3+i*sw*2);c.fillRect(cx-m(2)-off-m(sw),m(6),m(sw),m(30));c.fillRect(cx+m(2)+off,m(6),m(sw),m(30));}
    // designator, rotated 180° so it reads correctly from the approach
    const num=end.name.slice(0,2),let_=end.name.slice(2);
    c.save();c.translate(cx,m(80));c.rotate(Math.PI);c.fillStyle=PAINT;c.textAlign='center';c.textBaseline='middle';
    c.font=`700 ${Math.round(m(17))}px "Arial Narrow",Arial,sans-serif`;c.fillText(num,0,m(-9));if(let_)c.fillText(let_,0,m(12));c.restore();
    for(let y=110;y<L;y+=50)c.fillRect(cx-m(0.45),m(y),m(0.9),m(30));
    const tdz=[[150,3],[300,3],[450,2],[600,2],[750,1],[900,1]];
    for(const [d,n] of tdz){if(d===300)continue;for(let k=0;k<n;k++){const o=m(4+k*3);c.fillRect(cx-o-m(1.8),m(d),m(1.8),m(22.5));c.fillRect(cx+o,m(d),m(1.8),m(22.5));}}
    c.fillRect(cx-m(15),m(300),m(9),m(45));c.fillRect(cx+m(6),m(300),m(9),m(45));
    const r=rng(end.name.charCodeAt(0)*7+end.name.charCodeAt(2||1));c.fillStyle='rgba(20,20,20,.22)';
    for(let i=0;i<70;i++){const y=m(260+r()*560),x=cx+(r()-0.5)*m(12);c.save();c.translate(x,y);c.rotate((r()-0.5)*0.08);c.fillRect(-m(0.5),0,m(1),m(18+r()*50));c.restore();}
  });}
function surfaceTex(color,dark){return tex(256,256,(c,w,h)=>{c.fillStyle=color;c.fillRect(0,0,w,h);const r=rng(dark?3:5);for(let i=0;i<2500;i++){const v=r();c.fillStyle=`rgba(${v<0.5?0:255},${v<0.5?0:255},${v<0.5?0:255},${0.02+r()*0.04})`;c.fillRect(r()*w,r()*h,1+r()*2,1+r()*2);}
  if(!dark){c.strokeStyle='rgba(0,0,0,.1)';c.lineWidth=1;for(let i=0;i<=w;i+=w/4){c.beginPath();c.moveTo(i,0);c.lineTo(i,h);c.stroke();c.beginPath();c.moveTo(0,i);c.lineTo(w,i);c.stroke();}}},true);}
function flat(w,l,mat,x,z,ang,y){const g=new THREE.PlaneGeometry(w,l);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);m.rotation.y=ang;m.receiveShadow=true;scene.add(m);return m;}
function box(w,h,d,mat,x,y,z,ry){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y+h/2,z);if(ry)m.rotation.y=ry;m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
function buildAirport(){
  const grassT=tex(128,128,(c,w,h)=>{c.fillStyle='#6d7c40';c.fillRect(0,0,w,h);const r=rng(4);for(let i=0;i<600;i++){c.fillStyle=`rgba(${r()<0.5?40:150},${r()<0.5?60:160},30,.12)`;c.fillRect(r()*w,r()*h,2,2);}for(let x=0;x<w;x+=16){c.fillStyle='rgba(255,255,255,.04)';c.fillRect(x,0,8,h);}},true);grassT.repeat.set(26,58);
  const grass=new THREE.MeshLambertMaterial({map:grassT});flat(2600,5800,grass,-130,0,0,0.05);
  const pts=[];const concrete=surfaceTex('#9d9a90',false),asphalt=surfaceTex('#4b4d4f',true);
  for(const rw of RWYS){
    const cx=(rw.A.x+rw.B.x)/2,cz=(rw.A.z+rw.B.z)/2,ang=Math.atan2(rw.dx,rw.dz);
    const t=rw.surf==='concrete'?concrete.clone():asphalt.clone();t.needsUpdate=true;t.repeat.set(rw.w/24,rw.len/24);
    const base=flat(rw.w,rw.len+60,new THREE.MeshLambertMaterial({map:t}),cx,cz,ang,0.12);
    flat(rw.w+30,rw.len+120,new THREE.MeshLambertMaterial({color:rw.surf==='concrete'?'#9c9a8e':'#5c5e5c'}),cx,cz,ang,0.09);
    for(const e of rw.ends){
      const dm=new THREE.MeshLambertMaterial({map:runwayEndTex(rw,e),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
      const d=flat(rw.w,1000,dm,e.T.x+e.dx*500,e.T.z+e.dz*500,Math.atan2(e.dx,e.dz),0.18);
    }
    const mid=tex(32,64,(c,w,h)=>{c.fillStyle=PAINT;c.fillRect(w/2-1,0,2,h*0.6);c.fillRect(0,0,1,h);c.fillRect(w-1,0,1,h);});
    const ml=rw.len-2000;if(ml>0){mid.repeat.set(1,ml/50);flat(rw.w,ml,new THREE.MeshLambertMaterial({map:mid,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),cx,cz,ang,0.18);}
    // edge lights, threshold/end lights
    const px=-rw.dz,pz=rw.dx;
    for(let a=0;a<=rw.len;a+=60)for(const s of [-1,1]){pts.push([rw.A.x+rw.dx*a+px*s*(rw.w/2+1.5),0.6,rw.A.z+rw.dz*a+pz*s*(rw.w/2+1.5),a>rw.len-600||a<600?'#ffd890':'#fff4dc']);}
    for(const e of rw.ends){const ex=-e.dz,ez=e.dx;for(let k=-rw.w/2;k<=rw.w/2;k+=3){pts.push([e.T.x+ex*k-e.dx*2,0.5,e.T.z+ez*k-e.dz*2,'#4dff7a']);pts.push([e.T.x+ex*k+e.dx*1,0.5,e.T.z+ez*k+e.dz*1,'#ff4030']);}
      // approach lights
      const alsL=e.ils?900:420;for(let a=60;a<=alsL;a+=30){const x=e.T.x-e.dx*a,z=e.T.z-e.dz*a;for(const o of [-1.5,0,1.5])pts.push([x+ex*o,2.5,z+ez*o,'#fff8e8']);
        if(a===300||(e.ils&&a===600))for(let o=-15;o<=15;o+=2)pts.push([x+ex*o,2.5,z+ez*o,'#fff8e8']);
        const pole=box(0.2,2.4,0.2,new THREE.MeshLambertMaterial({color:'#6e6e66'}),x,0,z);pole.castShadow=false;}
      if(e.ils){const r=[];for(let a=60;a<=alsL;a+=30)r.push([e.T.x-e.dx*a,2.8,e.T.z-e.dz*a,'#ffffff']);W3.rabbit.push(lightPoints(r,9,true));}
      // PAPI on the pilot's left
      const left=-1;const pp=[];for(let i=0;i<4;i++){const off=rw.w/2+15+i*9;pp.push([e.T.x+e.dx*300+ex*left*off,1.0,e.T.z+e.dz*300+ez*left*off,'#ff3020']);}
      for(const p of pp)box(1.6,0.9,1.0,new THREE.MeshLambertMaterial({color:'#3a3b36'}),p[0],0,p[2]);
      W3.papi.push({end:e,pts:lightPoints(pp,7,false)});
      // windsock
      const wsx=e.T.x+e.dx*150+ex*-(rw.w/2+60),wsz=e.T.z+e.dz*150+ez*-(rw.w/2+60);box(0.25,8,0.25,new THREE.MeshLambertMaterial({color:'#d9d9d2'}),wsx,0,wsz);
      const sock=new THREE.Mesh(new THREE.ConeGeometry(0.6,3.2,10,1,true),new THREE.MeshLambertMaterial({color:'#ee7a2c',side:THREE.DoubleSide}));sock.rotation.z=Math.PI/2;sock.position.set(wsx+1.6,7.6,wsz);scene.add(sock);
    }
  }
  lightPoints(pts,4.5,false);
  // taxiways, apron and buildings (positions approximate)
  const tw=new THREE.MeshLambertMaterial({map:(()=>{const t=asphalt.clone();t.needsUpdate=true;t.repeat.set(1,60);return t;})()});
  const rwW=RWYS[1],txX=rwW.A.x-190;
  const yl=tex(16,64,(c,w,h)=>{c.fillStyle='rgba(240,190,40,.9)';c.fillRect(w/2-1,0,2,h);});yl.repeat.set(1,60);
  const ylm=new THREE.MeshLambertMaterial({map:yl,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  flat(23,2900,tw,txX,0,0,0.11);flat(23,2900,ylm,txX,0,0,0.16);PAVE.push({x0:txX-14,x1:txX+14,z0:-1450,z1:1450});
  const tl=[];
  for(const z of [-1380,-700,0,650,1350]){const x0=txX,x1=RWYS[0].A.x;flat(x1-x0,23,tw,(x0+x1)/2,z,0,0.105);PAVE.push({x0:x0-5,x1:x1+5,z0:z-14,z1:z+14});for(let x=x0;x<=x1;x+=30)tl.push([x,0.4,z+12,'#3060ff'],[x,0.4,z-12,'#3060ff']);}
  for(let z=-1450;z<=1450;z+=40)tl.push([txX-12.5,0.4,z,'#3060ff'],[txX+12.5,0.4,z,'#3060ff']);
  lightPoints(tl,3.5,true);
  const apronM=new THREE.MeshLambertMaterial({map:(()=>{const t=concrete.clone();t.needsUpdate=true;t.repeat.set(16,50);return t;})()});
  const ax0=-740,ax1=txX-12;flat(ax1-ax0,1300,apronM,(ax0+ax1)/2,-150,0,0.1);PAVE.push({x0:ax0,x1:ax1,z0:-800,z1:500});
  flat(ax1-ax0,520,apronM,(ax0+ax1)/2,-1250,0,0.1);PAVE.push({x0:ax0,x1:ax1,z0:-1510,z1:-990});
  flat(ax1-ax0,420,apronM,(ax0+ax1)/2,900,0,0.1);PAVE.push({x0:ax0,x1:ax1,z0:690,z1:1110});
  // terminal
  const glass=new THREE.MeshStandardMaterial({color:'#5d7686',metalness:0.6,roughness:0.25});
  const white=new THREE.MeshLambertMaterial({color:'#e6e2d8'}),grey=new THREE.MeshLambertMaterial({color:'#9a9890'}),roofM=new THREE.MeshStandardMaterial({color:'#c7cbcf',metalness:0.5,roughness:0.4});
  box(90,14,820,glass,-800,0,-170);box(96,3,826,roofM,-800,14,-170);
  for(let z=-520;z<=160;z+=135){box(14,10,14,white,-820,14,z);const dome=new THREE.Mesh(new THREE.SphereGeometry(8,16,8,0,Math.PI*2,0,Math.PI/2),white);dome.position.set(-820,24,z);dome.castShadow=true;scene.add(dome);}
  addObstacle(-850,-750,-590,250,34);
  for(let i=0;i<7;i++){const z=-520+i*105;box(46,4,4,grey,-732,5,z);box(5,7,5,grey,-712,0,z);}
  box(60,10,180,white,-780,0,-1250);addObstacle(-810,-750,-1340,-1160,12);
  box(80,16,200,grey,-790,0,900);addObstacle(-830,-750,800,1000,16);
  box(26,30,26,white,-590,0,620);const cab=box(20,7,20,glass,-590,30,620);box(23,2,23,roofM,-590,37,620);addObstacle(-610,-570,600,640,40);
  const hangarM=new THREE.MeshLambertMaterial({color:'#b9bcb5'});for(let i=0;i<3;i++){const hz=1500+i*120;box(90,22,95,hangarM,-640,0,hz);addObstacle(-690,-590,hz-50,hz+50,24);}
  W3.towerTop=new THREE.Vector3(-590,38,620);
  // parked airliners (generic, no livery)
  const al={id:'airliner',gearH:4.0,mainX:-1,noseX:15,tailPts:[[-18,1]],prop:false,
    model:{color:'#f2f2ef',accent:'#bfc4c8',insignia:'none',fus:[[22,0,0,0.05],[21,1.0,-1.0,1.1],[18,2.0,-1.9,2.0],[14,2.2,-2.0,2.05],[-10,2.2,-2.0,2.05],[-16,1.9,-0.4,1.4],[-20,1.6,0.8,0.5],[-20.6,1.4,1.2,0.1]],glass:[[20,18.5,'cockpit']],
      wing:{x:4,y:-1.2,z:2,chord:7.5,span:19,sweep:28,tip:2,dihedral:5,t:0.7},fin:{x:-12.5,y:1.9,chord:7,h:8.5,sweep:38,tip:2.4},stab:{x:-15.5,y:0.8,chord:4.4,span:7,sweep:32,tip:1.6,dihedral:5},
      engines:[{type:'jet',s:0.33,len:5.5,r:1.2,dy:-1.8,fwd:3.2}],gear:{mains:[{x:-1,z:3.2,w:2}],noseX:15}}};
  for(let i=0;i<5;i++){const A=buildAircraft(al);const st={spec:al,rpm:0,engineMax:1,v:0,flapPos:0,sweep:0,gearPos:1,ab:0};setAircraftState(A,st,0);
    A.g.position.set(-690,4.0,-470+i*105);A.g.rotation.y=Math.PI;scene.add(A.g);addObstacle(-720,-650,-490+i*105,-450+i*105,14);}
}
function buildCity(){
  const r=rng(42);const tmp=new THREE.Object3D();const col=new THREE.Color();
  const pal=['#c9bba0','#b8a88a','#d6cdb8','#a89c86','#c4b296','#9e8e7a','#d9d2c3','#b08a6c','#c7c2b5','#a3876b'];
  const items=[];const lightsP=[];
  for(let x=-24000;x<=7000;x+=58)for(let z=-15000;z<=16000;z+=58){
    const d=cityDensity(x,z);if(d<0.06)continue;if(r()>d*0.42)continue;
    const bx=x+(r()-0.5)*30,bz=z+(r()-0.5)*30;
    const inCorr=Math.abs(bx+20)<700&&Math.abs(bz)<11000;
    let h=5+Math.pow(r(),3)*(d>0.85?55:22);if(r()<0.004*d)h+=40+r()*50;if(inCorr)h=Math.min(h,14);
    const w=12+r()*22*(0.6+d),dd=12+r()*22*(0.6+d);items.push([bx,bz,w,h,dd]);if(items.length>=22000)break;}
  const geom=new THREE.BoxGeometry(1,1,1);geom.translate(0,0.5,0);
  const im=new THREE.InstancedMesh(geom,new THREE.MeshLambertMaterial(),items.length);im.receiveShadow=true;
  items.forEach((b,i)=>{tmp.position.set(b[0],0,b[1]);tmp.scale.set(b[2],b[3],b[4]);tmp.rotation.y=(r()<0.7?0:r()*0.6);tmp.updateMatrix();im.setMatrixAt(i,tmp.matrix);
    col.set(pal[Math.floor(r()*pal.length)]);col.multiplyScalar(0.85+r()*0.25);im.setColorAt(i,col);
    addObstacle(b[0]-b[2]/2,b[0]+b[2]/2,b[1]-b[4]/2,b[1]+b[4]/2,b[3]);
    if(r()<0.45)lightsP.push([b[0]+(r()-0.5)*b[2],b[3]+0.5,b[1]+(r()-0.5)*b[4],r()<0.75?'#ffc985':r()<0.5?'#fff0d0':'#a8d8ff']);});
  im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;scene.add(im);
  W3.cityLights=lightPoints(lightsP,2.6,true);
  // main roads with street lights
  const roads=[[[ -860,-170],[-2500,-400],[-6000,-1500],[-9000,-6500]],[[-860,-170],[-1500,4000],[-3000,9000]],[[-9000,-6500],[-12000,2000],[-9000,9000]],[[-860,-170],[2000,-900],[7000,-2500]]];
  const rm=new THREE.MeshLambertMaterial({color:'#55575a'});const sl=[];
  for(const rd of roads){const pts=smoothLine(rd.map(p=>({x:p[0],z:p[1]})),10);ribbon(pts,22,0.2,rm);for(let i=0;i<pts.length;i+=2)sl.push([pts[i].x,8,pts[i].z,'#ffb35c']);}
  lightPoints(sl,3,true);
}
function buildLandmarks(){
  const cream=new THREE.MeshStandardMaterial({color:'#e9e4d6',roughness:0.6}),sand=new THREE.MeshStandardMaterial({color:'#a2533a',roughness:0.8}),marble=new THREE.MeshStandardMaterial({color:'#f2efe8',roughness:0.4});
  const M=LANDMARKS.minar;const mg=new THREE.Group();mg.position.set(M.x,0,M.z);scene.add(mg);
  const add=(geo,mat,y)=>{const m=new THREE.Mesh(geo,mat);m.position.y=y;m.castShadow=true;m.receiveShadow=true;mg.add(m);return m;};
  add(new THREE.CylinderGeometry(26,28,2,10),cream,1);add(new THREE.CylinderGeometry(17,19,6,10),cream,5);
  add(new THREE.CylinderGeometry(3.4,7.2,50,16),cream,33);add(new THREE.CylinderGeometry(5.2,5.2,1.2,16),cream,30);add(new THREE.CylinderGeometry(4.4,4.4,1.2,16),cream,46);
  add(new THREE.CylinderGeometry(3.2,3.4,4,16),cream,60);add(new THREE.SphereGeometry(3.2,16,10,0,Math.PI*2,0,Math.PI/2),marble,62);add(new THREE.ConeGeometry(0.4,3,8),marble,66.5);
  addObstacle(M.x-20,M.x+20,M.z-20,M.z+20,68);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+0.4;const fl=add(new THREE.ConeGeometry(14,0.3,3),new THREE.MeshLambertMaterial({color:'#6e8b4a'}),0.3);fl.position.set(Math.cos(a)*60,0.3,Math.sin(a)*60);}
  const B=LANDMARKS.badshahi;const bg=new THREE.Group();bg.position.set(B.x,0,B.z);scene.add(bg);
  const bb=(w,h,d,mat,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y+h/2,z);m.castShadow=true;m.receiveShadow=true;bg.add(m);};
  const S2=165;bb(S2,9,8,sand,0,0,-S2/2);bb(S2,9,8,sand,0,0,S2/2);bb(8,9,S2,sand,S2/2,0,0);bb(8,9,S2,sand,-S2/2,0,0);
  bb(82,22,26,sand,-S2/2+18,0,0);bb(18,26,30,sand,S2/2,0,0);
  for(const [z,r] of [[0,10],[-24,7.5],[24,7.5]]){const d=new THREE.Mesh(new THREE.SphereGeometry(r,18,12,0,Math.PI*2,0,Math.PI*0.62),marble);d.position.set(-S2/2+18,22+r*0.35,z);d.castShadow=true;bg.add(d);}
  for(const [x,z] of [[S2/2,S2/2],[S2/2,-S2/2],[-S2/2,S2/2],[-S2/2,-S2/2]]){const mn=new THREE.Mesh(new THREE.CylinderGeometry(2.4,3.2,54,10),sand);mn.position.set(x,27,z);mn.castShadow=true;bg.add(mn);
    const kc=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.2,4,10),marble);kc.position.set(x,56,z);bg.add(kc);const dm=new THREE.Mesh(new THREE.SphereGeometry(3.2,12,8,0,Math.PI*2,0,Math.PI/2),marble);dm.position.set(x,58,z);bg.add(dm);}
  addObstacle(B.x-90,B.x+90,B.z-90,B.z+90,62);
  const fort=new THREE.MeshStandardMaterial({color:'#9b5a3c',roughness:0.85});const fg=geo(31.5878,74.3155);box(420,18,300,fort,fg.x,0,fg.z);addObstacle(fg.x-210,fg.x+210,fg.z-150,fg.z+150,18);
}
function buildTrees(){
  const r=rng(9);const items=[];
  for(let i=0;i<9000;i++){const x=(r()-0.5)*44000-4000,z=(r()-0.5)*44000;if(cityDensity(x,z)>0.35)continue;if(Math.abs(x+120)<1600&&Math.abs(z)<3200)continue;if(Math.abs(x+20)<350&&Math.abs(z)<9000)continue;items.push([x,z,0.7+r()*0.8]);}
  const g=new THREE.IcosahedronGeometry(5,0);g.translate(0,7,0);const im=new THREE.InstancedMesh(g,new THREE.MeshLambertMaterial({color:'#4a5e30'}),items.length);
  const t=new THREE.Object3D();items.forEach((it,i)=>{t.position.set(it[0],0,it[1]);t.scale.set(it[2],it[2]*(0.8+r()*0.6),it[2]);t.rotation.y=r()*6;t.updateMatrix();im.setMatrixAt(i,t.matrix);});scene.add(im);
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
  const S=SKIES[name];W3.skyName=name;skyMat.uniforms.top.value.set(S.top);skyMat.uniforms.hz.value.set(S.hz);
  scene.fog.color.set(S.fog);scene.fog.near=S.near;scene.fog.far=S.far;renderer.setClearColor(S.fog);
  sun.color.set(S.sun);sun.intensity=S.si;W3.sunDir=new THREE.Vector3(...S.sd).normalize();hemi.color.set(S.hs);hemi.groundColor.set(S.hg);hemi.intensity=S.hi;
  for(const c of W3.clouds)c.material.opacity=0.85*S.cl;
  for(const p of W3.pts){p.pts.visible=!p.night||S.night||name==='evening';p.pts.material.size=p.size*(S.night?1.25:name==='evening'?1:0.75);}
  if(W3.cityLights)W3.cityLights.visible=S.night||name==='evening';
}
