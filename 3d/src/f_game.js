
/* ---------- missions ---------- */
const MISSIONS3=[
 {key:'free',name:'Free flight',summary:'Take off from 36R and explore Lahore. Land on any runway and stop to finish.',sky:'day',start:{rw:'36R',at:120}},
 {key:'depart',name:'Departure, runway 36R',summary:'Take off, raise the gear, set cruise flaps and climb to 600 m.',sky:'day',start:{rw:'36R',at:120}},
 {key:'final',name:'Straight-in, runway 36R',summary:'You start 10 km out, lined up with 36R. Fly the glide path, land and stop.',sky:'day',start:{air:'36R',dist:10000},dest:'36R'},
 {key:'circuit',name:'Lahore circuit',summary:'Take off from 36L, fly the left-hand circuit through three rings, then land.',sky:'day',start:{rw:'36L',at:100},
  rings:[{x:-1300,z:-5200,y:320,nx:-1,nz:0},{x:-3400,z:0,y:450,nx:0,nz:1},{x:-1600,z:6200,y:320,nx:1,nz:0}]},
 {key:'oldcity',name:'Old City flypast',summary:'Fly through the rings at Minar-e-Pakistan and Badshahi Mosque, then return and land.',sky:'evening',start:{x:-600,z:-3200,agl:450,hdg:305,kmh:400},oldcity:true},
 {key:'night',name:'Night arrival, runway 18L',summary:'Land on 18L at night with a 6 m/s crosswind from the west.',sky:'night',wind:[6,0],start:{air:'18L',dist:12000},dest:'18L'}
];
let game=null;
function toast(g,text){g.toasts.push({text,t:g.t});if(g.toasts.length>3)g.toasts.shift();}
function clearGame(){if(!game)return;if(game.A)scene.remove(game.A.g);for(const r of game.rings)scene.remove(r.mesh);for(const f of game.fx)scene.remove(f.s);game=null;}
function newGame(mi,mode){
  clearGame();
  const M=MISSIONS3[mi],sp=currentSpec();
  const p=newPlane(sp);const A=buildAircraft(sp);scene.add(A.g);
  const g={mi,M,mode,status:'play',plane:p,A,wind:V(),t:0,time:0,toasts:[],stats:{sink:null,offset:0},flags:{},rings:[],fx:[],
    opts:{assist:progress.assist,landAssist:progress.landAssist},cam:{mode:progress.camMode||'chase',pos:V(),init:false,orbit:0},endT:0,shown:false};
  if(M.wind)g.wind.set(M.wind[0],0,M.wind[1]);
  applySky(mode==='attract'?'day':M.sky);
  const st=M.start;
  if(mode==='attract'){placeOnRunway(p,'36R',60);}
  else if(st.rw)placeOnRunway(p,st.rw,st.at);
  else if(st.air){const e=END(st.air);const agl=st.dist*Math.tan(3*D2R)+sp.gearH;placeInAir(p,e.T.x-e.dx*st.dist,e.T.z-e.dz*st.dist,agl,e.hdg,sp.appKmh+50,0.35);}
  else placeInAir(p,st.x,st.z,st.agl,st.hdg,st.kmh,0.55);
  const ringDefs=M.rings?M.rings.slice():[];
  if(M.oldcity){const mn=LANDMARKS.minar,bd=LANDMARKS.badshahi;let dx=mn.x-st.x,dz=mn.z-st.z;const l=Math.hypot(dx,dz);dx/=l;dz/=l;
    ringDefs.push({x:mn.x-dx*260+dz*160,z:mn.z-dz*260-dx*160,y:150,nx:dx,nz:dz});
    let ex=bd.x-mn.x,ez=bd.z-mn.z;const l2=Math.hypot(ex,ez);ex/=l2;ez/=l2;
    ringDefs.push({x:bd.x+dz*260+400*dx,z:bd.z-dx*260+400*dz,y:170,nx:dx,nz:dz});}
  for(const r of ringDefs){const mesh=new THREE.Mesh(new THREE.TorusGeometry(70,4,10,48),new THREE.MeshBasicMaterial({color:'#ffbe46',transparent:true,opacity:0.9,fog:false}));
    mesh.position.set(r.x,r.y,r.z);mesh.rotation.y=Math.atan2(r.nx,r.nz);scene.add(mesh);g.rings.push(Object.assign({mesh,state:'wait',prev:null},r));}
  if(g.rings.length)g.rings[0].state='next';
  finishStep(p);setAircraftState(A,p,0);syncModel(g);
  return g;}
