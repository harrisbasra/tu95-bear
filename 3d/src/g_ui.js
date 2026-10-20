
/* ---------- screen ---------- */
const hud=$('#hud'),hx=hud.getContext('2d');
let W=0,H=0,DPR=1,PH=120,viewH=0;const SAFE={t:0,r:0,b:0,l:0};
function readSafe(){const cs=getComputedStyle($('#safe-probe'));SAFE.t=parseFloat(cs.paddingTop)||0;SAFE.r=parseFloat(cs.paddingRight)||0;SAFE.b=parseFloat(cs.paddingBottom)||0;SAFE.l=parseFloat(cs.paddingLeft)||0;}
function resize(){readSafe();W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,2);
  renderer.setPixelRatio(progress.hq?DPR:1);renderer.setSize(W,H,false);hud.width=Math.round(W*DPR);hud.height=Math.round(H*DPR);
  camera.aspect=W/H;camera.updateProjectionMatrix();PH=Math.round(clamp(H*0.2,96,140))+SAFE.b;viewH=H-PH;document.documentElement.style.setProperty('--panel-h',PH+'px');}
/* ---------- audio ---------- */
const AU={ac:null,on:progress.sound!==false,
  init(){if(this.ac){if(this.ac.state==='suspended')this.ac.resume();return;}const A=window.AudioContext||window.webkitAudioContext;if(!A)return;
    try{const ac=this.ac=new A();const master=this.master=ac.createGain();master.gain.value=this.on?0.5:0;master.connect(ac.destination);
      const nb=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.nb=nb;
      const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=300;const am=ac.createGain();am.gain.value=0.7;const eg=ac.createGain();eg.gain.value=0;
      const mk=(type,f,v)=>{const o=ac.createOscillator();o.type=type;o.frequency.value=f;const g=ac.createGain();g.gain.value=v;o.connect(g).connect(lp);o.start();return o;};
      const o1=mk('sawtooth',46,0.5),o2=mk('sawtooth',70,0.32),o3=mk('triangle',93,0.22);lp.connect(am);am.connect(eg);eg.connect(master);
      const lfo=ac.createOscillator();lfo.frequency.value=8;const lg=ac.createGain();lg.gain.value=0.3;lfo.connect(lg).connect(am.gain);lfo.start();
      const ns=ac.createBufferSource();ns.buffer=nb;ns.loop=true;const bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=700;bp.Q.value=0.5;const wg=ac.createGain();wg.gain.value=0;ns.connect(bp).connect(wg).connect(master);ns.start();
      const jn=ac.createBufferSource();jn.buffer=nb;jn.loop=true;const jf=ac.createBiquadFilter();jf.type='lowpass';jf.frequency.value=900;const jg=ac.createGain();jg.gain.value=0;jn.connect(jf).connect(jg).connect(master);jn.start();
      const wh=ac.createOscillator();wh.type='sine';wh.frequency.value=800;const whg=ac.createGain();whg.gain.value=0;wh.connect(whg).connect(master);wh.start();
      const so=ac.createOscillator();so.type='square';so.frequency.value=610;const sf=ac.createBiquadFilter();sf.type='lowpass';sf.frequency.value=1500;const sg=ac.createGain();sg.gain.value=0;so.connect(sf).connect(sg).connect(master);so.start();
      Object.assign(this,{o1,o2,o3,lp,eg,lfo,wg,bp,jf,jg,wh,whg,sg});}catch(e){this.ac=null;}},
  setOn(v){this.on=v;progress.sound=v;save();if(this.ac)this.master.gain.setTargetAtTime(v?0.5:0,this.ac.currentTime,0.05);},
  update(rpm,speed,warn,active,jet,ab){if(!this.ac)return;const t=this.ac.currentTime,f=36+rpm*36;
    this.o1.frequency.setTargetAtTime(f,t,0.25);this.o2.frequency.setTargetAtTime(f*1.52,t,0.25);this.o3.frequency.setTargetAtTime(f*2.03,t,0.25);this.lp.frequency.setTargetAtTime(200+rpm*950,t,0.25);this.lfo.frequency.setTargetAtTime(3+rpm*11,t,0.3);
    this.eg.gain.setTargetAtTime(active&&!jet?0.03+rpm*0.24:0,t,0.2);this.jg.gain.setTargetAtTime(active&&jet?0.04+rpm*0.32+ab*0.3:0,t,0.25);this.jf.frequency.setTargetAtTime(350+rpm*1500+ab*600,t,0.3);
    this.wh.frequency.setTargetAtTime(500+rpm*1900,t,0.4);this.whg.gain.setTargetAtTime(active&&jet?rpm*0.022:0,t,0.3);
    this.wg.gain.setTargetAtTime(active?clamp(speed/240,0,1)*0.16:0,t,0.3);this.bp.frequency.setTargetAtTime(300+speed*4,t,0.3);
    this.sg.gain.setTargetAtTime(active&&warn&&(Math.floor(t*5)%2===0)?0.045:0,t,0.01);},
  noise(dur,freq,vol,type){if(!this.ac)return;const ac=this.ac,t=ac.currentTime;const s=ac.createBufferSource();s.buffer=this.nb;const f=ac.createBiquadFilter();f.type=type||'lowpass';f.frequency.value=freq;const g=ac.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);s.connect(f).connect(g).connect(this.master);s.start(t,Math.random());s.stop(t+dur+0.05);},
  boom(){this.noise(2.6,260,1);},clunk(){this.noise(0.16,700,0.3,'bandpass');},
  blip(fq){if(!this.ac)return;const ac=this.ac,t=ac.currentTime;const o=ac.createOscillator();o.frequency.value=fq||880;const g=ac.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.1,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);o.connect(g).connect(this.master);o.start(t);o.stop(t+0.25);}};
