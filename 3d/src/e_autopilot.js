
/* ---------- autopilot and autothrottle ---------- */
// Modes, roughly as on a Boeing MCP or Airbus FCU:
//   lateral  HDG (heading select) or LOC (runway course, after the approach is armed and captured)
//   vertical ALT (climb or descend to the selected altitude and hold it), or G/S once the glide path is captured
//   then FLARE, RETARD and ROLLOUT for an automatic landing, with autobrake and reverse thrust.
// Altitudes are kept in metres above sea level and speeds as indicated km/h; the panels show feet and knots.
function newAP(){return{on:false,at:false,vnav:false,lat:'HDG',vert:'ALT',hdg:0,alt:0,spd:0,app:false,loc:false,gs:false,flare:false,retard:false,rollout:false,
  steer:0,brake:false,revOn:false,end:null,fdP:0,fdR:0,lastIas:null,override:0,msg:''};}
function apSync(p){const a=p.ap;a.hdg=Math.round(((p.hdg*R2D)+360)%360);a.alt=Math.round((p.pos.y+ELEV)/FT/100)*100*FT;a.spd=Math.round((p.ias||p.vel.length()*Math.sqrt(rho(p.pos.y)/1.225))*3.6/KT)*KT;}
function apEngage(g,on){const p=g.plane,a=p.ap;if(on===undefined)on=!a.on;
  if(on){if(p.onGround){toast(g,'The autopilot can only be engaged in the air');return;}if(p.agl<120){toast(g,'Climb above 120 m before engaging the autopilot');return;}
    if(!a.on&&!a.at)apSync(p);a.on=true;a.at=true;a.lat=a.loc?'LOC':a.lat==='NAV'&&g.nav?'NAV':'HDG';a.vert=a.gs?'G/S':'ALT';toast(g,'Autopilot on');AU.blip(1200);}
  else{apOff(g,'Autopilot off');}}
function apOff(g,why){const a=g.plane.ap;const was=a.on;a.on=false;a.flare=a.retard=false;a.loc=a.gs=false;a.app=false;a.rollout=false;a.brake=false;a.revOn=false;
  if(was){toast(g,why||'Autopilot off');AU.blip(520);setTimeout(()=>AU.blip(440),160);}}
function apArmApp(g){const p=g.plane,a=p.ap;if(a.app){a.app=false;a.loc=a.gs=false;a.lat='HDG';a.vert='ALT';toast(g,'Approach mode off');return;}
  // a planned arrival runway wins; otherwise the runway ahead
  const planned=g.M.dest&&END(g.M.dest);const ap=planned?{e:planned}:approach(g);if(!ap){toast(g,'No runway ahead. Turn toward the airport first, then arm the approach');return;}
  a.end=ap.e;a.app=true;if(!a.on)apEngage(g,true);toast(g,`Approach armed for runway ${ap.e.name}`);}
function apNav(g){const a=g.plane.ap;if(!g.nav){toast(g,'NAV follows a flight plan: plan a flight from the world map');return;}if(a.lat==='NAV'){a.lat='HDG';toast(g,'Heading select');return;}
  if(!a.on)apEngage(g,true);if(!a.on)return;a.lat='NAV';toast(g,'NAV: following the route');}
function apVnav(g){const a=g.plane.ap;if(!g.nav){toast(g,'VNAV follows a flight plan: plan a flight from the world map');return;}a.vnav=!a.vnav;if(a.vnav&&!a.on)apEngage(g,true);if(a.vnav&&!a.at)a.at=true;toast(g,a.vnav?'VNAV: cruise altitude, then a 3° descent; managed speed':'VNAV off');}
function apAdjust(g,what,dir){const a=g.plane.ap;if(a.vnav&&(what==='alt'||what==='spd')){a.vnav=false;toast(g,'VNAV off: selected altitude and speed');}
  if(what==='hdg')a.hdg=((Math.round(a.hdg/5)*5+dir*5)+360)%360;
  if(what==='alt')a.alt=Math.max(1000*FT,Math.round(a.alt/FT/500)*500*FT+dir*500*FT);
  if(what==='spd')a.spd=clamp(Math.round(a.spd/KT/5)*5*KT+dir*5*KT,100*KT,g.plane.spec.vmoKmh);}
