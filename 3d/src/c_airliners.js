
/* ---------- airliners ---------- */
// Seven airliner families, one representative variant each. Weights, wing areas, thrust, spans, lengths, wheelbases,
// gear tracks and speeds are published figures (Boeing and Airbus airport planning documents, EASA/FAA type
// certificate data). Planform details (chords, sweep of the trailing edge, fin and tailplane sizes, nacelle
// positions) are taken from published three-view drawings and are approximate.
// No airline liveries or manufacturer logos: every airliner wears the game's own invented house colours.
// Geometry: metres, x forward, y up, z right, origin near the centre of gravity, y=0 on the fuselage centreline.
const BOEING_FLAPS=(det,vfe)=>[{n:'Up',pos:0}].concat(det.map((d,i)=>({n:String(d[0]),pos:d[1],vfe:vfe[i]*KT})));
const AIRBUS_FLAPS=vfe=>[{n:'Up',pos:0},{n:'1',pos:0.12,vfe:vfe[0]*KT},{n:'1+F',pos:0.3,vfe:vfe[1]*KT},{n:'2',pos:0.5,vfe:vfe[2]*KT},{n:'3',pos:0.72,vfe:vfe[3]*KT},{n:'Full',pos:1,vfe:vfe[4]*KT}];
const AL_COMMON={cat:'airliner',prop:false,engType:'turbofan',cd0:0.019,cl0:0.22,clmax:1.38,inc:0.035,spoilers:true,rev:0.35,gearT:9,flapRate:0.09,spool:0.32,oswald:0.82,brakeMu:0.42};
const AIRLINERS=[
 {id:'b738',name:'737-800',family:'Boeing 737',nick:'Next Generation',role:'Short and medium-haul twin',maker:'boeing',cockpitType:'boeing',
  feel:'Light and responsive. A good first airliner, but keep an eye on the speed: it doesn’t slow down easily.',
  cruise:{alt:11000,ld:17.5},oew:41413,mtow:79016,mlw:66361,fuelCap:20894,payload:20000,pax:162,S:124.6,span:35.79,len:39.47,T:2*117000,engines:2,
  vrefKt:151,vrefFlap:7,vmo:340,mmo:0.82,mdd:0.83,pitch:0.17,roll:0.42,rotRate:0.052,tailStrike:11,
  flaps:BOEING_FLAPS([[1,0.1],[2,0.15],[5,0.3],[10,0.42],[15,0.52],[25,0.68],[30,0.85],[40,1]],[250,250,250,210,200,190,175,162]),toFlap:3,ldgFlap:7,
  gearH:3.35,mainX:-1.5,noseX:14.1,
  geo:{nose:18.7,D:3.76,H:4.01,noseL:5.6,tailL:10.4,cyNose:-0.25,
   wing:{y:-1.05,LE:27,dih:6,b:17.15,r0:1.85,cr:7.0,zk:0.33,ck:4.4,ct:1.25,t:0.13,tip:'winglet',tipH:2.44},
   eng:[{z:4.9,len:4.3,d:1.9,fwd:2.7,drop:0.55,flat:0.88}],
   fin:{cr:6.0,ct:2.0,h:6.0,sweep:35},stab:{b:7.18,cr:3.6,ct:1.2,sweep:30,dih:7,y:0.6},
   gear:{nose:2,noseR:0.39,mains:[{x:-1.5,z:2.86,bogie:'2',r:0.56}]},
   doors:[0.08,0.92],exits:[0.43,0.48],ftf:4,cockpitEye:[2.6,5.0]}},
 {id:'a320',name:'A320',family:'Airbus A320',nick:'ceo with sharklets',role:'Short and medium-haul twin',maker:'airbus',cockpitType:'airbus',
  feel:'Fly-by-wire and very stable. The sidestick and autothrust make long approaches easy.',
  cruise:{alt:11000,ld:17.5},oew:42600,mtow:78000,mlw:66000,fuelCap:19000,payload:19900,pax:150,S:122.6,span:35.8,len:37.57,T:2*120100,engines:2,
  vrefKt:133,vmo:350,mmo:0.82,mdd:0.83,pitch:0.17,roll:0.44,rotRate:0.052,tailStrike:11.7,
  flaps:AIRBUS_FLAPS([230,215,200,185,177]),toFlap:2,ldgFlap:5,
  gearH:3.9,mainX:-1.5,noseX:11.14,
  geo:{nose:16.1,D:3.95,H:4.14,noseL:5.4,tailL:10.6,cyNose:-0.25,
   wing:{y:-1.15,LE:27,dih:5.1,b:17.05,r0:1.95,cr:7.1,zk:0.35,ck:4.6,ct:1.5,t:0.13,tip:'sharklet',tipH:2.43},
   eng:[{z:5.75,len:4.4,d:2.1,fwd:2.6,drop:0.75}],
   fin:{cr:6.3,ct:2.5,h:6.0,sweep:34},stab:{b:6.2,cr:3.6,ct:1.3,sweep:29,dih:6,y:0.6},
   gear:{nose:2,noseR:0.38,mains:[{x:-1.5,z:3.8,bogie:'2',r:0.57}]},
   doors:[0.1,0.9],exits:[0.45,0.5],ftf:3,cockpitEye:[2.5,4.6]}},
 {id:'b789',name:'787-9',family:'Boeing 787',nick:'Dreamliner',role:'Long-haul twin',maker:'boeing',cockpitType:'boeing',
  feel:'Smooth and efficient, with a long flexible wing. Rotate gently: the tail is closer to the runway than it looks.',
  cruise:{alt:11900,ld:17.5},oew:128850,mtow:254011,mlw:192777,fuelCap:101000,payload:52600,pax:296,S:377,span:60.12,len:62.81,T:2*330000,engines:2,
  vrefKt:150,vrefFlap:8,vmo:350,mmo:0.9,mdd:0.88,pitch:0.15,roll:0.32,rotRate:0.05,tailStrike:9.6,
  flaps:BOEING_FLAPS([[1,0.12],[5,0.3],[15,0.5],[17,0.55],[18,0.58],[20,0.62],[25,0.8],[30,1]],[255,235,215,205,200,195,185,175]),toFlap:3,ldgFlap:8,
  gearH:5.5,mainX:-2,noseX:23.86,
  geo:{nose:29.4,D:5.77,H:5.94,noseL:8.2,tailL:15.5,cyNose:-0.3,
   wing:{y:-1.6,LE:34,dih:6.5,b:30.06,r0:2.8,cr:11.2,zk:0.32,ck:7.0,ct:1.9,t:0.12,tip:'raked',rake:3.4},
   eng:[{z:9.7,len:6.5,d:3.4,fwd:3.9,drop:0.6}],
   fin:{cr:9.6,ct:3.2,h:9.4,sweep:38},stab:{b:9.7,cr:5.8,ct:1.8,sweep:34,dih:7,y:0.9},
   gear:{nose:2,noseR:0.5,mains:[{x:-2,z:4.9,bogie:'2x2',r:0.65}]},
   doors:[0.08,0.32,0.62,0.9],ftf:4,cockpitEye:[2.6,5.9],windowScale:1.3}},
 {id:'b77w',name:'777-300ER',family:'Boeing 777',nick:'Triple Seven',role:'Long-haul twin',maker:'boeing',cockpitType:'boeing',
  feel:'Huge, heavy and very powerful. Lots of runway needed, and a low tail-strike angle: hold about 6° at lift-off.',
  cruise:{alt:10700,ld:17.5},oew:167829,mtow:351534,mlw:251290,fuelCap:145500,payload:69850,pax:396,S:436.8,span:64.8,len:73.86,T:2*513000,engines:2,
  vrefKt:152,vrefFlap:6,vmo:330,mmo:0.89,mdd:0.87,pitch:0.14,roll:0.3,rotRate:0.045,tailStrike:8.6,
  flaps:BOEING_FLAPS([[1,0.12],[5,0.3],[15,0.5],[20,0.62],[25,0.8],[30,1]],[255,235,215,195,185,170]),toFlap:3,ldgFlap:6,
  gearH:5.8,mainX:-2,noseX:29.22,
  geo:{nose:35.2,D:6.2,H:6.2,noseL:8.6,tailL:17.5,cyNose:-0.3,
   wing:{y:-1.75,LE:34,dih:6,b:32.4,r0:2.95,cr:13.0,zk:0.33,ck:8.0,ct:2.1,t:0.12,tip:'raked',rake:3.2},
   eng:[{z:9.6,len:7.3,d:3.9,fwd:4.4,drop:0.55}],
   fin:{cr:10.6,ct:3.8,h:9.8,sweep:37},stab:{b:10.7,cr:6.5,ct:2.2,sweep:32,dih:7,y:1.0},
   gear:{nose:2,noseR:0.55,mains:[{x:-2,z:5.49,bogie:'3x2',r:0.66}]},
   doors:[0.07,0.22,0.52,0.7,0.9],ftf:4,cockpitEye:[2.9,6.3]}},
 {id:'a359',name:'A350-900',family:'Airbus A350',nick:'XWB',role:'Long-haul twin',maker:'airbus',cockpitType:'airbus',
  feel:'Modern, quiet and easy to handle, with a curved wingtip and plenty of thrust.',
  cruise:{alt:11900,ld:17.5},oew:142400,mtow:280000,mlw:207000,fuelCap:110500,payload:53300,pax:325,S:442,span:64.75,len:66.8,T:2*374500,engines:2,
  vrefKt:135,vmo:340,mmo:0.89,mdd:0.88,pitch:0.15,roll:0.33,rotRate:0.05,tailStrike:11.2,
  flaps:AIRBUS_FLAPS([255,220,212,195,186]),toFlap:2,ldgFlap:5,
  gearH:5.6,mainX:-2,noseX:26.67,
  geo:{nose:32.4,D:5.96,H:6.09,noseL:8.0,tailL:16.0,cyNose:-0.3,
   wing:{y:-1.7,LE:33,dih:6,b:30.6,r0:2.9,cr:12.8,zk:0.33,ck:7.6,ct:2.2,t:0.12,tip:'curved',tipH:3.6},
   eng:[{z:9.9,len:6.6,d:3.6,fwd:4.2,drop:0.6}],
   fin:{cr:10.2,ct:3.5,h:9.0,sweep:38},stab:{b:9.5,cr:6.0,ct:2.0,sweep:33,dih:6,y:0.9},
   gear:{nose:2,noseR:0.52,mains:[{x:-2,z:5.3,bogie:'2x2',r:0.67}]},
   doors:[0.08,0.3,0.62,0.9],ftf:3,cockpitEye:[2.7,5.9],windowScale:1.2}},
 {id:'b744',name:'747-400',family:'Boeing 747',nick:'Jumbo',role:'Four-engined long-haul airliner',maker:'boeing',cockpitType:'boeing',
  feel:'The Queen of the Skies. Big, stable and slow to react: plan every turn and every flare early.',
  cruise:{alt:10700,ld:17.5},oew:178756,mtow:396893,mlw:285763,fuelCap:174000,payload:63900,pax:416,S:525,span:64.44,len:70.66,T:4*258000,engines:4,
  vrefKt:157,vrefFlap:6,vmo:365,mmo:0.92,mdd:0.89,pitch:0.13,roll:0.27,rotRate:0.045,tailStrike:11,
  flaps:BOEING_FLAPS([[1,0.12],[5,0.3],[10,0.45],[20,0.6],[25,0.8],[30,1]],[280,260,240,230,205,180]),toFlap:3,ldgFlap:6,
  gearH:5.7,mainX:-2,noseX:23.6,
  geo:{nose:31.4,D:6.5,H:7.85,noseL:9.2,tailL:17.5,cyNose:-0.2,hump:{to:0.33,h:2.3},
   wing:{y:-1.85,LE:40,dih:7,b:31.2,r0:3.1,cr:14.5,zk:0.32,ck:9.0,ct:3.0,t:0.13,tip:'canted',tipH:1.8},
   eng:[{z:11.9,len:5.4,d:2.7,fwd:3.4,drop:0.85},{z:21.2,len:5.4,d:2.7,fwd:3.0,drop:0.75}],
   fin:{cr:12.0,ct:4.0,h:10.6,sweep:45},stab:{b:11.0,cr:7.0,ct:2.3,sweep:37,dih:7,y:1.1},
   gear:{nose:2,noseR:0.6,mains:[{x:-0.6,z:5.5,bogie:'2x2',r:0.62},{x:-3.4,z:1.9,bogie:'2x2',r:0.62}]},
   doors:[0.08,0.24,0.47,0.7,0.89],ftf:4,cockpitEye:[3.3,8.7],upperDeck:0.32}},
 {id:'a388',name:'A380-800',family:'Airbus A380',nick:'Superjumbo',role:'Double-deck long-haul airliner',maker:'airbus',cockpitType:'airbus',
  feel:'The largest airliner ever built. Surprisingly gentle, but enormous: the wingtips are 40 m from your seat.',
  cruise:{alt:11300,ld:17.5},oew:277000,mtow:575000,mlw:394000,fuelCap:254000,payload:89000,pax:525,S:845,span:79.75,len:72.72,T:4*348000,engines:4,
  vrefKt:136,vmo:340,mmo:0.89,mdd:0.88,pitch:0.13,roll:0.26,rotRate:0.045,tailStrike:11.3,
  flaps:AIRBUS_FLAPS([263,222,220,196,182]),toFlap:2,ldgFlap:5,
  gearH:6.5,mainX:-2,noseX:31.58,
  geo:{nose:36.6,D:7.14,H:8.41,noseL:9.6,tailL:18,cyNose:-0.6,
   wing:{y:-2.6,LE:35.5,dih:5.6,b:39.9,r0:3.5,cr:17.5,zk:0.32,ck:11.0,ct:4.0,t:0.13,tip:'fence',tipH:3.5},
   eng:[{z:15.4,len:7.0,d:3.6,fwd:4.4,drop:0.9},{z:25.7,len:7.0,d:3.6,fwd:3.8,drop:0.8}],
   fin:{cr:14.0,ct:5.0,h:13.0,sweep:40},stab:{b:15.2,cr:8.5,ct:3.0,sweep:33,dih:5,y:1.5},
   gear:{nose:2,noseR:0.6,mains:[{x:0.2,z:7.17,bogie:'2x2',r:0.7},{x:-3.6,z:3.05,bogie:'3x2',r:0.7}]},
   doors:[0.08,0.26,0.47,0.7,0.88],ftf:3,cockpitEye:[4.0,7.1],upperDeck:1}}
];
for(const a of AIRLINERS){for(const k in AL_COMMON)if(a[k]===undefined)a[k]=AL_COMMON[k];a.cruise.mach=a.cruise.mach||Math.round((a.mmo-0.04)*100)/100;
  const G=a.geo;a.cockpit=[G.nose-G.cockpitEye[0],G.cockpitEye[1]-a.gearH];{const st=airlinerStations(a);const ex=a.cockpit[0];let tp=9;for(let i=0;i<st.length-1;i++){if(st[i][0]>=ex&&st[i+1][0]<=ex){tp=lerp(st[i][1],st[i+1][1],(st[i][0]-ex)/(st[i][0]-st[i+1][0]));}}a.cockpit[1]=Math.min(a.cockpit[1],tp-0.4);}a.vne=a.vmo*KT;a.flapMax=a.flaps[1].vfe;
  a.sweep=a.geo.wing.LE-3;
  // lengthen the upswept tail cone until the body clears the ground at the published tail-strike attitude
  for(let i=0;i<60&&tailClearance(a)<a.tailStrike-0.2;i++)G.tailL+=0.25;
  a.tailPts=[[G.nose-a.len+G.tailL*0.45,-G.H*0.18]];AIRCRAFT.push(a);}