/* ---------- approach guidance ---------- */
function approach(g){
  const p=g.plane;let best=null;const ph=V().set(Math.sin(p.hdg),0,-Math.cos(p.hdg));
  for(const e of ENDS){const rx=p.pos.x-e.T.x,rz=p.pos.z-e.T.z;const along=-(rx*e.dx+rz*e.dz),lat=rx*(-e.dz)+rz*e.dx;
    if(along<-e.rw.len||along>30000)continue;if(Math.abs(lat)>Math.max(0,along)*0.4+600)continue;if(ph.x*e.dx+ph.z*e.dz<0.35)continue;
    const pref=g.M.dest===e.name?-5000:0;if(!best||along+pref<best.score){best={e,along,lat,score:along+pref};}}
  if(!best)return null;const gy=p.pos.y-p.spec.gearH;
  best.gs=Math.atan2(gy,Math.max(1,best.along+300))*R2D-3;best.loc=Math.atan2(best.lat,best.along+best.e.rw.len)*R2D;return best;}
function updatePapi(g){const p=g.plane;for(const P of W3.papi){const e=P.end;const ax=e.T.x+e.dx*300,az=e.T.z+e.dz*300;const dist=(ax-p.pos.x)*e.dx+(az-p.pos.z)*e.dz;
  const ang=dist>0?Math.atan2(Math.max(0,p.pos.y-p.spec.gearH+2),dist)*R2D:0;let wn=0;for(const t of [2.5,2.83,3.17,3.5])if(ang>t)wn++;
  const ca=P.pts.geometry.attributes.color;for(let i=0;i<4;i++){const white=i>=4-wn;ca.setXYZ(i,1,white?1:0.18,white?1:0.12);}ca.needsUpdate=true;}
  const seq=Math.floor((g.t*2)%1*30);for(const r of W3.rabbit){const n=r.geometry.attributes.position.count;r.geometry.setDrawRange(n-1-(seq%n),1);}}
