
/* ---------- 3D flight model ---------- */
const FLAP_ORDER=['takeoff','cruise','landing'],FLAP_POS={takeoff:0.45,cruise:0,landing:1},FLAP_LABEL={takeoff:'Takeoff',cruise:'Cruise',landing:'Landing'};
const V=()=>new THREE.Vector3();
const AX={x:new THREE.Vector3(1,0,0),y:new THREE.Vector3(0,1,0),z:new THREE.Vector3(0,0,1)};
const _q=new THREE.Quaternion(),_v=V(),_v2=V();
function rho(y){return 1.225*Math.exp(-(y+ELEV)/9000);}
function quatFrom(hdg,pitch,bank){const q=new THREE.Quaternion().setFromAxisAngle(AX.y,Math.PI/2-hdg);q.multiply(_q.setFromAxisAngle(AX.z,pitch));q.multiply(_q.setFromAxisAngle(AX.x,bank));return q;}
function axes(p){p.F.set(1,0,0).applyQuaternion(p.q);p.U.set(0,1,0).applyQuaternion(p.q);p.R.set(0,0,1).applyQuaternion(p.q);}
function attitude(p){axes(p);return{hdg:Math.atan2(p.F.x,-p.F.z),pitch:Math.asin(clamp(p.F.y,-1,1)),bank:Math.atan2(-p.R.y,p.U.y)};}
function localToWorld(p,l,out){return out.set(l[0],l[1],l[2]).applyQuaternion(p.q).add(p.pos);}
function newPlane(sp){
  return{spec:sp,pos:V(),vel:V(),q:new THREE.Quaternion(),F:V(),U:V(),R:V(),thr:0,rpm:0,ab:0,flap:'cruise',flapPos:0,gearDown:false,gearPos:0,onGround:false,brake:false,
    sweep:sp.swing?sp.swing.min:0,fuel:1,engineMax:1,alive:true,v:0,agl:0,alpha:0,beta:0,stalled:false,liftT:0,hdg:0,pitch:0,bank:0,vs:0,ias:0};}
function restY(p){return-(p.spec.mainX*Math.sin(p.pitch)-p.spec.gearH*Math.cos(p.pitch));}
function placeOnRunway(p,endName,at){const e=END(endName);p.hdg=e.hdg*D2R;p.pitch=0;p.bank=0;p.q.copy(quatFrom(p.hdg,0,0));
  p.pos.set(e.T.x+e.dx*at,0,e.T.z+e.dz*at);p.pos.y=restY(p);p.vel.set(0,0,0);p.onGround=true;p.gearDown=true;p.gearPos=1;p.flap='takeoff';p.flapPos=FLAP_POS.takeoff;axes(p);}
function sweepTarget(p,kmh){const w=p.spec.swing;if(p.flap!=='cruise'||p.flapPos>0.02||p.gearDown)return w.min;return lerp(w.min,w.max,smooth((kmh-480)/600));}
function placeInAir(p,x,z,agl,hdgDeg,kmh,thr){
  const sp=p.spec,v=kmh/3.6;p.pos.set(x,agl,z);p.hdg=hdgDeg*D2R;p.thr=thr;p.rpm=thr;p.gearDown=false;p.gearPos=0;p.flap='cruise';p.flapPos=0;p.onGround=false;
  if(sp.swing)p.sweep=sweepTarget(p,kmh);const sw=sp.swing?(p.sweep-sp.swing.min)/(sp.swing.max-sp.swing.min):0;
  const q=0.5*rho(agl)*v*v,CLn=sp.m*G/(q*sp.S);const a=clamp((CLn-sp.cl0)/(sp.cla*(1-0.3*sw))-sp.inc,-0.05,0.2);
  p.pitch=a;p.q.copy(quatFrom(p.hdg,a,0));axes(p);p.vel.set(Math.sin(p.hdg)*v,0,-Math.cos(p.hdg)*v);}
