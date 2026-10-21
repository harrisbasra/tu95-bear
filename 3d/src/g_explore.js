
/* ---------- explore: a free camera over the current city ---------- */
// Fly a camera anywhere in the region to look at the landmarks, the airport and the aircraft. Pick a sight to glide to it
// and orbit; any input takes over again. Keys: W A S D move, Q / E down and up, Shift faster, drag to look, wheel speed.
const EX={on:false,pos:null,yaw:0,pitch:-0.25,speed:80,orbit:null,tween:null,drag:null};
const EX_SIZE={burj:900,owtc:600,empire:480,shard:340,sail:340,liberty:140,faisal:200,mazar:140,minar:110,badshahi:260,fort:420,castle:380,hagia:180,mosque6:200,fountain:300};
function exploreSpots(){const s=[];
  for(const l of REGION.landmarks||[]){const p=geo(l.lat,l.lon),r=EX_SIZE[l.type]||220;s.push({name:l.name,x:p.x,z:p.z,y:r*0.35,r:r*1.4});}
  if(W3.terminal)s.push({name:'Main terminal',x:W3.terminal.x,z:W3.terminal.z,y:20,r:420});
  if(RWYS.length){const rw=RWYS[0];s.push({name:`Runway ${rw.id}`,x:rw.ends[0].T.x+rw.dx*300,z:rw.ends[0].T.z+rw.dz*300,y:10,r:260});}
  if(game&&game.A)s.push({name:`The ${currentSpec().name}`,x:game.plane.pos.x,z:game.plane.pos.z,y:6,r:Math.max(70,currentSpec().len*1.6),plane:true});
  return s;}
function openExplore(){AU.init();EX.on=true;show($('#menu'),false);show($('#explore'),true);$('#touch').classList.add('explore');show($('#touch'),isTouch);
  const sp=exploreSpots()[0]||{x:0,z:0,y:0,r:400};EX.pos=new THREE.Vector3(sp.x-sp.r*1.4,Math.max(120,sp.y+sp.r*0.6),sp.z+sp.r*1.4);EX.yaw=Math.atan2(sp.x-EX.pos.x,-(sp.z-EX.pos.z));EX.pitch=-0.3;
  renderExplore();goToSpot(sp);}
function closeExplore(){EX.on=false;EX.orbit=EX.tween=null;show($('#explore'),false);$('#touch').classList.remove('explore');show($('#touch'),false);IN.stickP=IN.stickR=0;show($('#menu'),true);buildMenu();}
function renderExplore(){const box=$('#ex-spots');box.innerHTML='';
  for(const sp of exploreSpots()){const b=document.createElement('button');b.className='ghost';b.textContent=sp.name;b.addEventListener('click',()=>goToSpot(sp));box.appendChild(b);}
  const sel=$('#ex-region');if(!sel.options.length)for(const a of AIRPORTS){const o=document.createElement('option');o.value=a.icao;o.textContent=`${a.city} (${a.iata})`;sel.appendChild(o);}
  sel.value=REGION.icao;$('#ex-title').textContent=`Explore ${REGION.city}`;}
// glide to a sight, then orbit it slowly
function goToSpot(sp){const from=EX.pos.clone(),ang=Math.atan2(from.x-sp.x,from.z-sp.z);const to=new THREE.Vector3(sp.x+Math.sin(ang)*sp.r,sp.y+sp.r*0.45,sp.z+Math.cos(ang)*sp.r);
  EX.tween={from,to,t:0,dur:clamp(from.distanceTo(to)/1500,1.2,4),look:new THREE.Vector3(sp.x,sp.y,sp.z)};EX.orbit={c:new THREE.Vector3(sp.x,sp.y,sp.z),r:sp.r,a:ang,h:sp.r*0.45};}
