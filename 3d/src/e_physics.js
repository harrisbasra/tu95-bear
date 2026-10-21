
/* ---------- 3D flight model ---------- */
const V=()=>new THREE.Vector3();
const AX={x:new THREE.Vector3(1,0,0),y:new THREE.Vector3(0,1,0),z:new THREE.Vector3(0,0,1)};
const _q=new THREE.Quaternion(),_v=V(),_v2=V();
// ISA atmosphere. y is height above the field, so add the field elevation.
function isa(y){const h=Math.max(-500,y+ELEV);const T=h<11000?288.15-0.0065*h:216.65;
  const P=h<11000?101325*Math.pow(T/288.15,5.2559):22632*Math.exp(-(h-11000)/6341.6);return{T,rho:P/(287.05*T),a:Math.sqrt(401.87*T)};}
function rho(y){return isa(y).rho;}
// Published speeds are indicated airspeeds, so lift calibration and V-speeds use sea-level density.
const RHO_FIELD=1.225;
function quatFrom(hdg,pitch,bank){const q=new THREE.Quaternion().setFromAxisAngle(AX.y,Math.PI/2-hdg);q.multiply(_q.setFromAxisAngle(AX.z,pitch));q.multiply(_q.setFromAxisAngle(AX.x,bank));return q;}
function axes(p){p.F.set(1,0,0).applyQuaternion(p.q);p.U.set(0,1,0).applyQuaternion(p.q);p.R.set(0,0,1).applyQuaternion(p.q);}
function attitude(p){axes(p);return{hdg:Math.atan2(p.F.x,-p.F.z),pitch:Math.asin(clamp(p.F.y,-1,1)),bank:Math.atan2(-p.R.y,p.U.y)};}
function localToWorld(p,l,out){return out.set(l[0],l[1],l[2]).applyQuaternion(p.q).add(p.pos);}
const wrapPi=a=>{a=(a+Math.PI)%(Math.PI*2);if(a<0)a+=Math.PI*2;return a-Math.PI;};

/* ---- flaps, weights and speeds ---- */
function flapCamber(sp,d){return d>0?sp.flapCl*Math.pow(d,sp.flapExp||1):0;}
function flapTarget(p){return p.spec.flaps[p.flapIdx].pos;}
function flapName(p,i){const f=p.spec.flaps[i===undefined?p.flapIdx:i];return f.n;}
function flapsUp(p){return p.flapIdx===0;}
function mass(p){return p.spec.oew+p.payload+p.fuelKg;}
// A sensible load for a mission: 'takeoff' or 'landing' weight, kept inside the structural limits.
function loadout(sp,kind){const payload=Math.round(sp.payload*0.6);let fuel=sp.fuelCap*(kind==='landing'?0.12:0.32);
  const lim=kind==='landing'?sp.mlw:sp.mtow;fuel=Math.max(sp.fuelCap*0.05,Math.min(fuel,lim-sp.oew-payload));return{payload,fuel:Math.round(fuel)};}
// Stall, reference and rotation speeds for a weight and flap setting, in km/h at the field.
function stallKmh(sp,m,flapPos){const cl=sp.clmax+sp.flapClmax*flapPos;return Math.sqrt(2*m*G/(RHO_FIELD*sp.S*cl))*3.6;}
function vspeeds(sp,m){const ld=sp.flaps[sp.ldgFlap].pos,to=sp.flaps[sp.toFlap].pos;const vsl=stallKmh(sp,m,ld),vst=stallKmh(sp,m,to);
  return{vref:vsl*1.23,vapp:vsl*1.23+5*KT,vr:vst*1.1,v2:vst*1.2,vs:vsl};}