/* ---------- HUD ---------- */
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function circ(c,x,y,r){c.beginPath();c.arc(x,y,Math.max(0.01,r),0,Math.PI*2);}
function lamp(x,y,r,on,col){hx.fillStyle='#14170f';circ(hx,x,y,r+1.5);hx.fill();if(on){const g=hx.createRadialGradient(x,y,0,x,y,r*2.2);g.addColorStop(0,`rgba(${col},.55)`);g.addColorStop(1,`rgba(${col},0)`);hx.fillStyle=g;circ(hx,x,y,r*2.2);hx.fill();hx.fillStyle=`rgb(${col})`;}else hx.fillStyle='#2f3528';circ(hx,x,y,r);hx.fill();}
function dialFace(x,y,r){const c=hx;c.fillStyle='#14170f';circ(c,x,y,r+5);c.fill();const fg=c.createRadialGradient(x,y-r*0.3,r*0.1,x,y,r);fg.addColorStop(0,'#232820');fg.addColorStop(1,'#0e100c');c.fillStyle=fg;circ(c,x,y,r);c.fill();}
function dial(x,y,r,o){const c=hx;dialFace(x,y,r);const ang=v=>o.a0+(clamp(v,o.min,o.max)-o.min)/(o.max-o.min)*(o.a1-o.a0);
  if(o.arcs)for(const a of o.arcs){c.strokeStyle=a[2];c.lineWidth=Math.max(2,r*0.07);c.beginPath();c.arc(x,y,r*0.86,ang(a[0]),ang(a[1]));c.stroke();}
  c.strokeStyle='#ebe5cb';for(let v=o.min;v<=o.max+1e-6;v+=o.minor){const a=ang(v);const mj=Math.abs((v-o.min)/o.major-Math.round((v-o.min)/o.major))<1e-6;const r0=mj?r*0.74:r*0.82;c.lineWidth=mj?2:1;c.beginPath();c.moveTo(x+Math.cos(a)*r0,y+Math.sin(a)*r0);c.lineTo(x+Math.cos(a)*r*0.94,y+Math.sin(a)*r*0.94);c.stroke();
    if(mj&&o.labels&&r>30){const lv=o.labels(v);if(lv!==null){c.fillStyle='#ebe5cb';c.font=`700 ${Math.round(r*0.2)}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(lv,x+Math.cos(a)*r*0.56,y+Math.sin(a)*r*0.56);}}}
  c.textBaseline='alphabetic';
  if(o.read){c.fillStyle='#0a0b08';const tw=r*0.98,th=r*0.32;c.fillRect(x-tw/2,y+r*0.3,tw,th);c.fillStyle='#f2c46a';c.font=`700 ${Math.round(r*0.27)}px ${FONT}`;c.textAlign='center';c.fillText(o.read,x,y+r*0.3+th*0.8);}
  if(o.needle2!==undefined){const a=o.a0+o.needle2*(o.a1-o.a0);c.strokeStyle='#ebe5cb';c.lineWidth=Math.max(3,r*0.09);c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*r*0.48,y+Math.sin(a)*r*0.48);c.stroke();}
  const a=ang(o.val);c.strokeStyle='#f08a3a';c.lineWidth=Math.max(2,r*0.05);c.lineCap='round';c.beginPath();c.moveTo(x-Math.cos(a)*r*0.12,y-Math.sin(a)*r*0.12);c.lineTo(x+Math.cos(a)*r*0.84,y+Math.sin(a)*r*0.84);c.stroke();
  c.fillStyle='#3a4232';circ(c,x,y,r*0.09);c.fill();label(x,y+r+19,o.label);}
function label(x,y,t){hx.fillStyle='rgba(235,229,203,.75)';hx.font=`700 12px ${FONT}`;hx.textAlign='center';hx.fillText(t,x,y);}
function adi(x,y,r,p){const c=hx;dialFace(x,y,r);c.save();circ(c,x,y,r);c.clip();c.translate(x,y);c.rotate(-p.bank);const ppd=r/30;const off=p.pitch*R2D*ppd;
  c.fillStyle='#3f78b6';c.fillRect(-r*2,-r*2+off,r*4,r*2);c.fillStyle='#7a5a34';c.fillRect(-r*2,off,r*4,r*2);c.strokeStyle='#fff';c.lineWidth=1.5;c.beginPath();c.moveTo(-r*2,off);c.lineTo(r*2,off);c.stroke();
  c.lineWidth=1;c.fillStyle='#fff';c.font=`700 ${Math.round(r*0.16)}px ${FONT}`;c.textAlign='left';
  for(let d=-30;d<=30;d+=10){if(!d)continue;const yy=off-d*ppd;c.beginPath();c.moveTo(-r*0.28,yy);c.lineTo(r*0.28,yy);c.stroke();c.fillText(String(Math.abs(d)),r*0.32,yy+4);}
  for(let d=-25;d<=25;d+=10){const yy=off-d*ppd;c.beginPath();c.moveTo(-r*0.12,yy);c.lineTo(r*0.12,yy);c.stroke();}
  c.restore();c.strokeStyle='#ebe5cb';c.lineWidth=1.5;for(const b of [-60,-45,-30,-20,-10,0,10,20,30,45,60]){const a=-Math.PI/2+b*D2R;const r0=b%30===0?r*0.8:r*0.87;c.beginPath();c.moveTo(x+Math.cos(a)*r0,y+Math.sin(a)*r0);c.lineTo(x+Math.cos(a)*r*0.96,y+Math.sin(a)*r*0.96);c.stroke();}
  const ba=-Math.PI/2+(-p.bank);c.fillStyle='#f2c46a';c.beginPath();c.moveTo(x+Math.cos(ba)*r*0.78,y+Math.sin(ba)*r*0.78);c.lineTo(x+Math.cos(ba-0.08)*r*0.66,y+Math.sin(ba-0.08)*r*0.66);c.lineTo(x+Math.cos(ba+0.08)*r*0.66,y+Math.sin(ba+0.08)*r*0.66);c.fill();
  c.strokeStyle='#f2c46a';c.lineWidth=3;c.beginPath();c.moveTo(x-r*0.55,y);c.lineTo(x-r*0.18,y);c.lineTo(x-r*0.1,y+r*0.08);c.moveTo(x+r*0.55,y);c.lineTo(x+r*0.18,y);c.lineTo(x+r*0.1,y+r*0.08);c.stroke();c.fillStyle='#f2c46a';circ(c,x,y,2.5);c.fill();
  label(x,y+r+19,'Attitude');}
function compass(x,y,r,p,ap){const c=hx;dialFace(x,y,r);const h=p.hdg;c.save();c.translate(x,y);c.rotate(-h);c.strokeStyle='#ebe5cb';c.fillStyle='#ebe5cb';c.textAlign='center';c.textBaseline='middle';
  for(let d=0;d<360;d+=10){c.save();c.rotate(d*D2R);c.lineWidth=d%30?1:2;c.beginPath();c.moveTo(0,-r*0.94);c.lineTo(0,d%30?-r*0.84:-r*0.78);c.stroke();
    if(d%30===0&&r>30){c.font=`700 ${Math.round(r*0.19)}px ${FONT}`;c.fillStyle=d===0?'#f08a3a':'#ebe5cb';c.fillText(d===0?'N':d===90?'E':d===180?'S':d===270?'W':String(d/10),0,-r*0.6);}c.restore();}
  if(ap){c.save();c.rotate(ap.e.hdg*D2R);c.strokeStyle='#86d36f';c.lineWidth=3;c.beginPath();c.moveTo(0,-r*0.5);c.lineTo(0,r*0.5);c.stroke();c.fillStyle='#86d36f';c.beginPath();c.moveTo(0,-r*0.58);c.lineTo(-5,-r*0.44);c.lineTo(5,-r*0.44);c.fill();
    const dev=clamp(ap.loc/2.5,-1,1)*r*0.35;c.strokeStyle='#ff5ad8';c.beginPath();c.moveTo(-dev,-r*0.3);c.lineTo(-dev,r*0.3);c.stroke();c.restore();}
  c.restore();c.textBaseline='alphabetic';c.fillStyle='#f2c46a';c.beginPath();c.moveTo(x,y-r*0.16);c.lineTo(x-7,y+r*0.14);c.lineTo(x,y+r*0.06);c.lineTo(x+7,y+r*0.14);c.fill();
  c.fillStyle='#0a0b08';c.fillRect(x-20,y-r-2,40,17);c.fillStyle='#f2c46a';c.font=`700 13px ${FONT}`;c.textAlign='center';c.fillText(String(Math.round(((h*R2D)+360)%360)).padStart(3,'0')+'°',x,y-r+11);label(x,y+r+19,'Heading');}
function warnings(g){const p=g.plane,w=[];if(!p.alive||g.status!=='play'||g.mode!=='play')return w;const kmh=p.v*3.6;
  if(!p.onGround){if(p.stalled)w.push('Stall');const tti=p.vs<-1?p.agl/(-p.vs):99;const ap=g.ap;const onApp=ap&&p.gearPos>0.95&&ap.along<8000&&p.vs>-9;
    if(p.agl<450&&tti<7&&!onApp)w.push('Pull up');if(!p.gearDown&&p.agl<200&&p.vs<-0.5&&kmh<380&&ap&&ap.along<6000)w.push('Gear is up');
    if(Math.abs(p.bank)>0.95)w.push('Bank angle');if(p.flapPos>0.1&&kmh>p.spec.flapMax)w.push('Too fast for the flaps');}
  return w;}
function objectives(g){const p=g.plane,M=g.M,km=v=>`${(Math.max(0,v)/1000).toFixed(1)} km`;
  switch(M.key){
    case 'free':return[['Explore Lahore. Land on any runway and stop to finish',null]];
    case 'depart':return[[`Climb to 600 m above ground (${Math.max(0,Math.round(p.agl))} m)`,!p.onGround&&p.agl>=600],['Raise the gear (G)',p.gearPos<0.03&&!p.gearDown],['Set cruise flaps (F)',p.flap==='cruise']];
    case 'final':case 'night':{const e=END(M.dest);const d=Math.hypot(p.pos.x-e.T.x,p.pos.z-e.T.z);return[[`Land on runway ${M.dest} and stop`,false],[`Threshold ${km(d)} away`,null]];}
    default:{const ok=g.rings.filter(r=>r.state==='ok').length;const nx=g.rings.find(r=>r.state==='next');
      return[[`Rings: ${ok} of ${g.rings.length}`,ok===g.rings.length],nx?[`Next ring ${km(Math.hypot(nx.x-p.pos.x,nx.z-p.pos.z))} away, ${Math.round(nx.y)} m up`,null]:['Now land on any runway and stop',false]];}}}
function drawHUD(g){
  hx.setTransform(DPR,0,0,DPR,0,0);hx.clearRect(0,0,W,H);if(g.mode!=='play')return;
  const p=g.plane,sp=p.spec,top=viewH,ch=PH-SAFE.b,kmh=p.v*3.6;
  if(g.cam.mode==='cockpit'&&p.alive)drawCockpitFrame();
  const pg=hx.createLinearGradient(0,top,0,H);pg.addColorStop(0,'#46523b');pg.addColorStop(1,'#2c3426');hx.fillStyle=pg;hx.fillRect(0,top,W,PH);hx.fillStyle='#1b2016';hx.fillRect(0,top,W,3);
  const L=SAFE.l+12,R=W-SAFE.r-12,avail=R-L,midY=top+ch*0.44;
  const compact=avail<760;let r=clamp((ch-44)/2,20,44);if(compact)r=clamp(Math.min((ch-40)/2,(avail-200)/10.5),18,36);
  const dw=r*2+28;let x=L+dw/2;
  const dmax=sp.supersonic?(sp.vne>1600?2400:2000):1000,dmaj=dmax>1200?200:100;
  dial(x,midY,r,{min:0,max:dmax,a0:Math.PI*0.75,a1:Math.PI*2.25,val:kmh,major:dmaj,minor:dmaj/2,labels:v=>v%(dmaj*2)===0?String(v/100):null,arcs:[[sp.appKmh*0.8,sp.flapMax,'#e9e3c9'],[sp.rotKmh*0.9,sp.vne*0.92,'#5fae4f'],[sp.vne*0.92,dmax,'#c23b2b']],read:String(Math.round(kmh)),label:'Speed km/h'});x+=dw;
  adi(x,midY,r,p);x+=dw;
  const alt=Math.max(0,p.agl);dial(x,midY,r,{min:0,max:1000,a0:-Math.PI/2,a1:Math.PI*1.5,val:alt%1000,major:100,minor:50,labels:v=>v<1000?String(v/100):null,needle2:clamp(alt/10000,0,1),read:String(Math.round(alt)),label:'Height m'});x+=dw;
  dial(x,midY,r,{min:-30,max:30,a0:Math.PI*0.15,a1:Math.PI*1.85,val:p.vs,major:10,minor:5,labels:v=>String(Math.abs(v/10)),read:(p.vs>=0?'+':'')+p.vs.toFixed(1),label:'Climb m/s'});x+=dw;
  const ap=g.ap;compass(x,midY,r,p,ap);x+=dw/2+10;
  // systems
  const sx=x,rowH=Math.min(30,(ch-12)/3),r1=top+12+rowH*0.5,r2=r1+rowH,r3=r2+rowH;
  const lab=(t,yy)=>{hx.fillStyle='rgba(235,229,203,.8)';hx.font=`700 13px ${FONT}`;hx.textAlign='left';hx.fillText(t,sx,yy+4);};
  const bl=Math.sin(g.t*10)>0,fm=Math.abs(p.flapPos-FLAP_POS[p.flap])>0.02;
  lab('Flaps',r1);FLAP_ORDER.forEach((k,i)=>{lamp(sx+50+i*36,r1-2,5,p.flap===k&&(!fm||bl),'227,163,58');hx.fillStyle=p.flap===k?'#ebe5cb':'rgba(235,229,203,.45)';hx.font=`700 11px ${FONT}`;hx.textAlign='left';hx.fillText(['TO','CR','LD'][i],sx+50+i*36+9,r1+2);});
  lab('Gear',r2);const gm=p.gearPos>0.02&&p.gearPos<0.98;for(let i=0;i<3;i++)lamp(sx+50+i*20,r2-2,5,gm?bl:p.gearPos>=0.98,gm?'230,70,50':'120,220,100');
  lab('Power',r3);const tw=compact?60:84;hx.fillStyle='#0f120c';hx.fillRect(sx+50,r3-6,tw,9);hx.fillStyle=p.ab>0.5?'#ff8a3a':'#e3a33a';hx.fillRect(sx+50,r3-6,tw*p.thr,9);
  hx.fillStyle='rgba(235,229,203,.65)';hx.font=`700 11px ${FONT}`;hx.fillText(p.ab>0.5?'Afterburner':`${Math.round(p.thr*100)}%`,sx+56+tw,r3+3);
  if(p.onGround){lamp(sx+128,r2-2,5,!!p.brake,'230,70,50');hx.fillStyle='rgba(235,229,203,.6)';hx.fillText('Brakes',sx+137,r2+2);}
  x=sx+(compact?140:190);
  // approach block
  if(R-x>150){const bx=x;hx.fillStyle='#1d2318';rr(hx,bx,top+10,R-bx,ch-20,4);hx.fill();hx.textAlign='left';
    if(ap){hx.fillStyle='rgba(235,229,203,.85)';hx.font=`700 14px ${FONT}`;hx.fillText(`Runway ${ap.e.name}, ${(Math.max(0,ap.along)/1000).toFixed(1)} km`,bx+12,top+30);
      const wn=Math.max(0,Math.min(4,Math.round((ap.gs+0.5)/0.33+2)));for(let i=0;i<4;i++)lamp(bx+18+i*20,top+48,6,true,i<wn?'255,255,255':'235,60,45');
      const msg=ap.along<-50?'Over the runway':wn>=4?'Too high':wn===3?'Slightly high':wn===2?'On the glide path':wn===1?'Slightly low':'Too low';hx.fillStyle='rgba(235,229,203,.7)';hx.font=`700 13px ${FONT}`;hx.fillText(msg,bx+104,top+52);
      const sw=Math.min(150,R-bx-24),cy=top+ch-34;hx.strokeStyle='rgba(235,229,203,.5)';hx.lineWidth=1;
      for(let i=-2;i<=2;i++){circ(hx,bx+12+sw/2+i*sw/5,cy,2.5);hx.stroke();}const ld=clamp(-ap.loc/2.5,-1,1);hx.fillStyle='#ff5ad8';hx.beginPath();const lx=bx+12+sw/2+ld*sw*0.4;hx.moveTo(lx,cy-6);hx.lineTo(lx+6,cy);hx.lineTo(lx,cy+6);hx.lineTo(lx-6,cy);hx.fill();
      hx.fillStyle='rgba(235,229,203,.6)';hx.font=`700 11px ${FONT}`;hx.fillText(Math.abs(ap.lat)<15?'On the centreline':ap.lat>0?'Right of centreline, steer left':'Left of centreline, steer right',bx+12,cy+20);}
    else{hx.fillStyle='rgba(235,229,203,.8)';hx.font=`700 14px ${FONT}`;hx.fillText('No runway ahead',bx+12,top+30);hx.fillStyle='rgba(235,229,203,.55)';hx.font=`700 13px ${FONT}`;hx.fillText('Turn toward Lahore airport to see approach guidance',bx+12,top+50,R-bx-24);}}
  // top-left objectives
  const lines=objectives(g);const ox=SAFE.l+12,oy=SAFE.t+12;hx.font=`700 15px ${FONT}`;let ow=0;for(const l of lines)ow=Math.max(ow,hx.measureText(l[0]).width);ow=Math.min(Math.max(ow,180)+40,W*0.6);
  const oh=30+lines.length*21;hx.fillStyle='rgba(20,24,17,.6)';rr(hx,ox,oy,ow,oh,3);hx.fill();hx.fillStyle='#ebe5cb';hx.font=`400 15px ${DISPLAY}`;hx.textAlign='left';hx.fillText(g.M.name,ox+12,oy+21);
  lines.forEach((l,i)=>{const yy=oy+44+i*21;hx.font=`700 15px ${FONT}`;if(l[1]!==null){hx.strokeStyle=l[1]?'#86d36f':'rgba(235,229,203,.6)';hx.lineWidth=1.5;hx.strokeRect(ox+12,yy-10,10,10);if(l[1]){hx.beginPath();hx.moveTo(ox+14,yy-5);hx.lineTo(ox+17,yy-2);hx.lineTo(ox+21,yy-9);hx.stroke();}}hx.fillStyle=l[1]?'#b9e3a7':'#ebe5cb';hx.fillText(l[0],ox+(l[1]===null?12:28),yy,ow-40);});
  drawRadar(g);
  // warnings
  const w=warnings(g);g.warn=w.includes('Stall')||w.includes('Pull up');if(w.length&&Math.sin(g.t*9)>-0.3){let y=SAFE.t+oh+40;hx.font=`400 18px ${DISPLAY}`;hx.textAlign='center';for(const t of w){const tw2=hx.measureText(t).width+26;hx.fillStyle='rgba(194,59,43,.9)';rr(hx,W/2-tw2/2,y-20,tw2,28,3);hx.fill();hx.fillStyle='#fff3e8';hx.fillText(t,W/2,y+1);y+=34;}}
  let ty=viewH*0.3;for(const t of g.toasts){const age=g.t-t.t;if(age>2.6)continue;const a=age<0.2?age/0.2:age>2?1-(age-2)/0.6:1;hx.globalAlpha=a;hx.font=`700 20px ${FONT}`;hx.textAlign='center';const tw3=hx.measureText(t.text).width+28;hx.fillStyle='rgba(20,24,17,.6)';rr(hx,W/2-tw3/2,ty-22,tw3,32,3);hx.fill();hx.fillStyle='#ebe5cb';hx.fillText(t.text,W/2,ty);hx.globalAlpha=1;ty+=40;}
  hx.font=`700 13px ${FONT}`;hx.textAlign='left';hx.fillStyle='rgba(0,0,0,.35)';hx.fillText('@harrisbasra™',SAFE.l+13,viewH-11);hx.fillStyle='rgba(255,255,255,.65)';hx.fillText('@harrisbasra™',SAFE.l+12,viewH-12);
  hx.font=`700 11px ${FONT}`;hx.textAlign='right';hx.fillStyle='rgba(235,229,203,.4)';hx.fillText('Ту-95 Bear 3D by @harrisbasra™',R,top+ch-2);
}
function drawCockpitFrame(){const c=hx;const g=c.createLinearGradient(0,viewH*0.72,0,viewH);g.addColorStop(0,'#1d2126');g.addColorStop(1,'#111417');c.fillStyle=g;
  c.beginPath();c.moveTo(0,viewH);c.lineTo(0,viewH*0.86);c.quadraticCurveTo(W*0.5,viewH*0.8,W,viewH*0.86);c.lineTo(W,viewH);c.fill();
  c.fillStyle='#16191d';c.beginPath();c.moveTo(W*0.18,0);c.lineTo(W*0.23,0);c.lineTo(W*0.2,viewH*0.83);c.lineTo(W*0.16,viewH*0.86);c.fill();c.beginPath();c.moveTo(W*0.82,0);c.lineTo(W*0.77,0);c.lineTo(W*0.8,viewH*0.83);c.lineTo(W*0.84,viewH*0.86);c.fill();
  c.fillRect(0,0,W,Math.max(18,viewH*0.05));c.fillStyle='rgba(120,180,120,.85)';c.font=`700 13px ${FONT}`;c.textAlign='center';c.fillText('Cockpit view: press C to change camera',W/2,viewH*0.86+18);}
function drawRadar(g){const p=g.plane,rad=Math.min(78,W*0.11),cx=W-SAFE.r-12-rad,cy=SAFE.t+62+rad;const range=p.pos.length()>14000?30000:9000;const k=rad/range;
  hx.save();hx.fillStyle='rgba(20,24,17,.62)';circ(hx,cx,cy,rad+4);hx.fill();circ(hx,cx,cy,rad);hx.clip();
  const X=x=>cx+(x-p.pos.x)*k,Y=z=>cy+(z-p.pos.z)*k;
  hx.fillStyle='rgba(210,190,150,.07)';for(const c of CITY_C){hx.beginPath();hx.arc(X(c.x),Y(c.z),Math.sqrt(c.s2/2)*k*1.2,0,7);hx.fill();}
  hx.strokeStyle='rgba(110,150,170,.7)';hx.lineWidth=3;hx.beginPath();RAVI.forEach((q,i)=>i?hx.lineTo(X(q.x),Y(q.z)):hx.moveTo(X(q.x),Y(q.z)));hx.stroke();
  hx.strokeStyle='#ebe5cb';hx.lineWidth=2.5;for(const rw of RWYS){hx.beginPath();hx.moveTo(X(rw.A.x),Y(rw.A.z));hx.lineTo(X(rw.B.x),Y(rw.B.z));hx.stroke();}
  for(const r of g.rings){hx.fillStyle=r.state==='ok'?'#86d36f':r.state==='next'?'#ffbe46':'rgba(255,190,70,.5)';circ(hx,X(r.x),Y(r.z),3.5);hx.fill();}
  for(const lm of [LANDMARKS.minar,LANDMARKS.badshahi]){hx.fillStyle='#e9d9b0';circ(hx,X(lm.x),Y(lm.z),2.5);hx.fill();}
  hx.fillStyle='rgba(235,229,203,.8)';hx.font=`700 10px ${FONT}`;hx.textAlign='center';hx.fillText('Minar',X(LANDMARKS.minar.x),Y(LANDMARKS.minar.z)-6);hx.fillText('OPLA',X(-60),Y(-1900));
  hx.restore();hx.save();hx.translate(cx,cy);hx.rotate(p.hdg);hx.fillStyle='#ffe08a';hx.beginPath();hx.moveTo(0,-8);hx.lineTo(5,6);hx.lineTo(0,3);hx.lineTo(-5,6);hx.fill();hx.restore();
  hx.fillStyle='rgba(235,229,203,.8)';hx.font=`700 11px ${FONT}`;hx.textAlign='center';hx.fillText('N',cx,cy-rad+11);hx.fillText(`${range/1000} km`,cx,cy+rad-4);}
/* ---------- cloud saves (Firebase, optional) ---------- */
const CLOUD={ready:false,user:null,api:null,
  async init(){const cfg=window.TU95_FIREBASE;if(!cfg||!cfg.apiKey)return;try{
      const v='10.12.2',base=`https://www.gstatic.com/firebasejs/${v}/`;
      const [app,auth,fs]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);
      const a=app.initializeApp(cfg);const au=auth.getAuth(a);const db=fs.getFirestore(a);this.api={auth,fs,au,db};this.ready=true;
      auth.onAuthStateChanged(au,async u=>{this.user=u;if(u){await this.load();}renderCloud();});renderCloud();}catch(e){console.warn('Cloud saves unavailable',e);}},
  async signIn(){if(!this.ready)return;const {auth,au}=this.api;try{await auth.signInWithPopup(au,new auth.GoogleAuthProvider());}catch(e){toastMenu('Sign-in was cancelled or blocked.');}},
  async signOut(){if(this.ready)await this.api.auth.signOut(this.api.au);},
  async load(){const {fs,db}=this.api;try{const snap=await fs.getDoc(fs.doc(db,'pilots',this.user.uid));if(snap.exists()){const d=snap.data();
      if(d.name&&!progress.name)progress.name=d.name;const st=d.progress&&d.progress.stars||[];for(let i=0;i<st.length;i++)progress.stars[i]=Math.max(progress.stars[i]||0,st[i]||0);save();buildMenu();}
      await this.save();}catch(e){console.warn(e);}},
  async save(){if(!this.ready||!this.user)return;const {fs,db}=this.api;try{await fs.setDoc(fs.doc(db,'pilots',this.user.uid),{name:progress.name||this.user.displayName||'Pilot',progress:{stars:progress.stars,plane:progress.plane},updatedAt:fs.serverTimestamp()},{merge:true});}catch(e){console.warn(e);}}};