function apControl(g,dt,inp){
  const p=g.plane,sp=p.spec,a=p.ap,out={pin:null,rin:null,yin:null,thr:null};
  if(p.onGround)return a.on&&a.gs?{pin:-0.3,rin:0,yin:0,thr:0}:null;
  const ias=p.ias*3.6,v=Math.max(p.v,30);const dIas=a.lastIas===null?0:(ias-a.lastIas)/dt;a.lastIas=ias;
  // the pilot takes over by moving the controls firmly
  if(a.on&&!a.rollout){if(Math.abs(inp.pin)>0.5||Math.abs(inp.rin)>0.5){a.override+=dt;if(a.override>0.25){apOff(g,'Autopilot disconnected: you took the controls');return null;}}else a.override=0;}
  if(a.at&&inp.thrMoved&&!a.retard){a.at=false;toast(g,'Autothrottle off');}
  const e=a.end,rh=e?e.hdg*D2R:0;let along=0,lat=0;
  if(e){const rx=p.pos.x-e.T.x,rz=p.pos.z-e.T.z;along=-(rx*e.dx+rz*e.dz);lat=rx*(-e.dz)+rz*e.dx;}
  if(a.vnav&&g.nav&&!a.gs){a.alt=g.nav.altT;a.spd=g.nav.spdT;}
  let spdT=a.spd;
  if(a.on){
    // approach mode: capture the localiser, then the glide path
    if(a.app&&e){const locDev=Math.atan2(lat,along+e.rw.len)*R2D;
      if(!a.loc&&Math.abs(locDev)<2.5&&along>-200&&Math.abs(wrapPi(p.hdg-rh))<1.2){a.loc=true;a.lat='LOC';toast(g,'Localiser captured');}
      const gsDev=Math.atan2(p.pos.y-sp.gearH,Math.max(1,along+300))*R2D-3;
      if(a.loc&&!a.gs&&Math.abs(gsDev)<0.35&&along>800){a.gs=true;a.vert='G/S';toast(g,'Glide path captured. Set the landing flap and check the gear is down');}
      if(a.gs)spdT=vspeeds(sp,p.m).vapp;}
    // lateral
    let bankCmd;
    if(a.lat==='NAV'&&g.nav){const track=Math.atan2(p.vel.x,-p.vel.z);bankCmd=clamp(wrapPi(g.nav.track-track)*1.2,-25*D2R,25*D2R);a.hdg=Math.round(((g.nav.track*R2D)+360)%360);}
    else if(a.lat==='LOC'){const track=Math.atan2(p.vel.x,-p.vel.z);const want=rh-clamp(lat*0.004,-0.45,0.45);bankCmd=clamp(wrapPi(want-track)*2.5,-0.35,0.35);}
    else bankCmd=clamp(wrapPi(a.hdg*D2R-p.hdg)*1.2,-25*D2R,25*D2R);
    const auth=clamp(p.v/75,0.05,1);
    // vertical
    let vsCmd;const agl=p.pos.y-sp.gearH;
    if(a.gs){const ht=Math.max(0,(along+300)*Math.tan(3*D2R));vsCmd=-p.v*Math.sin(3*D2R)+clamp((ht-agl)*0.12,-3,3);
      const flareH=a.flare?a.flareH:Math.max(clamp(sp.span*0.3,12,20),-p.vs*4.5);a.flareH=flareH;
      if(agl<flareH&&!a.flare){if(p.gearPos<0.97||flapsUp(p)){apOff(g,'Autopilot off: no automatic landing without gear and flaps');return null;}a.flare=true;a.vert='FLARE';}
      if(a.flare){vsCmd=-Math.max(0.35,agl*0.2);bankCmd=clamp(-p.bank*2,-0.2,0.2);if(agl<6&&!a.retard){a.retard=true;toast(g,'Retard');}}}
    else{const h=p.pos.y+ELEV,err=a.alt-h;vsCmd=clamp(err*0.08,-10,9);
      // don't climb so steeply the speed bleeds away
      if(ias<spdT-25)vsCmd=Math.min(vsCmd,(ias-(spdT-40))*0.15);
      if(Math.abs(err)<15)a.vert='ALT';else a.vert=err>0?'CLB':'DES';
      // descending fast: give up some of the path to hold the speed, and ask for drag (the speedbrake) if that isn't enough
      // near the airport (VNAV within 30 km of the final approach fix) the path wins and the speedbrake does the slowing
      if(a.vert==='DES'&&a.at){const over=ias-spdT,near=a.vnav&&g.nav&&g.nav.dFaf<30000;if(over>20&&!near)vsCmd=Math.max(vsCmd,vsCmd*clamp(1-(over-20)/40,0.12,1));
        if(over>(near?12:30)&&!IN.spd&&p.spec.spoilers){IN.spd=true;a.autoSpd=true;toast(g,'More drag: speedbrake out');}}
      if(a.autoSpd&&(ias<spdT+8||a.vert!=='DES')){IN.spd=false;a.autoSpd=false;}}
    let dA=a.flare?clamp((vsCmd-p.vs)*3/v,-0.03,0.12):a.gs?clamp((vsCmd-p.vs)*0.6/v,-0.06,0.06):clamp((vsCmd-p.vs)*0.3/v,-0.05,0.05);
    const kp=0.55*clamp(v/90,0.2,1.4);
    let pin=dA*kp/(sp.pitch*auth);
    if(a.flare){const pmax=sp.bicycle?0.02:sp.tailLim*0.55,pmin=sp.bicycle?-0.01:0.035;if(p.pitch>pmax)pin=Math.min(pin,(pmax-p.pitch)*6);
      // touch down on the mains: at least about 2° nose-up (level for the B-52's bicycle gear)
      if(p.pitch<pmin&&agl<4)pin=Math.max(pin,(pmin-p.pitch)*8);
      if(agl>a.flareH+15){a.flare=false;a.vert='G/S';}}
    out.pin=clamp(pin,-1,1);out.rin=clamp((bankCmd-p.bank)*1.5/(sp.roll*auth),-1,1);
    a.fdR=bankCmd;a.fdP=p.pitch+dA*3;
  }
  // autothrottle
  if(a.at||a.retard){
    if(a.retard)out.thr=0;
    else{let th=p.thr+clamp(0.012*(spdT-ias)-0.15*dIas,-0.25,0.25)*dt;
      if(a.vert==='DES'&&ias>spdT-10)th=Math.min(th,0.05+(spdT+8-ias)*0.01);out.thr=clamp(th,0,1);}}
  return out;
}
// After an automatic touchdown: keep the centreline, lower the nose, brake and reverse.
function apRollout(g,dt){const p=g.plane,a=p.ap,e=a.end;if(!a.on||!a.gs||!e)return;
  if(!a.rollout){a.rollout=true;a.vert='ROLLOUT';a.lat='ROLLOUT';a.brake=true;a.revOn=p.spec.rev>0;toast(g,'Rollout: autobrake and reverse thrust');}
  const rx=p.pos.x-e.T.x,rz=p.pos.z-e.T.z,lat=rx*(-e.dz)+rz*e.dx;
  a.steer=clamp(wrapPi(e.hdg*D2R-p.hdg-clamp(lat*0.01,-0.1,0.1))*1.5,-0.12,0.12);
  if(p.v<25)a.revOn=false;
  if(p.v<1.5){a.rollout=false;a.brake=false;apOff(g,'Stopped. Autopilot off');}}