// Turns published numbers into flight-model coefficients. Run once per aircraft.
function prepSpec(a){
  a.cat=a.cat||'military';a.engType=a.engType||(a.prop?'turboprop':'turbofan');
  if(!a.flaps)a.flaps=[{n:'Up',pos:0},{n:'Takeoff',pos:0.45,vfe:a.flapMax},{n:'Landing',pos:1,vfe:a.flapMax}];
  if(a.toFlap===undefined)a.toFlap=1;if(a.ldgFlap===undefined)a.ldgFlap=a.flaps.length-1;
  const AR=a.span*a.span/a.S;a.k=a.k||1/(Math.PI*(a.oswald||0.8)*AR);a.cla=a.cla||2*Math.PI*AR/(AR+2+(a.swing?0:2*Math.cos((a.sweep||25)*D2R)))*0.95;
  // CLmax with landing flap, from the published reference speed at maximum landing weight (Vref = 1.23 Vs)
  const vs=a.vrefKt*KT/3.6/1.23;const clL=2*a.mlw*G/(RHO_FIELD*vs*vs*a.S);
  a.flapClmax=(clL-a.clmax)/a.flaps[a.vrefFlap===undefined?a.ldgFlap:a.vrefFlap].pos;
  a.rotRate=a.rotRate||a.pitch*0.8;a.vmoKmh=a.vmo*KT;a.sinkMax=a.sinkMax||(a.cat==='airliner'?4.6:5.5);
  let lim=0.5;for(const t of a.tailPts){if(t[0]<a.mainX){lim=Math.min(lim,Math.atan2(t[1]+a.gearH,a.mainX-t[0]));}}
  a.tailLim=(a.tailStrike?a.tailStrike*D2R:lim)*0.97;
  // Flap camber (the lift the flaps add at a given attitude), fitted to two attitudes seen on the real aircraft:
  // lift-off (CL = CLmax/1.25 with takeoff flap) at about 65% of the tail-strike angle, and a final approach at
  // Vref + 5 kt (about 1.3 Vs) with landing flap about 2.5° nose-up on a 3° glide path, so about 5.5° angle of attack. Camber grows with flap position as pos^flapExp.
  // Slats and leading-edge flaps make up the rest of the CLmax gain by delaying the stall.
  const pTo=a.flaps[a.toFlap].pos,clTo=(a.clmax+a.flapClmax*pTo)/1.25,cTo=clamp(clTo-a.cl0-a.cla*(0.65*a.tailLim+a.inc),0.02,a.flapClmax);
  const pL=a.flaps[a.ldgFlap].pos,clL2=(a.clmax+a.flapClmax*pL)/1.69,cL=clamp(clL2-a.cl0-a.cla*((a.bicycle?3:5.5)*D2R+a.inc),0.05,a.flapClmax*1.1);
  a.flapCl=cL/Math.pow(pL,1);a.flapExp=clamp(Math.log(cTo/a.flapCl)/Math.log(pTo),0.4,2.5);
  const L=loadout(a,'takeoff'),Lg=loadout(a,'landing');a.toMass=a.oew+L.payload+L.fuel;a.ldgMass=a.oew+Lg.payload+Lg.fuel;
  const s=vspeeds(a,a.toMass),s2=vspeeds(a,a.ldgMass);a.rotKmh=Math.round(s.vr/5)*5;a.appKmh=Math.round(s2.vapp/5)*5;
  a.flapMax=a.flaps[1].vfe||a.vmoKmh;
}

/* ---- the aircraft state ---- */
function newPlane(sp,kind,load){const L=load||loadout(sp,kind||'takeoff');
  return{spec:sp,pos:V(),vel:V(),q:new THREE.Quaternion(),F:V(),U:V(),R:V(),thr:0,rpm:0,ab:0,flapIdx:0,flapPos:0,gearDown:false,gearPos:0,onGround:false,brake:false,
    sweep:sp.swing?sp.swing.min:0,payload:L.payload,fuelKg:L.fuel,fuel:L.fuel/sp.fuelCap,engineMax:1,alive:true,v:0,agl:0,alpha:0,beta:0,stalled:false,liftT:0,
    hdg:0,pitch:0,bank:0,vs:0,ias:0,mach:0,spd:0,gsp:0,rev:0,ff:0,m:sp.oew+L.payload+L.fuel,ap:newAP()};}
function restY(p){return-(p.spec.mainX*Math.sin(p.pitch)-p.spec.gearH*Math.cos(p.pitch));}
function placeOnRunway(p,endName,at){const e=END(endName);p.hdg=e.hdg*D2R;p.pitch=0;p.bank=0;p.q.copy(quatFrom(p.hdg,0,0));
  p.pos.set(e.T.x+e.dx*at,0,e.T.z+e.dz*at);p.pos.y=restY(p);p.vel.set(0,0,0);p.onGround=true;p.gearDown=true;p.gearPos=1;p.flapIdx=p.spec.toFlap;p.flapPos=flapTarget(p);axes(p);}