function finish(g,ok,reason){
  if(g.status!=='play')return;g.status=ok?'success':'fail';g.reason=reason;g.endT=g.t+(ok?1.6:2.8);
  if(ok){const s=g.stats,M=g.M;let st=1;
    if(M.key==='depart')st=g.time<75?3:g.time<110?2:1;
    else{st=s.sink!==null&&s.sink<=1.5&&s.offset<8?3:s.sink!==null&&s.sink<=3?2:1;}
    g.starsWon=st;progress.stars[g.mi]=Math.max(progress.stars[g.mi]||0,st);save();CLOUD.save();AU.blip(660);setTimeout(()=>AU.blip(990),140);}
}
function crash(g,reason){const p=g.plane;if(!p.alive)return;p.alive=false;explode(g,p.pos.clone());g.A.g.visible=false;AU.boom(true);finish(g,false,reason);}
function missionUpdate(g,dt){
  const p=g.plane,M=g.M;if(g.mode!=='play'||g.status!=='play')return;g.time+=dt;
  if(!p.onGround&&p.agl>20)g.flags.flew=true;
  for(let i=0;i<g.rings.length;i++){const r=g.rings[i];if(r.state==='ok'||r.state==='miss')continue;
    const d=(p.pos.x-r.x)*r.nx+(p.pos.z-r.z)*r.nz;
    if(r.prev!==null&&r.prev<0&&d>=0){const ox=p.pos.x-r.x-r.nx*d,oz=p.pos.z-r.z-r.nz*d,oy=p.pos.y-r.y;const rad=Math.hypot(ox,oy,oz);
      if(rad<=78&&r.state==='next'){r.state='ok';r.mesh.material.color.set('#7bd66a');toast(g,`Ring ${i+1} of ${g.rings.length}`);AU.blip(1040);if(g.rings[i+1])g.rings[i+1].state='next';}
      else if(rad<=600){r.state='miss';r.mesh.material.color.set('#e04a35');return finish(g,false,`You missed ring ${i+1}. Fly through the middle of each ring in order.`);}}
    r.prev=d;}
  const stopped=p.onGround&&p.v<1.5&&g.flags.flew;
  switch(M.key){
    case 'depart':if(!p.onGround&&p.agl>=600&&p.gearPos<0.03&&p.flap==='cruise')finish(g,true,'A clean departure from Lahore.');break;
    default:{
      const ringsDone=g.rings.every(r=>r.state==='ok');
      if(stopped&&ringsDone){const rw=onRunway(p.pos.x,p.pos.z,5);finish(g,true,`Down and stopped${rw?' on runway '+rw.id:''}. Touchdown at ${(g.stats.sink||0).toFixed(1)} m/s, ${g.stats.offset.toFixed(0)} m from the centreline.`);}
      if(stopped&&!ringsDone&&!g.flags.ringWarn){g.flags.ringWarn=true;toast(g,'Fly through all the rings before landing');}
    }
  }
}
/* ---------- effects ---------- */
function fxSprite(g,pos,color,size,life,vel,grow,add){const m=new THREE.SpriteMaterial({map:W3.glowTex,color,transparent:true,depthWrite:false,blending:add?THREE.AdditiveBlending:THREE.NormalBlending,opacity:1});
  const s=new THREE.Sprite(m);s.position.copy(pos);s.scale.set(size,size,1);scene.add(s);g.fx.push({s,life,max:life,vel:vel||V(),grow:grow||0,size});}
function explode(g,pos){for(let i=0;i<40;i++){const v=V().set((Math.random()-0.5)*40,Math.random()*30,(Math.random()-0.5)*40);fxSprite(g,pos,i%2?'#ffb24a':'#ff7a2a',14+Math.random()*16,0.8+Math.random()*1.2,v,10,true);}
  for(let i=0;i<40;i++){const v=V().set((Math.random()-0.5)*14,6+Math.random()*12,(Math.random()-0.5)*14);fxSprite(g,pos.clone().add(V().set(0,5,0)),'#2b2826',20+Math.random()*20,5+Math.random()*4,v,14,false);}}