const IN={pitch:0,roll:0,yaw:0,thrUp:false,thrDown:false,brake:false,stickP:0,stickR:0,thrSet:null};
function stepPlane(g,dt){
  const p=g.plane,sp=p.spec;if(!p.alive)return;
  const MASS=sp.m,S=sp.S,ctl=g.mode==='play'&&g.status==='play';
  axes(p);
  if(ctl){if(IN.thrUp)p.thr=Math.min(1,p.thr+0.45*dt);if(IN.thrDown)p.thr=Math.max(0,p.thr-0.45*dt);if(IN.thrSet!==null)p.thr=IN.thrSet;}
  p.flapPos+=clamp(FLAP_POS[p.flap]-p.flapPos,-0.3*dt,0.3*dt);p.gearPos+=clamp((p.gearDown?1:0)-p.gearPos,-0.28*dt,0.28*dt);
  const running=p.engineMax>0&&p.fuel>0;
  p.rpm+=((running?p.thr*p.engineMax:0)-p.rpm)*Math.min(1,dt*(sp.prop?0.9:0.7));
  p.ab+=clamp(((sp.ab&&running&&p.thr>0.92&&p.rpm>0.85)?1:0)-p.ab,-2*dt,1.5*dt);
  if(running&&g.M.fuelBurn)p.fuel=Math.max(0,p.fuel-(0.0002+0.0008*p.rpm+0.003*p.ab)*dt);
  const wind=g.wind;const va=_v.copy(p.vel).sub(wind);const v=va.length();
  if(sp.swing){const tgt=sweepTarget(p,v*3.6);p.sweep+=clamp(tgt-p.sweep,-0.22*dt,0.22*dt);}
  const sw=sp.swing?(p.sweep-sp.swing.min)/(sp.swing.max-sp.swing.min):0;
  const CLA=sp.cla*(1-0.3*sw);
  const d=p.flapPos*(1-sw),CL0=sp.cl0+sp.flapCl*d,CLMAX=(sp.clmax+sp.flapClmax*d)*(1-0.3*sw),aS=(CLMAX-CL0)/CLA-sp.inc;
  const vf=va.dot(p.F),vu=va.dot(p.U),vr=va.dot(p.R);
  let alpha=v>2?Math.atan2(-vu,vf):0;const beta=v>2?Math.asin(clamp(vr/v,-1,1)):0;
  const r=rho(p.pos.y),q=0.5*r*v*v;
  let pin=ctl?IN.pitch:0,rin=ctl?IN.roll:0,yin=ctl?IN.yaw:0;
  if(g.mode==='attract'){pin=0;rin=0;yin=0;}
  const att=attitude(p);
  if(!p.onGround){
    if(g.opts.assist&&Math.abs(rin)<0.05)rin=clamp(-att.bank*1.1,-0.6,0.6);
    if(g.opts.landAssist&&p.gearPos>0.97&&ctl){const agl=p.pos.y-sp.gearH;const vs=p.vel.y;
      if(agl<16&&agl>0.3&&onRunway(p.pos.x,p.pos.z,40)&&vs<-1.4&&pin<=0.1&&att.pitch<sp.tailLim*0.7){pin=Math.max(pin,clamp((-1.0-vs)*-0.5,0,0.8));}}
    const auth=clamp(v/75,0,1);
    const load=g.opts.assist?1/Math.max(0.55,Math.cos(att.bank)):1;
    let aTrim=q>50?(MASS*G*load/(q*S)-CL0)/CLA-sp.inc:aS;aTrim=clamp(aTrim,-0.06-sp.inc,aS*0.85);
    if(p.liftT>0){p.liftT-=dt;aTrim=Math.max(aTrim,0.03);}
    const kp=(Math.abs(pin)<0.05?0.9:0.55)*clamp(v/90,0.2,1.4);
    const dPitch=(pin*sp.pitch*auth-(alpha-aTrim)*kp)*dt;
    const dRoll=rin*sp.roll*auth*dt;
    const dYaw=-(beta*2.2+yin*0.14*auth)*dt;
    p.q.multiply(_q.setFromAxisAngle(AX.z,dPitch));p.q.multiply(_q.setFromAxisAngle(AX.x,dRoll));p.q.multiply(_q.setFromAxisAngle(AX.y,dYaw));p.q.normalize();
    axes(p);
    const vf2=va.dot(p.F),vu2=va.dot(p.U);alpha=v>2?Math.atan2(-vu2,vf2):0;
  }
  const ae=alpha+sp.inc;let CL;const stalled=alpha>aS;
  if(alpha>aS)CL=CLMAX*Math.max(0.4,1-(alpha-aS)*2.2);else if(ae<-0.25)CL=(CL0-CLA*0.25)*Math.max(0.4,1-(-0.25-ae)*2.2);else CL=CL0+CLA*ae;
  const mach=v/340,wave=Math.max(0,mach-0.85);
  const ge=p.onGround?1:1+0.25*Math.max(0,1-(p.pos.y-sp.gearH)/25);
  const CD=sp.cd0*(1-0.25*sw)+sp.k*CL*CL/ge+0.065*Math.pow(d,1.5)+0.018*p.gearPos+(running||!sp.prop?0:0.02)+(stalled?0.06:0)+wave*wave*(sp.supersonic?0.25:3.5);
  const thrust=p.rpm*sp.T*(1+(sp.ab||0)*p.ab)*Math.pow(r/1.225,sp.prop?0.6:0.75)*(1-(sp.prop?0.45:0.12)*clamp(v/330,0,sp.prop?1:2));
  const L=q*S*CL,Dg=q*S*CD;
  const vh=v>0.5?_v2.copy(va).divideScalar(v):_v2.copy(p.F);
  const liftDir=V().copy(p.U).addScaledVector(vh,-p.U.dot(vh));if(liftDir.lengthSq()>1e-6)liftDir.normalize();
  const Fv=V().addScaledVector(liftDir,L).addScaledVector(vh,-Dg).addScaledVector(p.F,thrust);Fv.y-=MASS*G;
  if(!p.onGround)Fv.addScaledVector(p.R,-vr*MASS*1.6);
  p.alpha=alpha;p.beta=beta;p.stalled=stalled&&!p.onGround&&v>20;
  if(p.onGround){
    const liftUp=L*liftDir.y;
    if(liftUp>MASS*G*1.005&&p.vel.length()>20){p.onGround=false;p.liftT=2.5;if(g.mode==='play')toast(g,'Airborne');}
    else{
      // ground roll: steer, rotate, brake
      const s=p.vel.length()*Math.sign(p.vel.dot(p.F)||1);
      const steer=(rin+yin)*0.32*clamp(1-Math.abs(s)/90,0.12,1);p.hdg+=steer*dt;
      if(sp.bicycle){p.pitch+=(0-p.pitch)*Math.min(1,dt*3);if(pin>0&&s>45)p.pitch=Math.min(0.035,p.pitch+0.1*dt);}
      else{if(pin>0&&s>45)p.pitch+=sp.pitch*0.8*clamp(s/75,0,1)*dt;else if(pin<0)p.pitch-=0.3*dt;else if(p.pitch>0)p.pitch-=0.06*dt;p.pitch=Math.max(0,p.pitch);}
      p.q.copy(quatFrom(p.hdg,p.pitch,0));axes(p);
      const fh=V().set(Math.sin(p.hdg),0,-Math.cos(p.hdg));
      const N=Math.max(0,MASS*G-liftUp);const brake=ctl&&(IN.brake||(IN.thrDown&&p.thr<=0.001));
      const mu=0.016+(brake?0.38:0);
      let acc=(Fv.dot(fh))/MASS;if(s>0.05)acc-=mu*N/MASS;
      let ns=s+acc*dt;if(s>=0&&ns<0)ns=0;
      p.vel.copy(fh).multiplyScalar(ns);p.pos.addScaledVector(p.vel,dt);p.pos.y=restY(p);p.brake=brake&&ns>1;
      if(g.mode!=='play')return finishStep(p);
      if(p.pitch>sp.tailLim)return crash(g,'Tail strike. The nose came up too far and the tail hit the runway.');
      if(!onPavement(p.pos.x,p.pos.z)&&ns>10)return crash(g,'You ran off the paved surface at speed.');
      return finishStep(p);
    }
  }
  p.vel.addScaledVector(Fv,dt/MASS);p.pos.addScaledVector(p.vel,dt);p.brake=false;
  checkContact(g);
  finishStep(p);
}
function finishStep(p){p.v=p.vel.length();const a=attitude(p);p.hdg=a.hdg;p.pitch=a.pitch;p.bank=a.bank;p.agl=p.pos.y-p.spec.gearH;p.vs=p.vel.y;}
const _w=V();
function checkContact(g){
  const p=g.plane,A=g.A;if(!p.alive)return;
  const pts=p.gearPos>0.97?A.pts.gear.concat(A.pts.body):A.pts.body;
  let best=null,bp=0;
  for(const pt of pts){localToWorld(p,pt,_w);const gh=obstacleH(_w.x,_w.z);const pen=0-_w.y;const penB=gh-_w.y;
    if(gh>0&&penB>=0&&(!best||penB>bp)){best={k:'building',x:_w.x,z:_w.z};bp=penB;}
    else if(pen>=0&&(!best||pen>bp)){best={k:pt[3],x:_w.x,z:_w.z};bp=pen;}}
  if(!best)return;
  if(g.mode==='attract'){p.pos.y+=bp;p.vel.y=Math.max(0,p.vel.y);return;}
  if(best.k==='building')return crash(g,'You flew into a building.');
  const sink=-p.vel.y,kmh=p.v*3.6,att=attitude(p);
  const gearOk=p.gearPos>0.97;
  if(gearOk&&(best.k==='main'||best.k==='nose')&&p.vel.y>-0.2&&p.liftT>0){p.pos.y+=bp+0.001;if(p.vel.y<0)p.vel.y=0;return;}
  if(gearOk&&((best.k==='main'&&(!p.spec.bicycle||att.pitch>-0.07))||(best.k==='nose'&&att.pitch>-0.035))){
    const rw=onRunway(best.x,best.z,3);
    if(!rw&&!onPavement(best.x,best.z))return crash(g,'You touched down off the runway.');
    if(sink>5.5)return crash(g,`The landing was far too hard (${sink.toFixed(1)} m/s) and the gear collapsed.`);
    if(kmh>380)return crash(g,`Touched down at ${Math.round(kmh)} km/h. That’s far too fast for the tyres.`);
    if(Math.abs(att.bank)>0.14)return crash(g,'One wing was too low at touchdown. Level the wings before you land.');
    const track=Math.atan2(p.vel.x,-p.vel.z);let crab=Math.abs(((att.hdg-track+Math.PI*3)%(Math.PI*2))-Math.PI);
    if(crab>0.3&&p.v>20)return crash(g,'You touched down sideways and the gear failed. Line the nose up with the runway.');
    p.onGround=true;p.hdg=att.hdg;p.pitch=Math.max(0,att.pitch);const s=Math.max(0,p.vel.dot(V().set(Math.sin(p.hdg),0,-Math.cos(p.hdg))));
    p.vel.set(Math.sin(p.hdg)*s,0,-Math.cos(p.hdg)*s);p.q.copy(quatFrom(p.hdg,p.pitch,0));p.pos.y=restY(p);axes(p);
    let off=0;if(rw){off=rwLocal(rw,p.pos.x,p.pos.z).cross;}
    if(g.stats.sink===null||!g.stats.landedEnd){g.stats.sink=Math.max(0,sink);g.stats.offset=Math.abs(off);g.stats.rw=rw;}
    g.stats.sink=Math.max(0,sink);g.stats.offset=Math.abs(off);g.stats.rw=rw;g.stats.landedEnd=true;
    toast(g,sink<1.5?`Smooth touchdown, ${sink.toFixed(1)} m/s`:sink<3?`Firm touchdown, ${sink.toFixed(1)} m/s`:`Hard touchdown, ${sink.toFixed(1)} m/s`);
    AU.clunk();puff(g,localToWorld(p,[p.spec.mainX,-p.spec.gearH,0],V()));return;}
  if(sink>14)return crash(g,'You flew into the ground.');
  if(best.k==='wing'||best.k==='prop'||best.k==='pod')return crash(g,'A wing or engine struck the ground. Keep the wings level near the runway.');
  if(best.k==='main'&&p.spec.bicycle)return crash(g,'The front gear hit first. Land this one almost level.');
  if(best.k==='nose')return crash(g,'The nose wheel hit first and collapsed. Keep the nose slightly up when you land.');
  if(best.k==='tail')return crash(g,'Tail strike. The nose was too high at touchdown.');
  if(p.gearPos<0.05)return crash(g,'Belly landing. The gear was still up.');
  if(!gearOk)return crash(g,'The gear wasn’t fully down and locked.');
  return crash(g,'You flew into the ground.');
}