function renderCloud(){const el=$('#cloud');if(!el)return;if(!CLOUD.ready){el.hidden=true;return;}el.hidden=false;
  el.querySelector('#cloud-status').textContent=CLOUD.user?`Signed in as ${CLOUD.user.displayName||CLOUD.user.email}. Progress saves online.`:'Sign in to keep your pilot name and stars on every device.';
  el.querySelector('#cloud-btn').textContent=CLOUD.user?'Sign out':'Sign in with Google';}
function toastMenu(t){const el=$('#pinfo');if(el)el.textContent=t;}
/* ---------- menu ---------- */
let thumbR=null,thumbScene=null,thumbCam=null;const thumbCache={};
function thumbFor(sp,cv){
  if(!thumbR){thumbR=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});thumbR.setSize(240,96);thumbR.outputEncoding=THREE.sRGBEncoding;
    thumbScene=new THREE.Scene();thumbScene.add(new THREE.HemisphereLight('#dfe9f2','#6b6550',0.9));const dl=new THREE.DirectionalLight('#ffffff',0.9);dl.position.set(30,50,40);thumbScene.add(dl);thumbCam=new THREE.PerspectiveCamera(28,2.5,1,1000);}
  const A=thumbCache[sp.id]||(thumbCache[sp.id]=buildAircraft(sp));const st={spec:sp,rpm:0,engineMax:1,v:0,flapPos:0,sweep:sp.swing?sp.swing.min:0,gearPos:1,ab:0};setAircraftState(A,st,0);
  thumbScene.add(A.g);const d=sp.len*1.75;thumbCam.position.set(-d*0.25,d*0.3,d*0.95);thumbCam.lookAt(-1,-1,0);thumbR.render(thumbScene,thumbCam);thumbScene.remove(A.g);
  const c=cv.getContext('2d');cv.width=480;cv.height=192;const gr=c.createLinearGradient(0,0,0,192);gr.addColorStop(0,'#7fa6c6');gr.addColorStop(1,'#c9d6d6');c.fillStyle=gr;c.fillRect(0,0,480,192);c.drawImage(thumbR.domElement,0,0,480,192);}
