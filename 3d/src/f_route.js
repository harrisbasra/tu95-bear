
/* ---------- flights between airports ---------- */
// A flight plan picks the departure and arrival runways, a cruise altitude and the fuel, then flies the real thing:
// the departure region, an en-route region that keeps re-centring under the aircraft (so coordinates stay precise),
// and the destination region once you are within 45 km. Cruise can be sped up (Y) or skipped to the descent (K).
// Navigation is great-circle; the autopilot's NAV mode tracks to a final approach fix 18 km out on the arrival runway,
// and VNAV holds the cruise altitude, then descends on a 3° path. Wind is not modelled en route.
const EARTH_R=6371000;
function gcDist(a,b){const φ1=a[0]*D2R,φ2=b[0]*D2R,dφ=φ2-φ1,dλ=(b[1]-a[1])*D2R;const h=Math.sin(dφ/2)**2+Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;return 2*EARTH_R*Math.asin(Math.min(1,Math.sqrt(h)));}
function gcBearing(a,b){const φ1=a[0]*D2R,φ2=b[0]*D2R,dλ=(b[1]-a[1])*D2R;return Math.atan2(Math.sin(dλ)*Math.cos(φ2),Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(dλ));}
function gcPoint(a,brg,d){const φ1=a[0]*D2R,λ1=a[1]*D2R,δ=d/EARTH_R;const φ2=Math.asin(Math.sin(φ1)*Math.cos(δ)+Math.cos(φ1)*Math.sin(δ)*Math.cos(brg));
  const λ2=λ1+Math.atan2(Math.sin(brg)*Math.sin(δ)*Math.cos(φ1),Math.cos(δ)-Math.sin(φ1)*Math.sin(φ2));return[φ2*R2D,((λ2*R2D+540)%360)-180];}
function isaMSL(h){return isa(h-ELEV);}
// steady cruise: thrust = weight / (L/D); fuel from thrust-specific (jets) or power-specific (turboprops) consumption
function cruiseTas(sp,alt){return sp.cruise.mach*isaMSL(alt).a;}
function burnPerKm(sp,m,alt){const v=cruiseTas(sp,alt),M=sp.cruise.mach,T=m*G/sp.cruise.ld;let ff;
  if(sp.engType==='turboprop')ff=6.9e-8*T*v/0.85;else ff=(sp.engType==='lowbypass'?1.6e-5:1.0e-5)*(1+0.6*M)*T;return ff/v*1000;}
const ENDS_OF=ap=>ap.rwys.flatMap(r=>r.ends.map((e,i)=>{const o=r.ends[1-i];return{n:e.n,lat:e.lat,lon:e.lon,hdg:gcBearing([e.lat,e.lon],[o.lat,o.lon]),len:gcDist([e.lat,e.lon],[o.lat,o.lon])-(e.disp||0),ils:(r.ils||[]).includes(e.n)};}));
// the end whose direction best matches a heading (no wind, so the most direct runway), preferring ILS and length
function pickEnd(ap,brg){let best=null;for(const e of ENDS_OF(ap)){const s=Math.cos(e.hdg-brg)*2+(e.ils?0.4:0)+e.len/6000;if(!best||s>best.s)best=Object.assign({s},e);}return best;}
function planFlight(sp,depI,destI,opts){opts=opts||{};const dep=AIRPORT_BY_ICAO[depI],dest=AIRPORT_BY_ICAO[destI];
  const dist=gcDist(dep.ref,dest.ref),out=gcBearing(dep.ref,dest.ref),inb=gcBearing(dest.ref,dep.ref)+Math.PI;
  const depEnd=pickEnd(dep,out),arrEnd=pickEnd(dest,inb);
  const faf=gcPoint([arrEnd.lat,arrEnd.lon],arrEnd.hdg+Math.PI,18000);
  // waypoints: a local flight first flies 30 km out on the departure heading, then turns for the final approach fix
  const wps=depI===destI?[gcPoint([depEnd.lat,depEnd.lon],depEnd.hdg,30000+depEnd.len),faf]:[faf];
  // a whole flight level (thousands of feet above sea level), lower on short hops
  const alt=Math.round((clamp(dist*0.035,3000,sp.cruise.alt)+Math.max(dep.elev,dest.elev))/FT/1000)*1000*FT;
  const tas=cruiseTas(sp,alt),hours=dist/tas/3600+0.35;
  let payload=Math.round(sp.payload*(opts.load===undefined?0.6:opts.load));
  const tripM=(sp.oew+payload+sp.fuelCap*0.3);let trip=burnPerKm(sp,tripM,alt)*dist/1000*1.06+600;const reserve=burnPerKm(sp,tripM,alt)*tas*3.6*0.75; // 45 minutes
  let fuel=Math.round(trip+reserve);let range=true;
  if(fuel>sp.fuelCap){range=false;fuel=sp.fuelCap;}
  if(sp.oew+payload+fuel>sp.mtow){payload=Math.max(0,Math.round(sp.mtow-sp.oew-fuel));}
  return{dep:depI,dest:destI,depEnd:depEnd.n,arrEnd:arrEnd.n,faf,wps,dist,alt,tas,hours,payload,fuel,trip:Math.round(trip),range,sky:opts.sky||'day',start:opts.start||'runway',spec:sp.id,
    pax:sp.pax?Math.round(sp.pax*payload/sp.payload):0};}