function sweepTarget(p,kmh){const w=p.spec.swing;if(!flapsUp(p)||p.flapPos>0.02||p.gearDown)return w.min;return lerp(w.min,w.max,smooth((kmh-480)/600));}
function placeInAir(p,x,z,agl,hdgDeg,kmh,thr,flapIdx){
  const sp=p.spec,v=kmh/3.6*Math.sqrt(1.225/rho(agl));p.pos.set(x,agl,z);p.hdg=hdgDeg*D2R;p.thr=thr;p.rpm=thr;p.gearDown=false;p.gearPos=0;p.flapIdx=flapIdx||0;p.flapPos=flapTarget(p);p.onGround=false;
  if(sp.swing)p.sweep=sweepTarget(p,kmh);const sw=sp.swing?(p.sweep-sp.swing.min)/(sp.swing.max-sp.swing.min):0;
  const q=0.5*rho(agl)*v*v,CL0=sp.cl0+flapCamber(sp,p.flapPos*(1-sw)),CLn=mass(p)*G/(q*sp.S);const a=clamp((CLn-CL0)/(sp.cla*(1-0.3*sw))-sp.inc,-0.05,0.2);
  p.pitch=a;p.q.copy(quatFrom(p.hdg,a,0));axes(p);p.vel.set(Math.sin(p.hdg)*v,0,-Math.cos(p.hdg)*v);}
const IN={pitch:0,roll:0,yaw:0,thrUp:false,thrDown:false,brake:false,stickP:0,stickR:0,thrSet:null,spd:false};
// Static thrust falls with speed and air density in a way that depends on the engine type.
function thrustAvail(sp,v,M,r){const dr=r/1.225;
  if(sp.engType==='turboprop'){const Ts=sp.T,P=sp.power*0.85;return Ts/Math.sqrt(1+Math.pow(Ts*v/P,2))*Math.pow(dr,0.7);}
  if(sp.engType==='lowbypass')return sp.T*(1-0.35*M+0.38*M*M)*Math.pow(dr,0.75);
  return sp.T*Math.max(0.2,1-0.85*M+0.62*M*M)*Math.pow(dr,0.8);}