function buildMenu(){
  const ol=$('#log');ol.innerHTML='';
  MISSIONS3.forEach((m,i)=>{const li=document.createElement('li');const b=document.createElement('button');b.setAttribute('aria-pressed',String(progress.mission===i));const st=progress.stars[i]||0;
    b.innerHTML=`<span class="n">${i+1}</span><span><span class="nm"></span><span class="sm"></span></span><span class="st" aria-label="${st} of 3 stars">${'★'.repeat(st)}<span class="off">${'★'.repeat(3-st)}</span></span>`;
    b.querySelector('.nm').textContent=m.name;b.querySelector('.sm').textContent=m.summary;
    b.addEventListener('click',()=>{progress.mission=i;save();buildMenu();});li.appendChild(b);ol.appendChild(li);});
  const box=$('#planes');if(!box.children.length){AIRCRAFT.forEach(sp=>{const b=document.createElement('button');b.className='pl';b.setAttribute('role','radio');b.dataset.id=sp.id;
      const cv=document.createElement('canvas');b.appendChild(cv);const n=document.createElement('span');n.className='pn';n.textContent=sp.name;const r=document.createElement('span');r.className='pr';r.textContent=sp.role;b.append(n,r);
      b.addEventListener('click',()=>{progress.plane=sp.id;save();buildMenu();startAttract();});box.appendChild(b);try{thumbFor(sp,cv);}catch(e){}});}
  for(const b of box.children)b.setAttribute('aria-checked',String(b.dataset.id===progress.plane));
  const sp=currentSpec();$('#pinfo').innerHTML='';const s=document.createElement('strong');s.textContent=`${sp.name} “${sp.nick}”. `;$('#pinfo').append(s,document.createTextNode(`${sp.feel} Lifts off near ${sp.rotKmh} km/h; approach at about ${sp.appKmh} km/h.`));
  $('#o-assist').checked=progress.assist;$('#o-land').checked=progress.landAssist;$('#o-invert').checked=progress.invert;$('#o-sound').checked=progress.sound;$('#o-hq').checked=progress.hq;
  $('#pilot').value=progress.name||'';}