function tailClearance(a){let m=90;for(const s of airlinerStations(a)){if(s[0]<a.mainX-1)m=Math.min(m,Math.atan2(s[2]+a.gearH,a.mainX-s[0])*R2D);}return m;}

/* ---- house paint and windows, drawn into the fuselage texture ---- */
// u runs from the nose (0) to the tail (1); v runs round the fuselage from the crown (0) down the right side (0.25)
// to the belly (0.5) and up the left side (0.75).
// The fuselage paint, and a matching roughness map (rough=true) in which the windows are glossy and the paint satin.
// Resolution follows the graphics setting; both are made once per type and shared, so parked aircraft cost nothing extra.
const PAINT_CACHE={};
function fuselagePaint(sp){const q=progress.quality||'high',key=sp.id+':'+q;if(PAINT_CACHE[key])return PAINT_CACHE[key];
  const W=q==='high'?4096:q==='medium'?2048:1024;return PAINT_CACHE[key]={map:fuselageTex(sp,false,W),rough:fuselageTex(sp,true,W)};}
function fuselageTex(sp,rough,W){
  const G=sp.geo,L=sp.len,Hh=W/4,k=W/2048;
  const K=(col,r)=>rough?`rgb(${r},${r},${r})`:col; // r: roughness 0..255
  const t=tex(W,Hh,(c)=>{
    const U=x=>(G.nose-x)/L*W, u=d=>d/L*W; // metres from the nose to pixels
    const circ=Math.PI*(G.D+G.H)/2,vpx=m=>m/circ*Hh;
    c.fillStyle=K('#f5f6f7',95);c.fillRect(0,0,W,Hh);
    // belly in light grey, below an amber cheatline and a teal pinstripe (invented house colours)
    const bellyTop=0.36,bellyBot=0.64;c.fillStyle=K('#c8ccd1',110);c.fillRect(0,bellyTop*Hh,W,(bellyBot-bellyTop)*Hh);
    for(const side of [0.25,0.75]){const d=side<0.5?1:-1;const yv=(side+d*0.075)*Hh;
      c.fillStyle=K('#ff7a2e',85);c.fillRect(u(G.noseL*0.6),yv-vpx(0.12),W,vpx(0.24));c.fillStyle=K('#14a7c7',85);c.fillRect(u(G.noseL*0.6),yv+d*vpx(0.22)-vpx(0.045),W,vpx(0.09));}
    // windows: one row on each side per deck, each with a thin frame
    const pitch=0.53*(G.windowScale||1)>0.6?0.6:0.53,ww=0.24*(G.windowScale||1),wh=0.34*(G.windowScale||1);
    const rows=[{v:0.03,from:G.noseL*1.05,to:L-G.tailL*0.8}];
    if(G.upperDeck){rows.push({v:-0.11,from:G.noseL*1.0,to:G.upperDeck>=1?L-G.tailL*0.95:L*G.upperDeck});}
    for(const side of [0.25,0.75])for(const r of rows){const vy=(side+(side<0.5?-r.v:r.v))*Hh;
      for(let x=r.from;x<r.to;x+=pitch){let skip=false;for(const d of (G.doors||[]).concat(G.exits||[]))if(Math.abs(x-d*L)<1.0)skip=true;if(skip)continue;
        const px=u(x),rw=u(ww)/2,rh=vpx(wh)/2;c.fillStyle=K('#8e979e',90);c.beginPath();c.ellipse(px,vy,rw*1.28,rh*1.2,0,0,Math.PI*2);c.fill();
        const gr=rough?null:c.createLinearGradient(px,vy-rh,px,vy+rh);if(gr){gr.addColorStop(0,'#3b4c5c');gr.addColorStop(0.5,'#141c24');gr.addColorStop(1,'#26323d');}
        c.fillStyle=rough?K('',18):gr;c.beginPath();c.ellipse(px,vy,rw,rh,0,0,Math.PI*2);c.fill();}}
    // doors: outlines with a small window
    c.lineWidth=2*k;
    for(const side of [0.25,0.75])for(const d of (G.doors||[]).concat(G.exits||[])){const exit=(G.exits||[]).includes(d);const dw=exit?0.55:1.05,dh=exit?1.0:1.9;
      const px=u(d*L),vy=(side+(side<0.5?-0.01:0.01))*Hh;c.strokeStyle=K('rgba(60,64,66,.8)',140);c.beginPath();c.roundRect?c.roundRect(px-u(dw)/2,vy-vpx(dh)/2,u(dw),vpx(dh),4*k):c.rect(px-u(dw)/2,vy-vpx(dh)/2,u(dw),vpx(dh));c.stroke();
      c.fillStyle=K('#1a232b',18);c.beginPath();c.ellipse(px,vy-vpx(dh*0.18),u(0.12),vpx(0.16),0,0,Math.PI*2);c.fill();
      if(G.upperDeck&&!exit&&(G.upperDeck>=1||d<G.upperDeck)){const vy2=(side+(side<0.5?0.12:-0.12))*Hh;c.strokeRect(px-u(dw)/2,vy2-vpx(dh)/2,u(dw),vpx(dh));}}
    // flight deck windows: four panes each side, wrapping round the nose
    const ce=G.nose-G.cockpitEye[0];const cx0=U(ce+1.9),cx1=U(ce-0.6);
    for(const side of [0.25,0.75]){c.fillStyle=K('#141b22',12);
      const vTop=0.085,vBot=0.205;const pts=[[cx0,vTop],[cx1-u(0.2),vTop+0.012],[cx1,vBot-0.02],[cx0+u(0.6),vBot]];
      c.beginPath();for(const [x,v] of pts)c.lineTo(x,(side<0.5?v:1-v)*Hh);c.closePath();c.fill();
      c.strokeStyle=K('#f5f6f7',95);c.lineWidth=3*k;for(let kk=1;kk<3;kk++){const xx=lerp(cx0,cx1,kk/3);c.beginPath();c.moveTo(xx,(side<0.5?vTop:1-vTop)*Hh);c.lineTo(xx+u(0.15),(side<0.5?vBot:1-vBot)*Hh);c.stroke();}}
    // radome seam and panel lines
    c.strokeStyle=K('rgba(80,84,86,.5)',120);c.lineWidth=1.5*k;c.beginPath();c.moveTo(u(1.2),0);c.lineTo(u(1.2),Hh);c.stroke();
    c.strokeStyle=K('rgba(0,0,0,.07)',105);c.lineWidth=k;for(let x=G.noseL;x<L;x+=2.3){c.beginPath();c.moveTo(u(x),0);c.lineTo(u(x),Hh);c.stroke();}
  });if(rough)t.encoding=THREE.LinearEncoding;t.anisotropy=maxAniso;return t;}