function stepPlane(g,dt){
  const p=g.plane,sp=p.spec;if(!p.alive)return;
  const MASS=mass(p),S=sp.S,ctl=g.mode==='play'&&g.status==='play';p.m=MASS;
  axes(p);
  const thrBefore=p.thr;
  if(ctl){if(IN.thrUp)p.thr=Math.min(1,p.thr+0.4*dt);if(IN.thrDown)p.thr=Math.max(0,p.thr-0.4*dt);if(IN.thrSet!==null)p.thr=IN.thrSet;}
  p.flapPos+=clamp(flapTarget(p)-p.flapPos,-(sp.flapRate||0.3)*dt,(sp.flapRate||0.3)*dt);p.gearPos+=clamp((p.gearDown?1:0)-p.gearPos,-dt/(sp.gearT||3.6),dt/(sp.gearT||3.6));
  const running=p.engineMax>0&&p.fuelKg>0;
  const wind=g.wind;const va=_v.copy(p.vel).sub(wind);const v=va.length();
  const air=isa(p.pos.y),r=air.rho,q=0.5*r*v*v,M=v/air.a;
  let pin=ctl?IN.pitch:0,rin=ctl?IN.roll:0,yin=ctl?IN.yaw:0;
  if(g.mode==='attract'){pin=0;rin=0;yin=0;}
  // autopilot and autothrottle
  if(ctl&&p.ap.on||ctl&&p.ap.at){const c=apControl(g,dt,{pin,rin,yin,thrMoved:p.thr!==thrBefore});if(c){if(c.pin!==null)pin=c.pin;if(c.rin!==null)rin=c.rin;if(c.yin!==null)yin=c.yin;if(c.thr!==null)p.thr=c.thr;}}
  // reverse thrust: hold power-down at idle on the ground
  if(ctl&&p.onGround&&p.ap.on&&p.ap.gs){apRollout(g,dt);pin=-0.3;rin=0;yin=0;}
  const wantRev=ctl&&p.onGround&&sp.rev>0&&p.thr<=0.001&&(IN.thrDown||IN.rev||p.ap.revOn)&&p.v>12;
  p.rev+=clamp((wantRev?1:0)-p.rev,-dt/1.5,dt/2);
  p.rpm+=((running?Math.max(p.thr,p.rev*0.75,0.04)*p.engineMax:0)-p.rpm)*Math.min(1,dt*(sp.prop?0.9:sp.spool||0.45));
  p.ab+=clamp(((sp.ab&&running&&p.thr>0.92&&p.rpm>0.85)?1:0)-p.ab,-2*dt,1.5*dt);
  if(sp.swing){const tgt=sweepTarget(p,v*3.6);p.sweep+=clamp(tgt-p.sweep,-0.22*dt,0.22*dt);}
  const sw=sp.swing?(p.sweep-sp.swing.min)/(sp.swing.max-sp.swing.min):0;
  // spoilers: speedbrake in the air, ground spoilers on touchdown
  const wantSpd=ctl&&IN.spd?1:0;p.spd+=clamp(wantSpd-p.spd,-dt,dt);
  const wantGsp=p.onGround&&sp.spoilers&&p.thr<0.1&&p.v>15&&(g.flags.landed||p.rev>0||g.flags.rto);p.gsp+=clamp((wantGsp?1:0)-p.gsp,-dt,dt*2);
  const spl=Math.max(p.spd*(p.onGround?1:0.55),p.gsp);
  const CLA=sp.cla*(1-0.3*sw);
  const d=p.flapPos*(1-sw),CL0=sp.cl0+flapCamber(sp,d),CLMAX=(sp.clmax+sp.flapClmax*d)*(1-0.3*sw),aS=(CLMAX-CL0)/CLA-sp.inc;
  const vf=va.dot(p.F),vu=va.dot(p.U),vr=va.dot(p.R);
  let alpha=v>2?Math.atan2(-vu,vf):0;const beta=v>2?Math.asin(clamp(vr/v,-1,1)):0;
  const att=attitude(p);
  // flight assist: tail-strike protection on the runway and just after lift-off, like the 777 and A350 fly-by-wire
  if(g.opts.assist&&pin>0&&(p.onGround||p.agl<8)&&!sp.bicycle){const lim=sp.tailLim*0.8,pp=p.onGround?p.pitch:att.pitch;if(pp>lim-0.02)pin=Math.min(pin,Math.max(0,(lim-pp)*25));}
  p.cin={pin,rin,yin};
  if(!p.onGround){
    if(g.opts.assist&&Math.abs(rin)<0.05&&!p.ap.on)rin=clamp(-att.bank*1.1,-0.6,0.6);
    if(g.opts.landAssist&&p.gearPos>0.97&&ctl&&!p.ap.flare){const agl=p.pos.y-sp.gearH;const vs=p.vel.y;
      if(agl<16&&agl>0.3&&onRunway(p.pos.x,p.pos.z,40)&&vs<-1.4&&pin<=0.1&&att.pitch<sp.tailLim*0.7){pin=Math.max(pin,clamp((-1.0-vs)*-0.5,0,0.8));}}
    const auth=clamp(v/75,0,1);
    const load=g.opts.assist||p.ap.on?1/Math.max(0.55,Math.cos(att.bank)):1;
    let aTrim=q>50?(MASS*G*load/(q*S*(1-0.45*spl))-CL0)/CLA-sp.inc:aS;aTrim=clamp(aTrim,-0.06-sp.inc,aS*0.85);
    if(p.liftT>0){p.liftT-=dt;aTrim=Math.max(aTrim,0.03);}
    const kp=(Math.abs(pin)<0.05?0.9:0.55)*clamp(v/90,0.2,1.4);
    const dPitch=(pin*sp.pitch*auth-(alpha-aTrim)*kp)*dt;
    const dRoll=rin*sp.roll*auth*dt;
    let dYaw=-(beta*2.2+yin*0.14*auth)*dt;
    // landing assist: de-crab just before touchdown, the way a pilot kicks in rudder in a crosswind
    if((g.opts.landAssist||p.ap.flare)&&ctl&&p.gearPos>0.97){const agl=p.pos.y-sp.gearH;if(agl<4&&onRunway(p.pos.x,p.pos.z,60)){const track=Math.atan2(p.vel.x,-p.vel.z);dYaw+=clamp(wrapPi(att.hdg-track),-0.15*dt,0.15*dt);}}
    p.q.multiply(_q.setFromAxisAngle(AX.z,dPitch));p.q.multiply(_q.setFromAxisAngle(AX.x,dRoll));p.q.multiply(_q.setFromAxisAngle(AX.y,dYaw));p.q.normalize();
    axes(p);
    const vf2=va.dot(p.F),vu2=va.dot(p.U);alpha=v>2?Math.atan2(-vu2,vf2):0;
  }
  const ae=alpha+sp.inc;let CL;const stalled=alpha>aS;
  if(alpha>aS)CL=CLMAX*Math.max(0.4,1-(alpha-aS)*2.2);else if(ae<-0.25)CL=(CL0-CLA*0.25)*Math.max(0.4,1-(-0.25-ae)*2.2);else CL=CL0+CLA*ae;
  CL*=1-0.45*spl;
  const wave=Math.max(0,M-(sp.mdd||0.85));
  const ge=p.onGround?1:1+0.25*Math.max(0,1-(p.pos.y-sp.gearH)/(sp.span*0.6));
  const CD=sp.cd0*(1-0.25*sw)+sp.k*CL*CL/ge+0.065*Math.pow(d,1.5)+(sp.gearCd||0.018)*p.gearPos+(running||!sp.prop?0:0.02)+(stalled?0.06:0)+0.05*spl+wave*wave*(sp.supersonic?0.25:3.5);
  const fwd=p.rpm*thrustAvail(sp,v,M,r)*(1+(sp.ab||0)*p.ab);
  const thrust=fwd*(1-p.rev)-p.rev*(sp.rev||0)*fwd;
  // fuel burn: thrust-specific fuel consumption for jets, power-specific for turboprops
  if(running){const sfc=sp.engType==='turboprop'?0:(sp.engType==='lowbypass'?1.6e-5:1.0e-5)*(1+0.6*M);
    p.ff=sp.engType==='turboprop'?6.9e-8*sp.power*Math.max(0.06,p.rpm):sfc*Math.max(fwd,sp.T*0.04)*(1+1.6*p.ab);
    p.fuelKg=Math.max(0,p.fuelKg-p.ff*dt);p.fuel=p.fuelKg/sp.fuelCap;}else p.ff=0;
  const L=q*S*CL,Dg=q*S*CD;
  const vh=v>0.5?_v2.copy(va).divideScalar(v):_v2.copy(p.F);
  const liftDir=V().copy(p.U).addScaledVector(vh,-p.U.dot(vh));if(liftDir.lengthSq()>1e-6)liftDir.normalize();
  const Fv=V().addScaledVector(liftDir,L).addScaledVector(vh,-Dg).addScaledVector(p.F,thrust);Fv.y-=MASS*G;
  // side force from sideslip (fuselage and fin), CYβ ≈ 1.5 per radian
  if(!p.onGround)Fv.addScaledVector(p.R,-q*S*1.5*beta);
  p.alpha=alpha;p.beta=beta;p.stalled=stalled&&!p.onGround&&v>20;p.mach=M;p.ias=v*Math.sqrt(r/1.225);p.tas=v;
  if(p.onGround){
    const liftUp=L*liftDir.y;
    if(liftUp>MASS*G*1.005&&p.vel.length()>20){p.onGround=false;p.liftT=2.5;if(g.mode==='play')toast(g,'Airborne');}
    else{
      // ground roll: nose-wheel tiller at low speed, rudder as speed builds; rotate; brake
      const s=p.vel.length()*Math.sign(p.vel.dot(p.F)||1);
      const tiller=(rin+yin)*0.32*clamp(1-Math.abs(s)/90,0.12,1),rudder=(yin+rin*0.5)*0.07*clamp(Math.abs(s)/50,0,1);
      let steer=tiller+rudder;
      if(p.ap.rollout)steer=p.ap.steer;
      p.hdg+=steer*dt;
      if(sp.bicycle){p.pitch+=(0-p.pitch)*Math.min(1,dt*3);if(pin>0&&s>45)p.pitch=Math.min(0.035,p.pitch+0.1*dt);}
      else{if(pin>0&&s>45)p.pitch+=sp.rotRate*pin*clamp(s/75,0,1)*dt;else if(pin<0)p.pitch-=0.3*dt;else if(p.pitch>0)p.pitch-=0.06*dt;p.pitch=Math.max(0,p.pitch);}
      p.q.copy(quatFrom(p.hdg,p.pitch,0));axes(p);
      const fh=V().set(Math.sin(p.hdg),0,-Math.cos(p.hdg));
      const N=Math.max(0,MASS*G-liftUp);const brake=ctl&&(IN.brake||(IN.thrDown&&p.thr<=0.001)||p.ap.brake);
      const mu=0.016+(brake?(sp.brakeMu||0.4):0);
      let acc=(Fv.dot(fh))/MASS;if(s>0.05)acc-=mu*N/MASS;
      let ns=s+acc*dt;if(s>=0&&ns<0)ns=0;
      p.vel.copy(fh).multiplyScalar(ns);p.pos.addScaledVector(p.vel,dt);p.pos.y=restY(p);p.brake=brake&&ns>1;
      if(g.mode!=='play')return finishStep(p);
      if(p.pitch>sp.tailLim)return crash(g,`Tail strike. The nose came up past ${Math.round(sp.tailLim*R2D)}° and the tail hit the runway. Rotate smoothly and stop at about ${Math.round(sp.tailLim*R2D*0.7)}°.`);
      if(!onPavement(p.pos.x,p.pos.z)&&ns>10)return crash(g,'You ran off the paved surface at speed. Steer with ← → (and A D for rudder) to stay on the centreline.');
      return finishStep(p);
    }
  }
  p.vel.addScaledVector(Fv,dt/MASS);p.pos.addScaledVector(p.vel,dt);p.brake=false;
  checkContact(g);
  finishStep(p);
}
function finishStep(p){p.v=p.vel.length();const a=attitude(p);p.hdg=a.hdg;p.pitch=a.pitch;p.bank=a.bank;p.th=HILLS.length?terrainH(p.pos.x,p.pos.z):0;p.agl=p.pos.y-p.spec.gearH-p.th;p.vs=p.vel.y;}
const _w=V();
function checkContact(g){
  const p=g.plane,A=g.A,sp=p.spec;if(!p.alive)return;
  const pts=p.gearPos>0.97?A.pts.gear.concat(A.pts.body):A.pts.body;
  let best=null,bp=0;
  if(p.th>0){for(const pt of pts){localToWorld(p,pt,_w);if(_w.y<terrainH(_w.x,_w.z))return crash(g,'You flew into the hills. Keep at least 600 m above the ground near high terrain, and watch the “Pull up” warning.');}}
  for(const pt of pts){localToWorld(p,pt,_w);const gh=obstacleH(_w.x,_w.z);const pen=0-_w.y;const penB=gh-_w.y;
    if(gh>0&&penB>=0&&(!best||penB>bp)){best={k:'building',x:_w.x,z:_w.z};bp=penB;}
    else if(pen>=0&&(!best||pen>bp)){best={k:pt[3],x:_w.x,z:_w.z};bp=pen;}}
  if(!best)return;
  if(g.mode==='attract'){p.pos.y+=bp;p.vel.y=Math.max(0,p.vel.y);return;}
  if(best.k==='building')return crash(g,'You flew into a building. Stay above the rooftops, and keep at least 300 m up over the city.');
  if(inWater(best.x,best.z)&&!onPavement(best.x,best.z))return crash(g,p.gearPos>0.97?'You came down in the water, short of the runway. Stay on the glide path: two white and two red PAPI lights.':'You ditched in the water.');
  const sink=-p.vel.y,kmh=p.v*3.6,att=attitude(p);
  const gearOk=p.gearPos>0.97;
  if(gearOk&&(best.k==='main'||best.k==='nose')&&p.vel.y>-0.2&&p.liftT>0){p.pos.y+=bp+0.001;if(p.vel.y<0)p.vel.y=0;return;}
  if(gearOk&&((best.k==='main'&&(!sp.bicycle||att.pitch>-0.07))||(best.k==='nose'&&att.pitch>-0.035))){
    const rw=onRunway(best.x,best.z,3);
    if(!rw&&!onPavement(best.x,best.z))return crash(g,'You touched down off the runway. Line up earlier using the magenta centreline marker, and land on the paved surface.');
    const heavy=p.m>sp.mlw*1.02,lim=sp.sinkMax*(heavy?0.6:1);
    if(sink>lim)return crash(g,`The landing was far too hard (${sink.toFixed(1)} m/s) and the gear collapsed.${heavy?' You were also over the maximum landing weight.':''} Hold the nose up gently in the last 10 m so the descent slows to under 2 m/s.`);
    if(kmh>sp.appKmh*1.45+40)return crash(g,`Touched down at ${Math.round(kmh)} km/h. That’s far too fast for the tyres. Fly the approach at about ${sp.appKmh} km/h with full flap.`);
    if(Math.abs(att.bank)>0.14)return crash(g,'One wing was too low at touchdown. Level the wings before you land.');
    const track=Math.atan2(p.vel.x,-p.vel.z);let crab=Math.abs(wrapPi(att.hdg-track));
    if(crab>0.3&&p.v>20)return crash(g,'You touched down sideways and the gear failed. Use the rudder (A / D) to line the nose up with the runway just before touchdown.');
    p.onGround=true;g.flags.landed=true;p.hdg=att.hdg;p.pitch=Math.max(0,att.pitch);const s=Math.max(0,p.vel.dot(V().set(Math.sin(p.hdg),0,-Math.cos(p.hdg))));
    p.vel.set(Math.sin(p.hdg)*s,0,-Math.cos(p.hdg)*s);p.q.copy(quatFrom(p.hdg,p.pitch,0));p.pos.y=restY(p);axes(p);
    let off=0;if(rw){off=rwLocal(rw,p.pos.x,p.pos.z).cross;}
    g.stats.sink=Math.max(0,sink);g.stats.offset=Math.abs(off);g.stats.rw=rw;g.stats.landedEnd=true;g.stats.tdKmh=kmh;g.stats.heavy=heavy;
    if(rw){const e=rw.ends.reduce((a,b)=>((p.pos.x-a.T.x)*a.dx+(p.pos.z-a.T.z)*a.dz)>=0&&((p.pos.x-b.T.x)*b.dx+(p.pos.z-b.T.z)*b.dz)<0?a:b);g.stats.tdDist=(p.pos.x-e.T.x)*e.dx+(p.pos.z-e.T.z)*e.dz;}
    toast(g,sink<1.5?`Smooth touchdown, ${sink.toFixed(1)} m/s`:sink<3?`Firm touchdown, ${sink.toFixed(1)} m/s`:`Hard touchdown, ${sink.toFixed(1)} m/s`);
    AU.clunk();padPulse(clamp(sink/3,0.25,1),clamp(sink/4,0.15,0.8),sink>2?260:160);puff(g,localToWorld(p,[sp.mainX,-sp.gearH,0],V()));return;}
  if(sink>14)return crash(g,'You flew into the ground. Watch the climb rate and the “Pull up” warning, and add power earlier.');
  if(best.k==='wing'||best.k==='prop'||best.k==='pod')return crash(g,'A wing or engine struck the ground. Keep the wings level near the runway.');
  if(best.k==='main'&&sp.bicycle)return crash(g,'The front gear hit first. Land this one almost level.');
  if(best.k==='nose')return crash(g,'The nose wheel hit first and collapsed. Keep the nose slightly up when you land.');
  if(best.k==='tail')return crash(g,`Tail strike. The nose was too high at touchdown. Keep the pitch below about ${Math.round(sp.tailLim*R2D*0.75)}° in the flare.`);
  if(p.gearPos<0.05)return crash(g,'Belly landing. The gear was still up. Lower it (G) before the final approach.');
  if(!gearOk)return crash(g,'The gear wasn’t fully down and locked. Lower it earlier: it takes a few seconds.');
  return crash(g,'You flew into the ground.');
}