function puff(g,pos){for(let i=0;i<10;i++){const v=V().set((Math.random()-0.5)*4,1+Math.random()*2,(Math.random()-0.5)*4).addScaledVector(g.plane.vel,0.2);fxSprite(g,pos,'#e8e6e0',3,1.6,v,5,false);}}
function stepFx(g,dt){for(const f of g.fx){f.life-=dt;f.s.position.addScaledVector(f.vel,dt);f.vel.multiplyScalar(1-0.6*dt);f.size+=f.grow*dt;f.s.scale.set(f.size,f.size,1);f.s.material.opacity=clamp(f.life/f.max,0,1)*(f.size<3?0.25:0.85);}
  g.fx=g.fx.filter(f=>{if(f.life<=0){scene.remove(f.s);f.s.material.dispose();return false;}return true;});
  if(g.plane.alive&&g.mode==='play'){g.exT=(g.exT||0)+dt;if(g.exT>0.12&&g.plane.rpm>0.5&&g.plane.pos.y<1500){g.exT=0;for(const e of g.A.parts.exhaust){if(Math.random()<0.7)continue;fxSprite(g,localToWorld(g.plane,[e[0]-1,e[1],e[2]],V()),'#7a7a7a',0.9,0.5,g.plane.vel.clone().multiplyScalar(0.8),1.5,false);}}}}
function syncModel(g){const p=g.plane;g.A.g.position.copy(p.pos);g.A.g.quaternion.copy(p.q);}
/* ---------- cameras ---------- */
const CAMS=['chase','cockpit','tower'];const CAM_LABEL={chase:'Chase view',cockpit:'Cockpit view',tower:'Tower view'};
function updateCamera(g,dt){
  const p=g.plane,c=g.cam,sp=p.spec;
  if(g.mode==='attract'){c.orbit+=dt*0.12;const R=sp.len*1.25+16;camera.position.set(p.pos.x+Math.cos(c.orbit)*R,p.pos.y+4+sp.len*0.12,p.pos.z+Math.sin(c.orbit)*R);camera.lookAt(p.pos.x,p.pos.y+1,p.pos.z);camera.fov=50;camera.updateProjectionMatrix();g.A.g.visible=true;return;}
  const mode=p.alive?c.mode:'chase';
  if(mode==='cockpit'){localToWorld(p,[sp.cockpit[0],sp.cockpit[1]+0.3,0],camera.position);camera.quaternion.copy(p.q).multiply(_q.setFromAxisAngle(AX.y,-Math.PI/2));
    camera.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(AX.x,-0.13));camera.fov=68;camera.near=0.3;camera.updateProjectionMatrix();c.init=false;return;}
  camera.near=0.5;
  if(mode==='tower'){camera.position.copy(W3.towerTop);const d=camera.position.distanceTo(p.pos);camera.lookAt(p.pos);camera.fov=clamp(2*Math.atan(sp.len*1.6/Math.max(1,d))*R2D,3,60);camera.updateProjectionMatrix();c.init=false;return;}
  const fh=V().set(Math.sin(p.hdg),0,-Math.cos(p.hdg));const dist=sp.len*1.15+16,h=sp.len*0.22+5;
  const want=V().copy(p.pos).addScaledVector(fh,-dist);want.y+=h;
  if(!c.init){c.pos.copy(want);c.init=true;}
  c.pos.lerp(want,1-Math.exp(-dt*4));if(c.pos.y<2)c.pos.y=2;
  camera.position.copy(c.pos);const look=V().copy(p.pos).addScaledVector(fh,sp.len*0.35);look.y+=2;camera.lookAt(look);camera.fov=58;camera.updateProjectionMatrix();
}
function cycleCam(){if(!game||game.mode!=='play')return;const i=CAMS.indexOf(game.cam.mode);game.cam.mode=CAMS[(i+1)%CAMS.length];progress.camMode=game.cam.mode;save();toast(game,CAM_LABEL[game.cam.mode]);}