let PLAN=null;
function routeMission(P){const dep=AIRPORT_BY_ICAO[P.dep],dest=AIRPORT_BY_ICAO[P.dest];const appr=P.start==='approach';
  return{key:'route',route:P,name:`${dep.city} to ${dest.city}`,sky:P.sky,region:appr?P.dest:P.dep,
    summary:appr?`Final approach to runway ${P.arrEnd} at ${dest.name}, ${dest.city}. Land and stop.`:`${dep.name} to ${dest.name}: ${Math.round(P.dist/1000).toLocaleString('en-GB')} km. Take off from runway ${P.depEnd}, engage NAV (N) and VNAV (J), and land on ${P.arrEnd}.`,
    start:appr?{air:P.arrEnd,dist:18000}:{rw:P.depEnd,at:60},dest:appr?P.arrEnd:null};}
// the en-route region: just the ground under the aircraft, re-centred every 25 km
function enrouteRegion(lat,lon,P){const dep=AIRPORT_BY_ICAO[P.dep],dest=AIRPORT_BY_ICAO[P.dest];const f=clamp(gcDist(dep.ref,[lat,lon])/Math.max(1,P.dist),0,1);
  return{icao:'ENRT',name:'En route',city:'',country:'',elev:Math.round(lerp(dep.elev,dest.elev,f)),ref:[lat,lon],ground:f<0.5?dep.ground:dest.ground,haze:f<0.5?dep.haze:dest.haze,rwys:[],landmarks:[],districts:[]};}
// rebuild the world for a new region and carry the aircraft across in geographic coordinates
function switchRegion(g,ap){const p=g.plane;const ll=toLatLon(p.pos.x,p.pos.z),msl=p.pos.y+ELEV;
  scene.remove(g.A.g);for(const f of g.fx)scene.remove(f.s);g.fx=[];for(const r of g.rings)scene.remove(r.mesh);g.rings=[];
  setRegion(ap);REGION_OSM=window.TU95_OSM&&TU95_OSM[ap.icao]||null;buildWorld();applySky(g.M.sky);
  const q=geo(ll.lat,ll.lon);p.pos.x=q.x;p.pos.z=q.z;p.pos.y=msl-ELEV;scene.add(g.A.g);g.cam.init=false;finishStep(p);
  if(ap.icao===g.M.route.dest){g.M.dest=g.M.route.arrEnd;toast(g,`${ap.name}: runway ${g.M.dest} in use`);}}