function show(el,v){el.classList.toggle('hidden',!v);}
let isTouch=matchMedia('(pointer: coarse)').matches;
function startAttract(){game=newGame(progress.mission||0,'attract');}
function toMenu(){show($('#result'),false);show($('#pause'),false);show($('#touch'),false);show($('#btn-pause'),false);show($('#btn-cam'),false);startAttract();buildMenu();show($('#menu'),true);}
function startFlight(){AU.init();show($('#menu'),false);show($('#result'),false);show($('#pause'),false);game=newGame(progress.mission||0,'play');show($('#btn-pause'),true);show($('#btn-cam'),true);show($('#touch'),isTouch);
  toast(game,game.M.summary);acc=0;}
function showResult(g){show($('#touch'),false);show($('#btn-pause'),false);show($('#btn-cam'),false);const ok=g.status==='success';
  $('#r-title').textContent=ok?'Mission complete':'Mission failed';$('#r-reason').textContent=g.reason;const st=ok?g.starsWon:0;$('#r-stars').innerHTML=ok?`${'★'.repeat(st)}<span class="off">${'★'.repeat(3-st)}</span>`:'';
  const dl=$('#r-stats');dl.innerHTML='';const add=(k,v)=>{const a=document.createElement('dt');a.textContent=k;const b=document.createElement('dd');b.textContent=v;dl.append(a,b);};
  add('Pilot',progress.name||'Unnamed pilot');add('Aircraft',g.plane.spec.name);add('Flight time',`${Math.floor(g.time/60)}:${String(Math.floor(g.time%60)).padStart(2,'0')}`);
  if(g.stats.sink!==null){add('Touchdown',`${g.stats.sink.toFixed(1)} m/s`);add('From centreline',`${g.stats.offset.toFixed(0)} m`);}
  if(ok&&st<3&&g.M.key!=='depart')add('Three stars','Touch down at 1.5 m/s or less within 8 m of the centreline');
  show($('#result'),true);setTimeout(()=>$('#r-retry').focus({preventScroll:true}),30);}