let TAIL_TEX=null;function tailTex(){return TAIL_TEX||(TAIL_TEX=tex(512,512,(c,w,h)=>{const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#16294a');g.addColorStop(1,'#0a1428');c.fillStyle=g;c.fillRect(0,0,w,h);c.save();c.translate(w/2,h/2);c.rotate(-0.5);c.fillStyle='#ff7a2e';c.fillRect(-w,-h*0.07,w*2,h*0.14);c.fillStyle='#14a7c7';c.fillRect(-w,h*0.11,w*2,h*0.045);c.restore();}));}

/* ---- geometry helpers ---- */
// Fuselage stations from a few published dimensions: nose length, constant section and the upswept tail cone.
function airlinerStations(sp){const G=sp.geo,R=G.D/2,RH=G.H/2,x0=G.nose,x1=G.nose-sp.len,st=[];
  const nose=t=>Math.pow(1-Math.pow(1-t,2.2),0.62);
  for(let i=0;i<=16;i++){const t=i/16,x=x0-t*G.noseL,f=nose(t);const cy=G.cyNose*RH*(1-f)*1.6;
    const top=cy+RH*Math.pow(f,0.5),bot=cy-RH*Math.pow(f,1.05);st.push([x,top,bot,R*Math.pow(f,0.8)]);}
  const xt=x1+G.tailL;
  st.push([lerp(x0-G.noseL,xt,0.5),RH,-RH,R]);st.push([xt,RH,-RH,R]);
  for(let i=1;i<=12;i++){const t=i/12,x=xt-t*G.tailL;const bot=-RH+(2*RH-RH*0.42)*Math.pow(t,1.25),top=RH-RH*0.42*Math.pow(t,1.9);st.push([x,top,bot,R*(1-0.84*Math.pow(t,1.15))]);}
  if(G.hump){const xh=x0-sp.len*G.hump.to;for(const s of st){const d=s[0]-xh;if(s[0]<=x0-G.noseL*0.25){const k=d>0?1:Math.max(0,1+d/9);const kk=smooth(k)*clamp((x0-s[0])/(G.noseL*1.1),0,1);s[1]+=G.hump.h*kk;}}}
  return st;}
function fuselageGeoUV(st,len,nose){
  const S=st.slice().sort((a,b)=>b[0]-a[0]);const hq=progress.quality==='high';const N=hq?170:110,ring=hq?48:32;const x0=S[0][0],x1=S[S.length-1][0];
  const sample=x=>{for(let i=0;i<S.length-1;i++){const a=S[i],b=S[i+1];if(x<=a[0]&&x>=b[0]){const t=(a[0]-x)/((a[0]-b[0])||1);return[lerp(a[1],b[1],t),lerp(a[2],b[2],t),lerp(a[3],b[3],t)];}}const l=S[S.length-1];return[l[1],l[2],l[3]];};
  const pos=[],uv=[],idx=[];
  for(let i=0;i<=N;i++){const tt=i/N,x=lerp(x0,x1,Math.pow(tt,1)*1);const [top,bot,hw]=sample(x);const cy=(top+bot)/2,ry=Math.max(0.02,(top-bot)/2);
    for(let j=0;j<=ring;j++){const a=j/ring*Math.PI*2;pos.push(x,cy+Math.cos(a)*ry,Math.sin(a)*Math.max(0.02,hw));uv.push((nose-x)/len,1-j/ring);}}
  for(let i=0;i<N;i++)for(let j=0;j<ring;j++){const a=i*(ring+1)+j,b=a+ring+1;idx.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
// a wing panel through a list of sections [x of leading edge, y, z, chord, thickness ratio]
function panelGeo(secs,up){return foilGeo(secs.map(([x,y,z,c,t])=>({le:[x,y,z],c,th:c*t,up:up||[0,1,0]})));}
function nacelleGeo(len,d,flat){const r=d/2,h=len/2;
  const pts=[[r*0.86,h],[r*0.97,h-0.12*len],[r,h-0.3*len],[r*0.93,-h+0.28*len],[r*0.7,-h+0.06*len],[r*0.62,-h]];
  const g=new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),28);g.rotateZ(-Math.PI/2);if(flat)g.scale(1,flat,1);return g;}

function buildAirliner(sp){
  const S=shared(),G=sp.geo,W=G.wing;
  // painted surfaces are satin paint over metal; the windows are glossy (see the roughness map)
  const paint=fuselagePaint(sp);
  const bodyM=stdMat('#ffffff',{map:paint.map,roughnessMap:paint.rough,metalness:0.12,roughness:1,envMapIntensity:0.9}),wingM=stdMat('#d6dade',{metalness:0.35,roughness:0.38}),greyM=stdMat('#b2b8bd',{metalness:0.5,roughness:0.36});
  const whiteM=stdMat('#f3f4f5',{metalness:0.15,roughness:0.32}),tailM=stdMat('#ffffff',{map:tailTex(),metalness:0.15,roughness:0.35}),darkM=S.dark,metalM=stdMat('#9ea3a6',{metalness:0.85,roughness:0.3});
  const g=new THREE.Group();const parts={props:[],flaps:[],gear:[],swing:[],ab:[],lights:{},discs:[],blades:[],spoilers:[],rev:[]};
  const add=(geo,m,parent)=>{const me=new THREE.Mesh(geo,m);me.castShadow=true;(parent||g).add(me);return me;};
  const st=airlinerStations(sp);add(fuselageGeoUV(st,sp.len,G.nose),bodyM);
  const x1=G.nose-sp.len,R=G.D/2,RH=G.H/2;
  // APU exhaust
  const apu=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.26,0.5,12),darkM);apu.rotation.z=Math.PI/2;const tailTop=st[st.length-1];apu.position.set(x1-0.1,(tailTop[1]+tailTop[2])/2,0);g.add(apu);
  // wing: root, crank and tip sections
  const tanLE=Math.tan(W.LE*D2R),dih=Math.sin(W.dih*D2R);
  const LEx=z=>W.x0-(z-W.r0)*tanLE,Wy=z=>W.y+(z-W.r0)*dih;
  const zk=W.r0+(W.b-W.r0)*W.zk;
  // root leading edge placed so the quarter-chord of the mean chord sits just ahead of the centre of gravity
  const mac=(W.cr+W.ck*1.2+W.ct)/3.2,zm=W.r0+(W.b-W.r0)*0.38;W.x0=0.6+0.25*mac+(zm-W.r0)*tanLE;
  const chordAt=z=>z<=zk?lerp(W.cr,W.ck,(z-W.r0)/(zk-W.r0)):lerp(W.ck,W.ct,(z-zk)/(W.b-zk));
  const tipZ=W.tip==='raked'?W.b-W.rake:W.b;
  for(const s of [1,-1]){
    const sec=z=>[LEx(z),Wy(z),z*s,chordAt(z),W.t*(z<zk?1:lerp(1,0.75,(z-zk)/(W.b-zk)))];
    const secs=[[LEx(0),W.y,0,W.cr*1.05,W.t],sec(W.r0),sec(zk),sec(tipZ)];
    if(W.tip==='raked'){const tx=LEx(tipZ),tc=chordAt(tipZ);secs.push([tx-W.rake*Math.tan((W.LE+18)*D2R),Wy(W.b),W.b*s,tc*0.32,W.t*0.6]);}
    add(panelGeo(secs),wingM);
    // wingtip devices
    const tz=tipZ,tx=LEx(tz),ty=Wy(tz),tc=chordAt(tz);
    if(W.tip==='winglet'||W.tip==='sharklet'||W.tip==='curved'||W.tip==='canted'){const cant=W.tip==='canted'?0.45:W.tip==='curved'?0.3:0.18;
      const h=W.tipH,secsW=[];const n=W.tip==='curved'?5:2;
      for(let i=0;i<=n;i++){const t=i/n,curve=W.tip==='curved'||W.tip==='winglet'?Math.pow(t,0.6):t;const zz=tz+(cant*h*curve+(W.tip==='curved'?0.9*Math.sin(t*1.57):0.2*t));
        secsW.push([tx-t*tc*0.55-0.05,ty+h*t,zz*s,lerp(tc,tc*0.32,t),0.09]);}
      const wg=panelGeo(secsW,[0,0,s]);add(wg,whiteM);}
    if(W.tip==='fence'){add(planarUV(panelFin([[tx+0.4,ty-W.tipH*0.35,tc*1.05],[tx-tc*0.25,ty+W.tipH*0.65,tc*0.5]],0.06).translate(0,0,tz*s)),tailM);}
    // flaps (inboard and outboard), hinged at the trailing edge
    for(const [za,zb] of [[W.r0+0.2,zk],[zk+0.3,W.r0+(W.b-W.r0)*0.74]]){const ca=chordAt(za),cb=chordAt(zb);
      const ax=LEx(za)-ca,bx=LEx(zb)-cb;const hinge=new THREE.Group();hinge.position.set(ax,Wy(za),za*s);g.add(hinge);
      add(panelGeo([[0,0,0,ca*0.26,0.1],[bx-ax,Wy(zb)-Wy(za),(zb-za)*s,cb*0.26,0.1]]),greyM,hinge);parts.flaps.push(hinge);
      // spoilers ahead of the flap
      for(let k=0;k<2;k++){const z0=lerp(za,zb,k/2)+0.1,z1=lerp(za,zb,(k+1)/2)-0.1,c0=chordAt(z0);
        const sg=new THREE.Group();sg.position.set(LEx(z0)-c0*0.62,Wy(z0)+c0*W.t*0.32,z0*s);g.add(sg);
        add(panelGeo([[0,0,0,c0*0.13,0.04],[(LEx(z1)-chordAt(z1)*0.62)-(LEx(z0)-c0*0.62),Wy(z1)-Wy(z0),(z1-z0)*s,chordAt(z1)*0.13,0.04]]),wingM,sg);parts.spoilers.push(sg);}}
    // flap track fairings
    const nf=G.ftf||3;for(let i=0;i<nf;i++){const z=lerp(W.r0+1.5,W.r0+(W.b-W.r0)*0.7,i/(nf-1));const c=chordAt(z);
      const ft=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),greyM);ft.scale.set(c*0.38,c*0.07+0.12,c*0.05+0.12);ft.position.set(LEx(z)-c*0.92,Wy(z)-c*0.05-0.1,z*s);ft.castShadow=true;g.add(ft);}
    // engines on pylons
    for(const e of G.eng){const z=e.z,lx=LEx(z),wy=Wy(z),front=lx+e.fwd,cx=front-e.len/2,cy=wy-e.d/2-e.drop;
      const nac=add(nacelleGeo(e.len,e.d,e.flat),whiteM);nac.position.set(cx,cy,z*s);
      const fan=new THREE.Mesh(new THREE.CircleGeometry(e.d*0.42,24),darkM);fan.rotation.y=Math.PI/2;fan.position.set(front-0.25,cy,z*s);g.add(fan);
      const spin=new THREE.Mesh(new THREE.ConeGeometry(e.d*0.11,e.d*0.28,16),metalM);spin.rotation.z=-Math.PI/2;spin.position.set(front-0.12,cy,z*s);g.add(spin);
      const plug=new THREE.Mesh(new THREE.ConeGeometry(e.d*0.16,e.len*0.22,14),metalM);plug.rotation.z=Math.PI/2;plug.position.set(cx-e.len/2-e.len*0.09,cy,z*s);g.add(plug);
      add(panelFin([[cx+e.len*0.22,cy+e.d*0.45,e.len*0.75],[lx-0.3,wy-0.05,chordAt(z)*0.75]],0.05).translate(0,0,z*s),greyM);
      parts.exhaust=(parts.exhaust||[]).concat([[cx-e.len/2,cy,z*s]]);}
  }
  // wing-to-body fairing
  const bf=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),bodyM.clone());bf.material.map=null;bf.material.color.set('#e6e6e2');bf.scale.set(W.cr*0.95,RH*0.5,R*0.95);bf.position.set(LEx(0)-W.cr*0.48,-RH*0.62,0);bf.castShadow=true;g.add(bf);
  // fin and tailplane
  const F=G.fin,ftop=st.find(s=>s[0]<x1+G.tailL*0.85)||st[st.length-3];
  const finX=x1+F.cr*0.95+0.6,finY=RH*0.72;
  add(planarUV(panelFin([[finX,finY-0.6,F.cr*1.05],[finX-F.h*Math.tan(F.sweep*D2R),finY+F.h,F.ct]],0.11)),tailM);
  const T=G.stab;for(const s of [1,-1]){const rx=x1+T.cr+1.2;add(panelGeo([[rx,T.y-RH*0.5+RH*0.2,0.3*s,T.cr,0.1],[rx-T.b*Math.tan(T.sweep*D2R),T.y-RH*0.3+T.b*Math.sin(T.dih*D2R),T.b*s,T.ct,0.09]]),wingM);}
  // landing gear
  const gearAll=new THREE.Group();g.add(gearAll);const gh=sp.gearH;
  const bogie=(x,z,lay,r,topY)=>{const leg=new THREE.Group();leg.position.set(x,0,z);gearAll.add(leg);
    const H=topY+gh-r;const strut=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,H,8),S.strut);strut.position.y=(topY-gh+r)/2+0.2;leg.add(strut);
    const axles=lay==='2'?[0]:lay==='2x2'?[-0.75,0.75]:[-1.45,0,1.45],side=lay==='2'?[-0.42,0.42]:[-0.7,0.7];
    if(axles.length>1){const beam=new THREE.Mesh(new THREE.BoxGeometry(axles[axles.length-1]-axles[0]+0.5,0.22,0.3),S.strut);beam.position.y=-gh+r;leg.add(beam);}
    for(const ax of axles)for(const sz of side){const wh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,0.4,18),S.tire);wh.rotation.x=Math.PI/2;wh.position.set(ax,-gh+r,sz);wh.castShadow=true;leg.add(wh);
      const hub=new THREE.Mesh(new THREE.CylinderGeometry(r*0.5,r*0.5,0.42,12),metalM);hub.rotation.x=Math.PI/2;hub.position.copy(wh.position);leg.add(hub);}
    parts.gear.push({leg,up:Math.max(0,gh-r-0.8)});};
  for(const m of G.gear.mains)for(const s of [1,-1])bogie(m.x,m.z*s,m.bogie,m.r,-RH*0.55);
  bogie(sp.noseX,0,'2',G.gear.noseR,-RH*0.6);
  parts.gearAll=gearAll;
  // lights: navigation (red left, green right), white tail, red beacons and white strobes
  const lm=c=>new THREE.MeshBasicMaterial({color:c});const tipX=LEx(tipZ)-chordAt(tipZ)*0.2,tipY=Wy(tipZ);
  const lr=new THREE.Mesh(new THREE.SphereGeometry(0.2,8,6),lm('#ff3020')),lg=new THREE.Mesh(new THREE.SphereGeometry(0.2,8,6),lm('#30ff60'));
  lr.position.set(tipX,tipY,-tipZ-0.1);lg.position.set(tipX,tipY,tipZ+0.1);g.add(lr,lg);
  const lt=new THREE.Mesh(new THREE.SphereGeometry(0.18,8,6),lm('#ffffff'));lt.position.set(x1-0.3,(tailTop[1]+tailTop[2])/2,0);g.add(lt);
  const bc=new THREE.Mesh(new THREE.SphereGeometry(0.26,8,6),lm('#ff2a1a'));bc.position.set(0,RH+0.15+(G.hump?0:0),0);g.add(bc);
  const bc2=new THREE.Mesh(new THREE.SphereGeometry(0.26,8,6),lm('#ff2a1a'));bc2.position.set(-2,-RH-0.15,0);g.add(bc2);
  const sl=new THREE.Mesh(new THREE.SphereGeometry(0.24,8,6),lm('#ffffff')),sr=sl.clone();sl.position.set(tipX-0.4,tipY,-tipZ-0.15);sr.position.set(tipX-0.4,tipY,tipZ+0.15);g.add(sl,sr);
  parts.lights={red:lr,green:lg,tail:lt,beacon:bc,beacon2:bc2,strobes:[sl,sr]};
  // contact points
  const gearPts=[];for(const m of G.gear.mains)for(const s of [1,-1])gearPts.push([m.x,-gh,m.z*s,'main']);gearPts.push([sp.noseX,-gh,0,'nose']);
  const body=[];for(const s of st){if(s[0]<sp.mainX-2)body.push([s[0],s[2],0,'tail']);else body.push([s[0],s[2],0,'belly']);}
  for(const s of [1,-1])body.push([LEx(tipZ)-chordAt(tipZ)*0.5,Wy(tipZ),tipZ*s,'wing']);
  for(const e of G.eng)for(const s of [1,-1])body.push([LEx(e.z)+e.fwd-e.len/2,Wy(e.z)-e.d-e.drop,e.z*s,'pod']);
  return{g,parts,pts:{gear:gearPts,body}};
}
// a vertical panel (the fin), sections [x of leading edge, y, chord]
function panelFin(secs,t){return foilGeo(secs.map(([x,y,c])=>({le:[x,y,0],c,th:c*t,up:[0,0,1]})));}
// planar texture coordinates from the x-y extent, for the tail art
function planarUV(geo){geo.computeBoundingBox();const b=geo.boundingBox,p=geo.attributes.position,uv=[];
  for(let i=0;i<p.count;i++)uv.push((p.getX(i)-b.min.x)/((b.max.x-b.min.x)||1),(p.getY(i)-b.min.y)/((b.max.y-b.min.y)||1));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return geo;}