function routeUpdate(g,dt){const P=g.M.route,p=g.plane;if(!P)return;
  const ll=toLatLon(p.pos.x,p.pos.z),here=[ll.lat,ll.lon],dest=AIRPORT_BY_ICAO[P.dest],dep=AIRPORT_BY_ICAO[P.dep];
  const wps=P.wps||[P.faf];let wi=g.wi||0;while(wi<wps.length&&gcDist(here,wps[wi])<3000)wi++;g.wi=wi;
  const ae=ENDS_OF(dest).find(e=>e.n===P.arrEnd),thrP=[ae.lat,ae.lon];
  const dFaf=gcDist(here,P.faf),dDest=gcDist(here,dest.ref),dDep=gcDist(here,dep.ref),msl=p.pos.y+ELEV;
  const passedFaf=wi>=wps.length,target=passedFaf?thrP:wps[wi];
  // distance still to fly along the legs, and the 3° path down it to the threshold (never below 600 m, about 2,000 ft, before the fix)
  let rest=passedFaf?gcDist(here,thrP):gcDist(here,wps[wi]);for(let i=wi;i<wps.length-1;i++)rest+=gcDist(wps[i],wps[i+1]);if(!passedFaf)rest+=18000;
  const dPath=rest,altT=Math.min(P.alt,dest.elev+Math.max(passedFaf?0:600,dPath*Math.tan(3*D2R)));
  const kt250=250*KT,iasCr=cruiseTas(p.spec,P.alt)*Math.sqrt(isaMSL(P.alt).rho/1.225)*3.6;
  const spdT=wi>=wps.length-1&&dFaf<25000?Math.min(210*KT,p.spec.vmoKmh):msl<3050?kt250:Math.min(msl>P.alt-600?iasCr:290*KT,p.spec.vmoKmh*0.95);
  g.nav={track:gcBearing(here,target),dist:dDest,dFaf,altT,spdT,passed:passedFaf,target,remaining:dPath};
  // region changes
  if(!g.regionBusy){
    if(REGION.icao!==P.dest&&dDest<45000){g.regionBusy=true;if(g.timeScale>1){g.timeScale=1;toast(g,'Time back to normal for the arrival');}switchRegion(g,dest);g.regionBusy=false;}
    else if(REGION.icao===P.dep&&dDep>55000&&p.agl>1200){switchRegion(g,enrouteRegion(ll.lat,ll.lon,P));}
    else if(REGION.icao==='ENRT'&&Math.hypot(p.pos.x,p.pos.z)>25000){switchRegion(g,enrouteRegion(ll.lat,ll.lon,P));}}
  // keep time acceleration for the safe part of the cruise
  if(g.timeScale>1&&(p.onGround||p.agl<900||!p.ap.on||warnings(g).length)){g.timeScale=1;toast(g,'Time back to normal');}}
function cycleTime(g){if(!g.M.route){toast(g,'Time acceleration is for flights between airports');return;}const p=g.plane;
  if(p.onGround||p.agl<900||!p.ap.on){toast(g,'Engage the autopilot above 900 m to speed up time');return;}
  const s=[1,2,4,8,16,32];g.timeScale=s[(s.indexOf(g.timeScale||1)+1)%s.length];toast(g,g.timeScale>1?`Time ×${g.timeScale}`:'Time ×1');}
function skipToDescent(g){const P=g.M.route,p=g.plane;if(!P){toast(g,'Skipping ahead is for flights between airports');return;}
  if(REGION.icao===P.dest){toast(g,'You are already at the destination');return;}if(p.onGround){toast(g,'Take off first');return;}
  const dest=AIRPORT_BY_ICAO[P.dest];const ae=ENDS_OF(dest).find(e=>e.n===P.arrEnd);
  // a point 60 km before the final approach fix, on the inbound course, at the 3° descent path's height
  const back=gcBearing(P.faf,AIRPORT_BY_ICAO[P.dep].ref);const pt=gcPoint(P.faf,back,60000);const thr=[ae.lat,ae.lon];
  const ll=toLatLon(p.pos.x,p.pos.z);const skipped=Math.max(0,gcDist([ll.lat,ll.lon],pt));
  const used=burnPerKm(p.spec,p.m,P.alt)*skipped/1000;p.fuelKg=Math.max(0,p.fuelKg-used);p.fuel=p.fuelKg/p.spec.fuelCap;g.time+=skipped/Math.max(100,cruiseTas(p.spec,P.alt));g.skippedKm=(g.skippedKm||0)+skipped/1000;
  scene.remove(g.A.g);setRegion(dest);REGION_OSM=window.TU95_OSM&&TU95_OSM[dest.icao]||null;for(const f of g.fx)scene.remove(f.s);g.fx=[];buildWorld();applySky(g.M.sky);scene.add(g.A.g);
  const q=geo(pt[0],pt[1]);const hdg=gcBearing(pt,P.faf)*R2D;const alt=(60000+18000)*Math.tan(3*D2R);
  p.gearDown=false;p.gearPos=0;p.flapIdx=0;p.flapPos=0;placeInAir(p,q.x,q.z,alt,(hdg+360)%360,250*KT,0.4,0);
  p.ap.on=true;p.ap.at=true;p.ap.lat='NAV';p.ap.vnav=true;apSync(p);p.ap.spd=250*KT;g.timeScale=1;g.M.dest=P.arrEnd;g.cam.init=false;finishStep(p);
  toast(g,`Skipped ${Math.round(skipped/1000).toLocaleString('en-GB')} km and burned ${Math.round(used).toLocaleString('en-GB')} kg of fuel. Descending to ${dest.city}`);}