function pause(v){if(!game||(game.mode!=='play'&&game.mode!=='paused'))return;if(v&&game.mode==='play'&&!game.shown){game.mode='paused';$('#p-assist').checked=game.opts.assist;$('#p-land').checked=game.opts.landAssist;$('#p-invert').checked=progress.invert;show($('#pause'),true);show($('#touch'),false);}
  else if(!v&&game.mode==='paused'){game.mode='play';show($('#pause'),false);show($('#touch'),isTouch);last=performance.now();}}
/* ---------- input ---------- */
const KEYS={};
function readKeys(){let pitch=(KEYS.ArrowUp?1:0)-(KEYS.ArrowDown?1:0);if(progress.invert)pitch=-pitch;
  IN.pitch=clamp(pitch+IN.stickP,-1,1);IN.roll=clamp((KEYS.ArrowRight?1:0)-(KEYS.ArrowLeft?1:0)+IN.stickR,-1,1);IN.yaw=(KEYS.KeyD?1:0)-(KEYS.KeyA?1:0);
  IN.thrUp=!!KEYS.KeyW;IN.thrDown=!!KEYS.KeyS;IN.brake=!!KEYS.KeyB||IN.touchBrake;}
function act(name){const g=game;if(!g||g.mode!=='play'||g.status!=='play')return;const p=g.plane;if(!p.alive)return;
  if(name==='flaps'){const i=FLAP_ORDER.indexOf(p.flap);p.flap=FLAP_ORDER[(i+1)%3];toast(g,`Flaps: ${FLAP_LABEL[p.flap].toLowerCase()}`);AU.clunk();}
  if(name==='gear'){if(p.onGround){toast(g,'The gear can’t come up on the ground');return;}p.gearDown=!p.gearDown;toast(g,p.gearDown?'Gear coming down':'Gear coming up');AU.clunk();}}
addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT'&&e.target.type==='text')return;const playing=game&&game.mode==='play';
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();KEYS[e.code]=true;
  if(!playing){if((e.code==='KeyP'||e.code==='Escape')&&game&&game.mode==='paused')pause(false);return;}
  if(e.repeat)return;if(e.code==='KeyF')act('flaps');if(e.code==='KeyG')act('gear');if(e.code==='KeyC')cycleCam();if(e.code==='KeyP'||e.code==='Escape')pause(true);if(e.code==='KeyR')startFlight();});
