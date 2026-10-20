(() => {
'use strict';
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const D2R=Math.PI/180, R2D=180/Math.PI;
function hash(n){const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);}
function hash2(x,y){return hash(x*12.9898+y*78.233);}
function vnoise2(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  const a=hash2(ix,iy),b=hash2(ix+1,iy),c=hash2(ix,iy+1),d=hash2(ix+1,iy+1);return lerp(lerp(a,b,sx),lerp(c,d,sx),sy);}
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const FONT='"PT Sans Narrow","Arial Narrow","Roboto Condensed",sans-serif';
const DISPLAY='"Russo One","Arial Black",sans-serif';
const G=9.81;

/* ---------- geography: Lahore, origin at the airport reference point ---------- */
const LAT0=31.5216, LON0=74.4036, ELEV=217;
const MLAT=111320, MLON=111320*Math.cos(LAT0*D2R);
function geo(lat,lon){return{x:(lon-LON0)*MLON,z:-(lat-LAT0)*MLAT};}
// Runway thresholds from published data (OurAirports / AIP-derived)
const RWY_DATA=[
  {id:'18L/36R',w:46,surf:'concrete',ils:true,ends:[{name:'36R',lat:31.5065,lon:74.4043},{name:'18L',lat:31.5366,lon:74.4048}]},
  {id:'18R/36L',w:46,surf:'asphalt',ils:false,ends:[{name:'36L',lat:31.5092,lon:74.4024},{name:'18R',lat:31.5339,lon:74.4028}]}
];
const RWYS=RWY_DATA.map(r=>{
  const A=geo(r.ends[0].lat,r.ends[0].lon),B=geo(r.ends[1].lat,r.ends[1].lon);
  const len=Math.hypot(B.x-A.x,B.z-A.z),dx=(B.x-A.x)/len,dz=(B.z-A.z)/len;
  const rw={id:r.id,w:r.w,surf:r.surf,ils:r.ils,A,B,len,dx,dz,ends:[]};
  rw.ends.push({name:r.ends[0].name,rw,T:A,dx,dz,hdg:(Math.atan2(dx,-dz)*R2D+360)%360,ils:r.ils});
  rw.ends.push({name:r.ends[1].name,rw,T:B,dx:-dx,dz:-dz,hdg:(Math.atan2(-dx,dz)*R2D+360)%360,ils:r.ils});
  return rw;});
const ENDS=RWYS.flatMap(r=>r.ends);
const END=n=>ENDS.find(e=>e.name===n);
function rwLocal(rw,x,z){const rx=x-rw.A.x,rz=z-rw.A.z;return{along:rx*rw.dx+rz*rw.dz,cross:-rx*rw.dz+rz*rw.dx};}
function onRunway(x,z,margin){margin=margin||0;for(const rw of RWYS){const l=rwLocal(rw,x,z);if(l.along>=-margin&&l.along<=rw.len+margin&&Math.abs(l.cross)<=rw.w/2+margin)return rw;}return null;}
function onPavement(x,z){if(onRunway(x,z,8))return true;for(const p of PAVE){if(x>=p.x0&&x<=p.x1&&z>=p.z0&&z<=p.z1)return true;}return false;}
const PAVE=[]; // taxiways and aprons, filled by the world builder
const LANDMARKS={
  minar:{name:'Minar-e-Pakistan',...geo(31.5925,74.3095)},
  badshahi:{name:'Badshahi Mosque',...geo(31.5879,74.3101)},
  oldcity:geo(31.583,74.315)
};

/* ---------- progress ---------- */
const STORE='tu95-bear-3d-v1';
let progress={stars:[],plane:'tu95',assist:true,landAssist:true,invert:false,sound:true,hq:true,mission:0};
try{const s=JSON.parse(localStorage.getItem(STORE)||'null');if(s&&typeof s==='object')progress=Object.assign(progress,s);}catch(e){}
function save(){try{localStorage.setItem(STORE,JSON.stringify(progress));}catch(e){}}

/* ---------- aircraft ---------- */
// Physics numbers match the 2D game; geometry is in metres, x forward, y up, z to the right.
const AIRCRAFT=[
 {id:'tu95',name:'Tu-95MS',nick:'Bear',role:'Turboprop strategic bomber',
  feel:'Steady and honest. A good all-rounder.',
  m:80000,S:290,T:290000,cd0:0.024,k:0.045,cla:5.2,cl0:0.15,clmax:1.25,flapCl:0.5,flapClmax:0.55,inc:0,pitch:0.36,roll:0.55,prop:true,engines:4,flapMax:470,vne:925,
  gearH:5.1,mainX:-1,noseX:15,tailPts:[[-22.2,-0.9]],cockpit:[18.2,2.0],len:47,
  model:{color:'#c7cccc',accent:'#9aa1a2',insignia:'red',
   fus:[[23.6,0.15,0.15,0.05],[22.8,0.9,-0.6,0.8],[20.8,1.42,-1.0,1.25],[18.6,1.65,-1.35,1.45],[17.4,2.3,-1.5,1.5],[15,2.4,-1.6,1.52],[13.6,1.8,-1.62,1.55],[2,1.78,-1.62,1.55],[-12,1.72,-1.55,1.45],[-18,1.4,-1.15,1.05],[-21,1.0,-0.8,0.7],[-23.1,0.55,-0.5,0.4],[-23.5,0.1,0,0.06]],
   glass:[[23.6,22.0,'nose'],[17.6,15.3,'cockpit']],
   wing:{x:6,y:-0.3,z:1.5,chord:9.5,span:25,sweep:35,tip:4,dihedral:-2,t:0.7},
   fin:{x:-12.2,y:1.6,chord:10.4,h:10,sweep:38,tip:2.8},
   stab:{x:-15.4,y:1.0,chord:6.3,span:7.2,sweep:35,tip:2.5,dihedral:0},
   engines:[{type:'prop',s:0.3,len:11,r:0.8,dy:-0.6,blades:4,contra:true,pr:2.8},{type:'prop',s:0.6,len:9.5,r:0.7,dy:-0.5,blades:4,contra:true,pr:2.8}],
   gear:{mains:[{x:-1,z:8.4,w:2}],noseX:15,mainOnNacelle:true}}},
 {id:'c130',name:'C-130J Hercules',nick:'Super Hercules',role:'Turboprop tactical transport',
  feel:'The easiest to fly. Slow, forgiving and lands almost anywhere.',
  m:40000,S:215,T:185000,cd0:0.03,k:0.04,cla:5.0,cl0:0.2,clmax:1.4,flapCl:0.45,flapClmax:0.55,inc:0,pitch:0.45,roll:0.8,prop:true,engines:4,flapMax:360,vne:670,
  gearH:3.22,mainX:-0.9,noseX:10.6,tailPts:[[-15.2,0.9],[-12,0.1]],cockpit:[12.4,1.7],len:30,
  model:{color:'#8f979a',accent:'#6f777a',insignia:'us',
   fus:[[15.0,-0.4,-0.4,0.06],[14.6,0.6,-1.2,1.0],[13.6,1.35,-1.6,1.6],[12.4,1.95,-1.9,2.0],[10.5,2.35,-2.0,2.15],[4,2.45,-2.05,2.2],[-5,2.4,-1.95,2.2],[-8,2.3,-1.2,2.1],[-12,2.1,0.1,1.7],[-14,1.9,0.6,1.2],[-16,1.6,1.0,0.5],[-16.3,1.35,1.2,0.1]],
   glass:[[13.6,10.6,'cockpit']],
   wing:{x:3.4,y:2.3,z:2.1,chord:5,span:20.2,sweep:3,tip:2.6,dihedral:2.5,t:0.6},
   fin:{x:-8.5,y:2.2,chord:7.5,h:7.8,sweep:32,tip:2.6},
   stab:{x:-11.8,y:1.8,chord:4.0,span:8.0,sweep:12,tip:2.0,dihedral:0},
   engines:[{type:'prop',s:0.17,len:7.5,r:0.65,dy:-0.55,blades:6,pr:2.05},{type:'prop',s:0.45,len:7.2,r:0.62,dy:-0.5,blades:6,pr:2.05}],
   sponson:{x0:-5.2,x1:4,y0:-2.3,y1:-0.6,z:2.35},
   gear:{mains:[{x:-0.9,z:2.0,w:2,tandem:1.5}],noseX:10.6}}},
 {id:'c17',name:'C-17A Globemaster III',nick:'Globemaster',role:'Jet strategic airlifter',
  feel:'Big but gentle. Lots of power and good brakes.',
  m:120000,S:520,T:420000,cd0:0.022,k:0.045,cla:5.2,cl0:0.2,clmax:1.35,flapCl:0.55,flapClmax:0.75,inc:0,pitch:0.38,roll:0.6,prop:false,engines:4,flapMax:420,vne:830,
  gearH:4.85,mainX:-5,noseX:20,tailPts:[[-25.5,1.0],[-20,-0.6]],cockpit:[23.2,2.6],len:53,
  model:{color:'#7f878d',accent:'#666e74',insignia:'us',
   fus:[[26.6,-0.6,-0.6,0.06],[26.1,0.9,-1.3,1.4],[24.7,2.2,-2.0,2.4],[22.9,3.0,-2.6,2.9],[21,3.55,-3.0,3.1],[17,3.42,-3.3,3.2],[5,3.28,-3.32,3.2],[-10,3.2,-3.2,3.15],[-14,3.1,-2.4,3.0],[-20,2.8,-0.6,2.4],[-24,2.5,0.5,1.4],[-26.6,1.8,1.4,0.2]],
   glass:[[24.7,21.5,'cockpit']],
   wing:{x:5,y:3.0,z:3.1,chord:10,span:25.8,sweep:25,tip:3,dihedral:-3,t:0.9,winglet:3},
   fin:{x:-14.5,y:3.0,chord:11,h:10.6,sweep:38,tip:3.8},
   stab:{x:-21.8,y:13.6,chord:5.5,span:10,sweep:30,tip:2.2,dihedral:-3},
   engines:[{type:'jet',s:0.2,len:9.5,r:1.25,dy:-2.0,fwd:4.5},{type:'jet',s:0.5,len:9.3,r:1.2,dy:-1.9,fwd:4.2}],
   sponson:{x0:-11,x1:4.5,y0:-3.9,y1:-1.6,z:3.35},
   gear:{mains:[{x:-5,z:2.8,w:2,tandem:1.5}],noseX:20}}},
 {id:'b52',name:'B-52H Stratofortress',nick:'Stratofortress',role:'Jet strategic bomber',
  feel:'Takes off and lands almost level on its bicycle gear. Keep the nose flat at touchdown.',
  m:150000,S:389,T:510000,cd0:0.021,k:0.04,cla:5.6,cl0:0.2,clmax:1.3,flapCl:0.5,flapClmax:0.5,inc:0.1,pitch:0.28,roll:0.45,prop:false,engines:8,flapMax:420,vne:1000,bicycle:true,
  gearH:4.15,mainX:1,noseX:8.5,tailPts:[[-24,-0.2]],cockpit:[21.3,1.8],len:48.5,
  model:{color:'#6f7a75',accent:'#56615c',insignia:'us',
   fus:[[24.3,-0.2,-0.2,0.06],[23.9,0.8,-0.7,1.0],[22.7,1.5,-1.15,1.4],[21,2.05,-1.5,1.6],[19.5,2.25,-1.8,1.65],[14,2.2,-1.95,1.7],[0,2.1,-2.0,1.7],[-12,2.0,-1.85,1.6],[-20,1.8,-1.0,1.1],[-23.5,1.2,-0.4,0.6],[-24.4,0.6,0.0,0.1]],
   glass:[[22.7,20.0,'cockpit']],
   wing:{x:7,y:1.6,z:1.7,chord:13,span:28.4,sweep:35,tip:4,dihedral:-3,t:1.0},
   fin:{x:-12.5,y:2.0,chord:11.8,h:9.6,sweep:40,tip:3},
   stab:{x:-17.5,y:1.0,chord:6.2,span:8.5,sweep:35,tip:2.5,dihedral:0},
   engines:[{type:'jet',s:0.24,len:9,r:0.68,dy:-1.7,fwd:3.8,twin:true},{type:'jet',s:0.52,len:8.8,r:0.66,dy:-1.6,fwd:3.6,twin:true}],
   gear:{bicycle:[{x:8.5},{x:-6}],outrigger:0.78}}},
 {id:'b1b',name:'B-1B Lancer',nick:'Bone',role:'Supersonic swing-wing bomber',
  feel:'Fast and lively. Rotate gently: the tail sits close to the runway.',
  m:150000,S:341,T:420000,ab:0.65,cd0:0.019,k:0.05,cla:5.0,cl0:0.2,clmax:1.45,flapCl:0.55,flapClmax:0.7,inc:0.04,pitch:0.45,roll:0.8,prop:false,engines:4,flapMax:420,vne:1500,supersonic:true,
  swing:{min:0.26,max:1.18},gearH:4.5,mainX:-2.5,noseX:13.5,tailPts:[[-21.5,-0.4],[-15.5,-2.6]],cockpit:[15.4,1.55],len:44.5,
  model:{color:'#596166',accent:'#474e52',insignia:'us',
   fus:[[22.4,-0.1,-0.1,0.06],[21.5,0.35,-0.3,0.4],[18,1.0,-0.6,0.9],[16.4,1.45,-0.9,1.2],[15.2,1.78,-1.1,1.4],[13.5,1.8,-1.2,1.6],[8,2.0,-1.4,2.2],[0,2.15,-1.5,2.6],[-10,2.0,-1.35,2.4],[-17,1.6,-1.0,1.4],[-21.5,0.9,-0.4,0.7],[-22.5,0.3,0.1,0.15]],
   glass:[[16.4,13.9,'cockpit']],
   glove:{x:10,y:0.6,z:2.4,chord:13,span:4.4,tipx:2.5,tip:6.5,t:0.8},
   swingWing:{pivotX:2.2,y:0.6,z:6.8,chord:6.2,span:13.7,tip:2.2,t:0.5},
   fin:{x:-10.5,y:2.0,chord:11.5,h:6.9,sweep:45,tip:2.8},
   stab:{x:-14.8,y:1.3,chord:6.0,span:6.8,sweep:40,tip:2.4,dihedral:0},
   bodyEngines:{x0:-1.5,x1:-14.6,y:-2.2,h:1.8,z:2.2,w:2.6,nozzles:[[-15,1.55],[-15,2.85]]},
   gear:{mains:[{x:-2.5,z:2.2,w:2}],noseX:13.5}}},
 {id:'tu160',name:'Tu-160',nick:'Blackjack',role:'Supersonic swing-wing bomber',
  feel:'The most demanding. Huge power, but a tight tail angle and a fast landing.',
  m:180000,S:380,T:520000,ab:0.7,cd0:0.017,k:0.05,cla:5.0,cl0:0.2,clmax:1.4,flapCl:0.55,flapClmax:0.7,inc:0.05,pitch:0.42,roll:0.7,prop:false,engines:4,flapMax:420,vne:2200,supersonic:true,
  swing:{min:0.35,max:1.13},gearH:4.9,mainX:-2.5,noseX:18,tailPts:[[-26.4,0],[-20,-2.5]],cockpit:[19.2,1.75],len:54,
  model:{color:'#eceeed',accent:'#c9cfd0',insignia:'red',
   fus:[[27.3,0,0,0.06],[26.2,0.55,-0.2,0.35],[22,1.35,-0.6,1.0],[19.8,1.82,-0.9,1.3],[18.2,2.06,-1.0,1.5],[16.3,2.02,-1.1,1.7],[8,2.3,-1.4,2.3],[-4,2.42,-1.6,2.6],[-14,2.22,-1.3,2.3],[-21,1.8,-0.6,1.5],[-25.5,1.1,-0.1,0.8],[-26.9,0.6,0.2,0.2]],
   glass:[[19.9,16.8,'cockpit']],
   glove:{x:13,y:0.9,z:2.5,chord:16,span:7.5,tipx:3.5,tip:7,t:0.9},
   swingWing:{pivotX:3.5,y:0.9,z:10,chord:7,span:15,tip:2.3,t:0.55},
   fin:{x:-13,y:2.25,chord:13.6,h:9.6,sweep:45,tip:3.7},
   stab:{x:-17.6,y:3.2,chord:6.8,span:7.5,sweep:40,tip:2.6,dihedral:0},
   bodyEngines:{x0:-1.6,x1:-20,y:-2.2,h:1.9,z:5.0,w:3.2,nozzles:[[-20.4,4.2],[-20.4,5.8]]},
   gear:{mains:[{x:-2.5,z:3.0,w:3}],noseX:18}}}
];
const AIRCRAFT_BY_ID={};
for(const a of AIRCRAFT){
  AIRCRAFT_BY_ID[a.id]=a;
  let lim=0.5;for(const t of a.tailPts){if(t[0]<a.mainX){lim=Math.min(lim,Math.atan2(t[1]+a.gearH,a.mainX-t[0]));}}
  a.tailLim=lim*0.97;
  const Wl=a.m/a.S,vAt=cl=>Math.sqrt(2*G*Wl/(1.225*cl))*3.6;
  a.rotKmh=Math.round(vAt(a.cl0+0.45*a.flapCl+a.cla*((a.bicycle?0:0.1)+a.inc))/10)*10;
  a.appKmh=Math.round(vAt(a.cl0+a.flapCl+a.cla*(0.07+a.inc))*1.15/10)*10;
}
function currentSpec(){return AIRCRAFT_BY_ID[progress.plane]||AIRCRAFT[0];}