function exploreCamera(dt){const K=KEYS,fast=K.ShiftLeft||K.ShiftRight?5:1;
  const mv=(K.KeyW||K.ArrowUp?1:0)-(K.KeyS||K.ArrowDown?1:0)+(IN.stickP||0),st=(K.KeyD||K.ArrowRight?1:0)-(K.KeyA||K.ArrowLeft?1:0)+(IN.stickR||0),up=(K.KeyE||K.Space?1:0)-(K.KeyQ?1:0)+(EX.up||0);
  if(mv||st||up||EX.drag){EX.tween=null;EX.orbit=null;}
  if(EX.tween){const T=EX.tween;T.t+=dt/T.dur;const k=smooth(Math.min(1,T.t));EX.pos.lerpVectors(T.from,T.to,k);const d=V().subVectors(T.look,EX.pos);EX.yaw=Math.atan2(d.x,-d.z);EX.pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));if(T.t>=1)EX.tween=null;}
  else if(EX.orbit){const O=EX.orbit;O.a+=dt*0.08;EX.pos.set(O.c.x+Math.sin(O.a)*O.r,O.c.y+O.h,O.c.z+Math.cos(O.a)*O.r);const d=V().subVectors(O.c,EX.pos);EX.yaw=Math.atan2(d.x,-d.z);EX.pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));}
  else{const s=EX.speed*fast*dt,f=V().set(Math.sin(EX.yaw)*Math.cos(EX.pitch),Math.sin(EX.pitch),-Math.cos(EX.yaw)*Math.cos(EX.pitch)),r=V().set(Math.cos(EX.yaw),0,Math.sin(EX.yaw));
    EX.pos.addScaledVector(f,mv*s).addScaledVector(r,st*s);EX.pos.y+=up*s;}
  // stay above the ground and the buildings
  const floor=Math.max(2,obstacleH(EX.pos.x,EX.pos.z)+3,HILLS.length?terrainH(EX.pos.x,EX.pos.z)+3:0);if(EX.pos.y<floor)EX.pos.y=floor;EX.pos.y=Math.min(EX.pos.y,8000);
  camera.position.copy(EX.pos);camera.rotation.set(0,0,0);camera.quaternion.setFromEuler(new THREE.Euler(EX.pitch,-EX.yaw,0,'YXZ'));camera.fov=60;camera.near=0.5;camera.updateProjectionMatrix();}
function wireExplore(){$('#btn-explore').addEventListener('click',openExplore);$('#ex-back').addEventListener('click',closeExplore);
  $('#ex-region').addEventListener('change',e=>{const ld=$('#loading');ld.textContent=`Loading ${AIRPORT_BY_ICAO[e.target.value].city}…`;show(ld,true);loadRegion(e.target.value).then(()=>{startAttract();show(ld,false);renderExplore();const sp=exploreSpots()[0];if(sp){EX.pos.set(sp.x-sp.r*2,sp.y+sp.r,sp.z+sp.r*2);goToSpot(sp);}});});
  const gl=$('#gl');gl.addEventListener('pointerdown',e=>{if(!EX.on)return;EX.drag={x:e.clientX,y:e.clientY,id:e.pointerId};});
  gl.addEventListener('pointermove',e=>{if(!EX.on||!EX.drag||e.pointerId!==EX.drag.id)return;EX.yaw+=(e.clientX-EX.drag.x)*0.004;EX.pitch=clamp(EX.pitch-(e.clientY-EX.drag.y)*0.004,-1.45,1.2);EX.drag.x=e.clientX;EX.drag.y=e.clientY;});
  const end=()=>{EX.drag=null;};gl.addEventListener('pointerup',end);gl.addEventListener('pointercancel',end);
  gl.addEventListener('wheel',e=>{if(!EX.on)return;e.preventDefault();EX.speed=clamp(EX.speed*(e.deltaY<0?1.2:1/1.2),10,2000);toastMenu(`Camera speed ${Math.round(EX.speed)} m/s`);$('#ex-speed').textContent=`${Math.round(EX.speed)} m/s`;},{passive:false});
  for(const [id,v] of [['#ex-up',1],['#ex-down',-1]]){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();EX.up=v;});const o=()=>{EX.up=0;};b.addEventListener('pointerup',o);b.addEventListener('pointercancel',o);b.addEventListener('pointerleave',o);}
  // the touch stick drives the camera too
  addEventListener('keydown',e=>{if(EX.on&&e.code==='Escape')closeExplore();});}