addEventListener('keyup',e=>{KEYS[e.code]=false;});
addEventListener('blur',()=>{for(const k in KEYS)KEYS[k]=false;pause(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){for(const k in KEYS)KEYS[k]=false;pause(true);}});
(function touch(){const st=$('#stick'),kn=$('#knob');let id=null;const R=56;
  const mv=e=>{const r=st.getBoundingClientRect();let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);const l=Math.hypot(dx,dy);if(l>R){dx*=R/l;dy*=R/l;}kn.style.transform=`translate(${dx}px,${dy}px)`;IN.stickR=dx/R;IN.stickP=(progress.invert?1:-1)*dy/R;};
  st.addEventListener('pointerdown',e=>{id=e.pointerId;st.setPointerCapture(id);mv(e);});st.addEventListener('pointermove',e=>{if(e.pointerId===id)mv(e);});
  const up=()=>{id=null;kn.style.transform='';IN.stickP=0;IN.stickR=0;};st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
  const th=$('#thr'),lv=$('#thr-lvl');const tm=e=>{const r=th.getBoundingClientRect();const v=clamp(1-(e.clientY-r.top)/r.height,0,1);IN.thrSet=v;lv.style.height=(v*100)+'%';};
  th.addEventListener('pointerdown',e=>{th.setPointerCapture(e.pointerId);tm(e);});th.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')tm(e);});th.addEventListener('pointerup',()=>{IN.thrSet=null;});
  document.querySelectorAll('#touch [data-press]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();act(b.dataset.press);}));
  document.querySelectorAll('#touch [data-hold]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();IN.touchBrake=true;b.classList.add('on');});const o=()=>{IN.touchBrake=false;b.classList.remove('on');};b.addEventListener('pointerup',o);b.addEventListener('pointercancel',o);});
  addEventListener('touchstart',()=>{if(!isTouch){isTouch=true;if(game&&game.mode==='play')show($('#touch'),true);}},{passive:true});})();
/* ---------- wiring ---------- */
function wire(){
  $('#btn-go').addEventListener('click',startFlight);
  $('#btn-keys').addEventListener('click',e=>{const k=$('#keys');k.hidden=!k.hidden;e.currentTarget.setAttribute('aria-expanded',String(!k.hidden));});
  $('#o-assist').addEventListener('change',e=>{progress.assist=e.target.checked;save();});$('#o-land').addEventListener('change',e=>{progress.landAssist=e.target.checked;save();});
  $('#o-invert').addEventListener('change',e=>{progress.invert=e.target.checked;save();});$('#o-sound').addEventListener('change',e=>{AU.init();AU.setOn(e.target.checked);});
  $('#o-hq').addEventListener('change',e=>{progress.hq=e.target.checked;save();renderer.shadowMap.enabled=progress.hq;resize();scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});});
  $('#pilot').addEventListener('change',e=>{progress.name=e.target.value.trim().slice(0,24);save();CLOUD.save();});
  $('#cloud-btn').addEventListener('click',()=>{CLOUD.user?CLOUD.signOut():CLOUD.signIn();});
  $('#r-retry').addEventListener('click',startFlight);$('#r-menu').addEventListener('click',toMenu);
  $('#p-resume').addEventListener('click',()=>pause(false));$('#p-restart').addEventListener('click',startFlight);$('#p-menu').addEventListener('click',toMenu);
  $('#p-assist').addEventListener('change',e=>{game.opts.assist=progress.assist=e.target.checked;save();});$('#p-land').addEventListener('change',e=>{game.opts.landAssist=progress.landAssist=e.target.checked;save();});
  $('#p-invert').addEventListener('change',e=>{progress.invert=e.target.checked;save();});
  $('#btn-pause').addEventListener('click',()=>pause(true));$('#btn-cam').addEventListener('click',cycleCam);
  addEventListener('resize',resize);}
/* ---------- loop ---------- */
let last=performance.now(),acc=0;
function step(g,dt){g.t+=dt;if(g.mode==='play'){stepPlane(g,dt);missionUpdate(g,dt);}stepFx(g,dt);
  if(g.status!=='play'&&!g.shown&&g.t>=g.endT&&g.mode==='play'){g.shown=true;showResult(g);}}
function frame(now){const dt=Math.min(0.05,(now-last)/1000);last=now;const g=game;
  if(g&&(g.mode==='play'||g.mode==='attract')){readKeys();acc+=dt;const h=1/120;let n=0;while(acc>=h&&n<10){step(g,h);acc-=h;n++;}if(n>=10)acc=0;}
  if(g){const p=g.plane;setAircraftState(g.A,p,dt);syncModel(g);
    const L=g.A.parts.lights;L.beacon.visible=Math.sin(g.t*7)>0.5;
    updateCamera(g,dt);g.ap=g.mode==='play'?approach(g):null;updatePapi(g);
    const sd=W3.sunDir||new THREE.Vector3(0.5,0.85,0.35);sun.position.copy(p.pos).addScaledVector(sd,600);sun.target.position.copy(p.pos);
    W3.sky.position.copy(camera.position);
    renderer.render(scene,camera);drawHUD(g);
    const active=g.mode==='play'&&p.alive;AU.update(p.rpm,p.v,!!g.warn&&active,active,!p.spec.prop,p.ab);}
  requestAnimationFrame(frame);}
function boot(){
  if(!window.THREE){$('#loading').textContent='Couldn’t load the 3D engine. Check your connection and reload.';return;}
  renderer=new THREE.WebGLRenderer({canvas:glCanvas,antialias:true,logarithmicDepthBuffer:true});maxAniso=renderer.capabilities.getMaxAnisotropy();
  renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=progress.hq;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  buildWorld();resize();wire();startAttract();buildMenu();show($('#loading'),false);show($('#menu'),true);requestAnimationFrame(frame);CLOUD.init();}
window.__bear3d={get game(){return game;},step,IN,act,startFlight,newGame,AIRCRAFT,progress,save,ENDS,RWYS,setPlane:id=>{progress.plane=id;},setMission:i=>{progress.mission=i;}};
boot();
})();
