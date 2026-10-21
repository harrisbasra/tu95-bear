
/* ---------- 3D cockpits ---------- */
// Built as real geometry in the aircraft's frame, around the captain's eye point, and only while the cockpit view is in use.
// Airliners get a glass cockpit: PFD, ND and engine displays drawn live into canvas textures, an MCP (Boeing) or
// FCU (Airbus) you can click, an overhead panel, yoke or sidestick, thrust, flap, speedbrake and gear levers.
// Bombers and transports get a classic panel of round gauges in the same spirit.
// Instruments use knots, feet and feet per minute, like the real aircraft.
const CK={built:null,group:null,displays:[],levers:{},mcp:null,t:0,next:0,look:{yaw:0,pitch:0},raycaster:null};
const QUALITY={low:{px:256,hz:5,shadows:false,dpr:1},medium:{px:384,hz:10,shadows:true,dpr:1.5},high:{px:512,hz:18,shadows:true,dpr:2}};
function qual(){return QUALITY[progress.quality]||QUALITY.high;}
function ckColors(sp){if(sp.cockpitType==='airbus')return{panel:'#6f7f8e',dark:'#3c4650',trim:'#55626e'};if(sp.cockpitType==='boeing')return{panel:'#5b656d',dark:'#30363b',trim:'#474f56'};
  if(sp.id==='tu95'||sp.id==='tu160')return{panel:'#3f8a86',dark:'#24403f',trim:'#2f6763'};return{panel:'#33383b',dark:'#202326',trim:'#2a2e31'};}
function ckDisplay(w,h,draw,parent,pos,tilt,fixed){const px=qual().px,cw=Math.round(px*(w/h>1?w/h:1)),ch=Math.round(px*(h/w>1?h/w:1));
  const cv=document.createElement('canvas');cv.width=cw;cv.height=ch;const tx=new THREE.CanvasTexture(cv);tx.encoding=THREE.sRGBEncoding;tx.anisotropy=4;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h).rotateY(-Math.PI/2),new THREE.MeshBasicMaterial({map:tx,toneMapped:false}));m.position.set(...pos);if(tilt)m.rotation.z=-tilt;parent.add(m);
  const d={cv,c:cv.getContext('2d'),tx,draw,mesh:m,fixed};CK.displays.push(d);return d;}
function buildCockpit(sp){
  CK.displays=[];CK.levers={};CK.mcp=null;
  const col=ckColors(sp),glass=sp.cat==='airliner';const top=new THREE.Group(),grp=new THREE.Group();grp.position.y=-0.08;top.add(grp);
  const M=c=>new THREE.MeshLambertMaterial({color:c}),pm=M(col.panel),dm=M(col.dark),tm=M(col.trim),blk=M('#16191c'),metal=new THREE.MeshStandardMaterial({color:'#9aa0a4',metalness:0.8,roughness:0.35});
  const bx=(w,h,d,m,x,y,z,rz,up)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(d,h,w),m);b.position.set(x,y,z);if(rz)b.rotation.z=rz;(up?top:grp).add(b);return b;};
  const wide=sp.cat==='airliner'&&sp.geo.D>5;const half=wide?1.15:1.0;
  // main panel, tilted back, with the glare shield above it
  const tilt=0.26;bx(half*2,0.5,0.06,pm,0.83,-0.36,0,-tilt);
  bx(half*2,0.07,0.24,dm,0.74,-0.09,0);bx(half*2,0.085,0.03,dm,0.625,-0.115,0);
  // windshield frame: centre post, side posts, top bar, side-window posts
  bx(0.045,0.5,0.045,blk,0.9,0.05,0,-0.6,1);for(const s of [-1,1]){bx(0.05,0.52,0.05,blk,0.82,0.04,s*half*0.86,-0.55,1);bx(0.05,0.5,0.05,blk,0.3,0.02,s*half*1.0,0,1);bx(0.05,0.5,0.05,blk,-0.25,0.02,s*half*1.02,0,1);}
  bx(half*2,0.07,0.5,blk,0.6,0.33,0,0,1);
  // side walls below the sills, floor and the ceiling behind the overhead panel
  for(const s of [-1,1]){bx(0.06,0.9,1.6,tm,0.05,-0.58,s*(half*1.03));bx(0.25,0.05,1.5,dm,0.05,-0.12,s*(half*0.94));}
  bx(half*2.1,0.05,1.9,blk,0,-1.05,0);bx(half*2.1,0.05,1.2,tm,-0.25,0.5,0,0,1);
  // overhead panel
  const ov=ckDisplay(1.0,0.8,drawOverhead,top,[0.25,0.45,0],0,true);ov.mesh.geometry=new THREE.PlaneGeometry(half*1.2,0.85).rotateY(-Math.PI/2).rotateZ(Math.PI/2+0.35);ov.mesh.position.set(0.22,0.43,0);
  // pedestal with thrust levers, flap lever and speedbrake
  bx(0.36,0.32,0.75,dm,0.28,-0.62,0);bx(0.34,0.03,0.7,tm,0.28,-0.455,0);
  const nEng=Math.min(sp.engines,8),thr=[];for(let i=0;i<nEng;i++){const z=lerp(-0.09,0.09,nEng===1?0.5:i/(nEng-1));const piv=new THREE.Group();piv.position.set(0.4,-0.45,z);grp.add(piv);
    const lv=new THREE.Mesh(new THREE.BoxGeometry(0.025,0.17,0.018),metal);lv.position.y=0.085;piv.add(lv);const kn=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.03,nEng>4?0.03:0.045),M('#202326'));kn.position.y=0.17;piv.add(kn);thr.push(piv);}
  const flap=new THREE.Group();flap.position.set(0.32,-0.45,0.14);grp.add(flap);{const l=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.12,0.02),metal);l.position.y=0.06;flap.add(l);const k=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.035,0.05),M('#d8d8d0'));k.position.y=0.12;flap.add(k);}
  const sbk=new THREE.Group();sbk.position.set(0.32,-0.45,-0.14);grp.add(sbk);{const l=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.11,0.02),metal);l.position.y=0.055;sbk.add(l);const k=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.025,0.03),M('#404448'));k.position.y=0.11;sbk.add(k);}
  // gear lever on the centre panel, to the right
  const gear=new THREE.Group();gear.position.set(0.74,-0.43,glass?0.2:-0.02);grp.add(gear);{const l=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.1,0.02),metal);l.position.y=0.05;gear.add(l);const k=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.035,14),M('#e8e6dc'));k.rotation.x=Math.PI/2;k.position.y=0.1;gear.add(k);}
  // control column and yoke, or sidesticks
  const yokes=[],sticks=[];
  if(sp.cockpitType==='airbus'){for(const s of [-1,1]){const piv=new THREE.Group();piv.position.set(0.18,-0.48,s*(half*0.95));grp.add(piv);bx(0.12,0.08,0.3,dm,0.2,-0.53,s*(half*0.95));
      const st=new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.02,0.16,10),blk);st.position.y=0.08;piv.add(st);const gr=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.02,0.09,12),M('#2a2c2e'));gr.position.y=0.18;gr.rotation.z=-0.2;piv.add(gr);sticks.push(piv);}}
  else{for(const s of [-1,1]){const piv=new THREE.Group();piv.position.set(0.52,-1.02,s*0.53);grp.add(piv);const colm=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.5,0.06),dm);colm.position.y=0.25;piv.add(colm);
      const wheel=new THREE.Group();wheel.position.set(-0.03,0.52,0);piv.add(wheel);const hub=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.06,0.12),blk);wheel.add(hub);
      const bar=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.035,0.34),blk);bar.position.y=0.02;wheel.add(bar);for(const h of [-1,1]){const horn=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.12,0.035),blk);horn.position.set(0,0.07,h*0.16);horn.rotation.x=h*0.25;wheel.add(horn);}
      yokes.push({piv,wheel});}}
  CK.levers={thr,flap,sbk,gear,yokes,sticks};
  // displays
  if(glass){const dw=wide?0.22:0.2,y=-0.34;
    const DU=(draw,z,yy,w,h,side)=>{const d=ckDisplay(w||dw,h||dw,draw,grp,[0.79-(yy-y)*Math.tan(tilt)+0.002,yy,z],tilt);d.side=side;bx((w||dw)+0.03,(h||dw)+0.03,0.012,blk,0.805-(yy-y)*Math.tan(tilt),yy,z,-tilt);return d;};
    DU(drawPFD,-half*0.62,y,0,0,-1);DU(drawND,-half*0.38,y,0,0,-1);DU(drawEngines,0,y+0.01);DU(drawLower,0,y-0.24,dw,dw*0.9);DU(drawND,half*0.38,y,0,0,1);DU(drawPFD,half*0.62,y,0,0,1);
    // MCP or FCU across the glare shield, which you can click
    const m=ckDisplay(0.86,0.072,drawMCP,grp,[0.607,-0.115,0],0);CK.mcp=m;}
  else{const d=ckDisplay(0.95,0.38,drawClassic,grp,[0.775,-0.4,-0.5],tilt);d.side=-1;const d2=ckDisplay(0.66,0.36,drawClassicEng,grp,[0.775,-0.4,0.34],tilt);}
  for(const d of CK.displays)d.draw(d.c,d.cv.width,d.cv.height,null,d);for(const d of CK.displays)d.tx.needsUpdate=true;
  return top;}
// the captain's eye, kept inside the fuselage crown at that station
function cockpitEye(sp){if(sp.eye)return sp.eye;let y=sp.cockpit[1]+(sp.cat==='airliner'?0:0.3);
  if(sp.model){const S=sp.model.fus.slice().sort((a,b)=>b[0]-a[0]),x=sp.cockpit[0];for(let i=0;i<S.length-1;i++)if(x<=S[i][0]&&x>=S[i+1][0]){const t=(S[i][0]-x)/(S[i][0]-S[i+1][0]);y=Math.min(y,lerp(S[i][1],S[i+1][1],t)-0.3);}}
  return sp.eye=[sp.cockpit[0],y,sp.cat==='airliner'?-0.53:-0.45];}
function attachCockpit(g){const sp=g.plane.spec;if(CK.built===g.A){CK.group.visible=true;return;}
  const grp=buildCockpit(sp);const e=cockpitEye(sp);grp.position.set(e[0],e[1],0);g.A.g.add(grp);CK.group=grp;CK.built=g.A;
  for(const d of CK.displays)if(!d.fixed){d.draw(d.c,d.cv.width,d.cv.height,g,d);d.tx.needsUpdate=true;}}
function detachCockpit(){if(CK.group)CK.group.visible=false;}
// per frame: move the levers every frame, redraw one display at a time at the quality's update rate
function updateCockpit(g,dt){if(!CK.group||!CK.group.visible)return;const p=g.plane,L=CK.levers,ci=p.cin||{pin:0,rin:0};
  for(const t of L.thr)t.rotation.z=0.45-p.thr*0.8+p.rev*0.3;
  L.flap.position.x=0.36-p.flapPos*0.16;L.sbk.position.x=0.32-Math.max(p.spd,p.gsp)*0.12;L.gear.position.y=p.gearDown?-0.47:-0.43;
  for(const y of L.yokes){y.piv.rotation.z=-ci.pin*0.12;y.wheel.rotation.x=ci.rin*0.75;}
  for(const s of L.sticks){s.rotation.z=ci.pin*0.3;s.rotation.x=ci.rin*0.3;}
  CK.t+=dt;const live=CK.displays.filter(d=>!d.fixed);if(!live.length)return;const per=1/(qual().hz*live.length);
  if(CK.t>=CK.next){CK.next=CK.t+per;CK.i=((CK.i||0)+1)%live.length;const d=live[CK.i];d.draw(d.c,d.cv.width,d.cv.height,g,d);d.tx.needsUpdate=true;}}

/* ---- display drawing (all in a 512-unit square, scaled to the canvas) ---- */
const CKF=(s,b)=>`${b?700:400} ${s}px ${FONT}`;
function frame512(c,w,h){c.setTransform(w/512,0,0,h/512,0,0);c.fillStyle='#05080a';c.fillRect(0,0,512,512);}
function txt(c,s,x,y,col,size,al,b){c.fillStyle=col;c.font=CKF(size||18,b!==false);c.textAlign=al||'left';c.fillText(s,x,y);}
function drawPFD(c,w,h,g,d){frame512(c,w,h);if(!g)return;const p=g.plane,sp=p.spec,ap=p.ap,airbus=sp.cockpitType==='airbus';
  const kt=p.ias*3.6/KT,ft=(p.pos.y+ELEV)/FT,ppd=6.2,cx=256,cy=230;
  // attitude
  c.save();c.beginPath();c.rect(120,70,272,300);c.clip();c.translate(cx,cy);c.rotate(-p.bank);const off=p.pitch*R2D*ppd;
  c.fillStyle='#2f78c4';c.fillRect(-400,-800+off,800,800);c.fillStyle='#8a5a2b';c.fillRect(-400,off,800,800);c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.moveTo(-400,off);c.lineTo(400,off);c.stroke();
  c.fillStyle='#fff';c.font=CKF(15);c.textAlign='left';for(let a=-30;a<=30;a+=2.5){if(!a)continue;const yy=off-a*ppd,wl=a%10===0?60:a%5===0?34:14;c.beginPath();c.moveTo(-wl/2,yy);c.lineTo(wl/2,yy);c.stroke();if(a%10===0){c.fillText(String(Math.abs(a)),wl/2+6,yy+5);c.textAlign='right';c.fillText(String(Math.abs(a)),-wl/2-6,yy+5);c.textAlign='left';}}
  c.restore();
  // bank scale
  c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.arc(cx,cy,130,-Math.PI/2-Math.PI/3,-Math.PI/2+Math.PI/3);c.stroke();
  for(const b of [-60,-45,-30,-20,-10,10,20,30,45,60]){const a=-Math.PI/2+b*D2R,r0=b%30===0?118:124;c.beginPath();c.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);c.lineTo(cx+Math.cos(a)*130,cy+Math.sin(a)*130);c.stroke();}
  c.fillStyle=Math.abs(p.bank)>35*D2R?'#ffb000':'#fff';const ba=-Math.PI/2-p.bank;c.beginPath();c.moveTo(cx+Math.cos(ba)*128,cy+Math.sin(ba)*128);c.lineTo(cx+Math.cos(ba-0.06)*112,cy+Math.sin(ba-0.06)*112);c.lineTo(cx+Math.cos(ba+0.06)*112,cy+Math.sin(ba+0.06)*112);c.fill();
  // flight director
  if(ap.on){c.strokeStyle=airbus?'#3cff6a':'#ff5ad8';c.lineWidth=4;const fdx=clamp((ap.fdR-p.bank)*R2D*3,-90,90),fdy=clamp(-(ap.fdP-p.pitch)*R2D*ppd,-90,90);c.beginPath();c.moveTo(cx+fdx,cy-80);c.lineTo(cx+fdx,cy+80);c.moveTo(cx-80,cy+fdy);c.lineTo(cx+80,cy+fdy);c.stroke();}
  // aircraft symbol
  c.strokeStyle=airbus?'#ffe14a':'#fff';c.fillStyle='#000';c.lineWidth=5;c.beginPath();c.moveTo(cx-90,cy);c.lineTo(cx-40,cy);c.lineTo(cx-40,cy+14);c.moveTo(cx+90,cy);c.lineTo(cx+40,cy);c.lineTo(cx+40,cy+14);c.stroke();c.fillStyle=c.strokeStyle;c.fillRect(cx-5,cy-5,10,10);
  // speed tape
  c.fillStyle='#3a4148';c.fillRect(30,70,78,300);c.save();c.beginPath();c.rect(30,70,78,300);c.clip();const kpp=3.4;
  c.strokeStyle='#fff';c.fillStyle='#fff';c.font=CKF(18);c.textAlign='right';for(let s=Math.floor(kt/10)*10-60;s<=kt+60;s+=10){if(s<30)continue;const yy=cy-(s-kt)*kpp;c.beginPath();c.moveTo(108,yy);c.lineTo(96,yy);c.stroke();if(s%20===0)c.fillText(String(s),90,yy+6);}
  const vmo=sp.vmo,vs=stallKmh(sp,p.m,p.flapPos)/KT;for(let s=vmo;s<vmo+80;s+=8){c.fillStyle=(s/8|0)%2?'#c00':'#000';c.fillRect(100,cy-(s-kt)*kpp-8,8,8);}
  c.fillStyle='#ffb000';c.fillRect(100,cy-(vs*1.13-kt)*kpp,6,(vs*0.13)*kpp);c.fillStyle='#d00';c.fillRect(100,cy-(vs-kt)*kpp,8,600);
  if(ap.at||ap.on){c.fillStyle=airbus?'#3cdcff':'#ff5ad8';const yy=cy-(ap.spd/KT-kt)*kpp;c.beginPath();c.moveTo(108,yy);c.lineTo(96,yy-8);c.lineTo(96,yy+8);c.fill();}
  const vref=vspeeds(sp,p.m).vref/KT;c.fillStyle='#3cff6a';c.font=CKF(14);c.textAlign='left';c.fillText('REF',60,cy-(vref-kt)*kpp+5);
  const trend=(p.ias*3.6/KT-(d.lastKt||kt))/Math.max(0.05,(g.t-(d.lastT||g.t-0.1)))*10;d.lastKt=kt;d.lastT=g.t;if(Math.abs(trend)>2){c.strokeStyle='#3cff6a';c.lineWidth=3;c.beginPath();c.moveTo(112,cy);c.lineTo(112,cy-clamp(trend,-40,40)*kpp);c.stroke();}
  c.restore();c.fillStyle='#000';c.strokeStyle='#fff';c.lineWidth=2;c.fillRect(34,cy-20,70,40);c.strokeRect(34,cy-20,70,40);txt(c,String(Math.round(kt)),98,cy+9,'#fff',28,'right');
  if(p.mach>0.4)txt(c,'.'+String(Math.round(p.mach*1000)).padStart(3,'0').slice(0,3),69,400,'#fff',20,'center');
  // altitude tape
  c.fillStyle='#3a4148';c.fillRect(404,70,80,300);c.save();c.beginPath();c.rect(404,70,80,300);c.clip();const fpp=0.34;
  c.strokeStyle='#fff';c.font=CKF(17);c.textAlign='left';for(let a=Math.floor(ft/100)*100-500;a<=ft+500;a+=100){const yy=cy-(a-ft)*fpp;c.beginPath();c.moveTo(404,yy);c.lineTo(416,yy);c.stroke();if(a%200===0){c.fillStyle='#fff';c.fillText(String(a),420,yy+6);}}
  if(ap.on||ap.at){c.fillStyle=airbus?'#3cdcff':'#ff5ad8';const yy=clamp(cy-(ap.alt/FT-ft)*fpp,72,368);c.fillRect(404,yy-10,8,20);}
  const gyy=cy-(ELEV/FT-ft)*fpp;c.fillStyle='#8a5a2b';c.fillRect(404,gyy,80,400);
  c.restore();c.fillStyle='#000';c.fillRect(408,cy-20,76,40);c.strokeRect(408,cy-20,76,40);txt(c,String(Math.round(ft/10)*10),480,cy+9,'#fff',26,'right');
  if(ap.on||ap.at)txt(c,airbus?String(Math.round(ap.alt/FT/100)*100):String(Math.round(ap.alt/FT)),444,60,airbus?'#3cdcff':'#ff5ad8',20,'center');
  if(ap.on||ap.at)txt(c,String(Math.round(ap.spd/KT)),69,60,airbus?'#3cdcff':'#ff5ad8',20,'center');
  // vertical speed
  const fpm=p.vs/FT*60;c.fillStyle='#3a4148';c.fillRect(488,100,22,240);c.strokeStyle='#fff';c.lineWidth=3;const vy=cy-clamp(Math.sign(fpm)*Math.sqrt(Math.abs(fpm)/6000),-1,1)*110;c.beginPath();c.moveTo(512,cy);c.lineTo(490,vy);c.stroke();
  if(Math.abs(fpm)>400)txt(c,String(Math.round(fpm/100)*100),500,fpm>0?92:356,'#fff',14,'center');
  // radio altitude
  if(p.agl<760&&!p.onGround)txt(c,String(Math.max(0,Math.round(p.agl/FT))),cx,cy+110,p.agl<FT*500?'#ffb000':'#fff',24,'center');
  // heading tape
  const hdg=((p.hdg*R2D)+360)%360;c.save();c.beginPath();c.rect(120,410,272,60);c.clip();c.fillStyle='#3a4148';c.fillRect(120,410,272,60);c.strokeStyle='#fff';c.fillStyle='#fff';c.font=CKF(16);c.textAlign='center';
  for(let a=Math.floor(hdg/5)*5-30;a<=hdg+30;a+=5){const xx=cx+(a-hdg)*4.4,aa=(a+360)%360;c.beginPath();c.moveTo(xx,410);c.lineTo(xx,aa%10===0?424:418);c.stroke();if(aa%10===0)c.fillText(String(aa/10).padStart(2,'0'),xx,442);}
  if(ap.on){c.fillStyle=airbus?'#3cdcff':'#ff5ad8';const xx=cx+wrapPi((ap.hdg-hdg)*D2R)*R2D*4.4;c.fillRect(xx-6,410,12,8);}
  c.restore();c.fillStyle='#fff';c.beginPath();c.moveTo(cx,412);c.lineTo(cx-7,404);c.lineTo(cx+7,404);c.fill();
  // ILS deviation
  const e=ap.end||(g.ap&&g.ap.e);if(e&&(ap.app||g.M.dest)){const rx=p.pos.x-e.T.x,rz=p.pos.z-e.T.z,along=-(rx*e.dx+rz*e.dz),lat=rx*(-e.dz)+rz*e.dx;
    const loc=clamp(Math.atan2(lat,along+e.rw.len)*R2D/2.5,-1,1),gs=clamp((Math.atan2(p.pos.y-sp.gearH,Math.max(1,along+300))*R2D-3)/0.7,-1,1);
    c.strokeStyle='#fff';c.lineWidth=2;for(let i=-2;i<=2;i++){if(!i)continue;c.beginPath();c.arc(cx+i*40,388,4,0,7);c.stroke();c.beginPath();c.arc(392,cy+i*40,4,0,7);c.stroke();}
    c.fillStyle='#ff5ad8';const dm=(x,y)=>{c.beginPath();c.moveTo(x,y-9);c.lineTo(x+9,y);c.lineTo(x,y+9);c.lineTo(x-9,y);c.fill();};dm(cx-loc*80,388);dm(392,cy+gs*80);
    txt(c,`${e.name} ILS`,130,92,'#fff',15,'left',false);}
  // flight mode annunciations
  c.fillStyle='#000';c.fillRect(0,0,512,40);const fma=[ap.at||ap.retard?(ap.retard?'RETARD':airbus?'SPEED':'SPD'):'',ap.on?(ap.lat==='HDG'?(airbus?'HDG':'HDG SEL'):ap.lat):'',ap.on?(ap.vert==='ALT'?(airbus?'ALT':'ALT HOLD'):ap.vert==='CLB'?(airbus?'OP CLB':'FLCH SPD'):ap.vert==='DES'?(airbus?'OP DES':'FLCH SPD'):ap.vert):''];
  fma.forEach((s,i)=>{if(s)txt(c,s,90+i*166,28,'#3cff6a',20,'center');});if(ap.on)txt(c,airbus?'AP1':'CMD',470,28,'#3cff6a',18,'center');
  if(ap.app&&!ap.loc)txt(c,'LOC',256,58,'#fff',15,'center',false);if(ap.app&&!ap.gs)txt(c,'G/S',422,58,'#fff',15,'center',false);
  if(p.stalled||warnings(g).includes('Stall'))txt(c,'STALL',256,330,'#ff3020',28,'center');
}
function drawND(c,w,h,g,d){frame512(c,w,h);if(!g)return;const p=g.plane,ap=p.ap;
  const hdg=p.hdg,cx=256,cy=430,rangeNm=d.range||(Math.hypot(p.pos.x,p.pos.z)>25000?40:20),R=360,k=R/(rangeNm*1852);
  c.save();c.beginPath();c.rect(0,40,512,472);c.clip();
  const X=(x,z)=>{const dx=x-p.pos.x,dz=z-p.pos.z;const a=-hdg;return[cx+(dx*Math.cos(a)-dz*Math.sin(a))*k,cy+(dx*Math.sin(a)+dz*Math.cos(a))*k];};
  // range rings
  c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=1.5;c.setLineDash([6,8]);c.beginPath();c.arc(cx,cy,R/2,Math.PI,2*Math.PI);c.stroke();c.setLineDash([]);
  txt(c,String(rangeNm/2),cx-R/2-4,cy-6,'#fff',14,'right',false);
  // runways and the route to the selected or mission runway
  c.strokeStyle='#fff';c.lineWidth=4;for(const rw of RWYS){const a=X(rw.A.x,rw.A.z),b=X(rw.B.x,rw.B.z);c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();}
  const e=ap.end||(g.M.dest&&END(g.M.dest));
  if(e){const fx=e.T.x-e.dx*10*1852,fz=e.T.z-e.dz*10*1852;const a=X(p.pos.x,p.pos.z),f=X(fx,fz),t=X(e.T.x,e.T.z);c.strokeStyle='#ff5ad8';c.lineWidth=3;c.beginPath();c.moveTo(...a);c.lineTo(...f);c.lineTo(...t);c.stroke();
    c.strokeStyle='#ff5ad8';c.beginPath();c.moveTo(f[0],f[1]-8);c.lineTo(f[0]+8,f[1]);c.lineTo(f[0],f[1]+8);c.lineTo(f[0]-8,f[1]);c.closePath();c.stroke();txt(c,'FI'+e.name,f[0]+12,f[1]+5,'#ff5ad8',15,'left',false);
    txt(c,'RW'+e.name,t[0]+10,t[1]-6,'#fff',15,'left',false);}
  for(const r of g.rings){const a=X(r.x,r.z);c.strokeStyle=r.state==='next'?'#ff5ad8':'#fff';c.beginPath();c.moveTo(a[0],a[1]-8);c.lineTo(a[0]+8,a[1]);c.lineTo(a[0],a[1]+8);c.lineTo(a[0]-8,a[1]);c.closePath();c.stroke();}
  if(RWYS.length){const ap2=X(0,0);txt(c,REGION.icao,ap2[0]+12,ap2[1],'#3cdcff',16,'left');}
  if(g.nav&&!(e&&REGION.icao===(g.M.route&&g.M.route.dest))){const t=geo(g.nav.target[0],g.nav.target[1]),a=X(p.pos.x,p.pos.z),b=X(t.x,t.z);c.strokeStyle='#ff5ad8';c.lineWidth=3;c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();txt(c,g.nav.passed?'RW':'FAF',b[0]+10,b[1],'#ff5ad8',15,'left',false);}
  // compass arc
  c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.arc(cx,cy,R,Math.PI*1.13,Math.PI*1.87);c.stroke();
  for(let a=0;a<360;a+=5){const ang=(a*D2R-hdg)-Math.PI/2;if(Math.abs(wrapPi(a*D2R-hdg))>0.8)continue;const r0=a%10?R-10:R-18;c.beginPath();c.moveTo(cx+Math.cos(ang)*R,cy+Math.sin(ang)*R);c.lineTo(cx+Math.cos(ang)*r0,cy+Math.sin(ang)*r0);c.stroke();
    if(a%30===0){c.save();c.translate(cx+Math.cos(ang)*(R-34),cy+Math.sin(ang)*(R-34));c.rotate(ang+Math.PI/2);txt(c,String(a/10),0,6,'#fff',18,'center');c.restore();}}
  if(ap.on){const ang=(ap.hdg*D2R-hdg)-Math.PI/2;c.fillStyle='#ff5ad8';c.save();c.translate(cx+Math.cos(ang)*R,cy+Math.sin(ang)*R);c.rotate(ang+Math.PI/2);c.fillRect(-9,-4,18,10);c.restore();}
  // track line and aircraft symbol
  const trk=Math.atan2(p.vel.x,-p.vel.z)-hdg;c.strokeStyle='#fff';c.lineWidth=1.5;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.sin(trk)*R,cy-Math.cos(trk)*R);c.stroke();
  c.restore();c.strokeStyle='#ffe14a';c.lineWidth=4;c.beginPath();c.moveTo(cx,cy-24);c.lineTo(cx,cy+14);c.moveTo(cx-18,cy-4);c.lineTo(cx+18,cy-4);c.moveTo(cx-8,cy+12);c.lineTo(cx+8,cy+12);c.stroke();
  // header: ground speed, true airspeed, heading, wind
  const gs=Math.hypot(p.vel.x,p.vel.z)*3.6/KT;c.fillStyle='#000';c.fillRect(0,0,512,40);txt(c,`GS ${Math.round(gs)}  TAS ${Math.round(p.v*3.6/KT)}`,12,27,'#fff',18,'left');
  txt(c,String(Math.round(((hdg*R2D)+360)%360)).padStart(3,'0')+' MAG',256,27,'#3cff6a',20,'center');
  const wv=g.wind.length();if(wv>0.5){const wd=(Math.atan2(-g.wind.x,g.wind.z)*R2D+360)%360;txt(c,`${String(Math.round(wd)).padStart(3,'0')}°/${Math.round(wv/0.5144)}`,500,27,'#fff',18,'right');}
  if(e){const dist=Math.hypot(p.pos.x-e.T.x,p.pos.z-e.T.z)/1852;txt(c,`RW${e.name}  ${dist.toFixed(1)} NM`,500,64,'#ff5ad8',17,'right',false);}
  else if(g.nav){txt(c,`${g.M.route.dest}  ${(g.nav.remaining/1852).toFixed(0)} NM`,500,64,'#ff5ad8',17,'right',false);}
}
function arcGauge(c,x,y,r,v,max,label,readout,red){c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.arc(x,y,r,Math.PI,Math.PI*1.75+0.0001);c.stroke();
  if(red){c.strokeStyle='#d00';c.beginPath();c.arc(x,y,r,Math.PI+Math.PI*0.75*red,Math.PI*1.75);c.stroke();}
  const a=Math.PI+Math.PI*0.75*clamp(v/max,0,1.1);c.fillStyle='rgba(255,255,255,.18)';c.beginPath();c.moveTo(x,y);c.arc(x,y,r,Math.PI,a);c.fill();
  c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);c.stroke();
  c.strokeStyle='#fff';c.lineWidth=1.5;c.strokeRect(x+4,y-28,r*0.95,26);txt(c,readout,x+r*0.95,y-8,'#fff',20,'right');txt(c,label,x,y+20,'#3cdcff',14,'center',false);}
function drawEngines(c,w,h,g){frame512(c,w,h);if(!g)return;const p=g.plane,sp=p.spec,n=Math.min(sp.engines,4),airbus=sp.cockpitType==='airbus';
  const gw=512/n;for(let i=0;i<n;i++){const x=gw*i+gw*0.32;const n1=p.engineMax*(20+p.rpm*82)*(p.fuelKg>0?1:0);arcGauge(c,x,92,gw*0.32,n1,110,'N1',n1.toFixed(1),0.93);
    const egt=p.fuelKg>0?380+p.rpm*520+p.ab*200:20;arcGauge(c,x,210,gw*0.28,egt,1000,'EGT',String(Math.round(egt)),0.95);}
  txt(c,airbus?'FF  KG/H':'FF  KG/H',20,300,'#3cdcff',15,'left',false);const ffE=p.ff*3600/n;for(let i=0;i<n;i++)txt(c,String(Math.round(ffE/10)*10),gw*i+gw*0.5,300,'#fff',20,'center');
  txt(c,'FOB',20,345,'#3cdcff',16,'left',false);txt(c,`${Math.round(p.fuelKg).toLocaleString('en-GB')} KG`,160,345,'#fff',22,'left');
  txt(c,'GW',20,380,'#3cdcff',16,'left',false);txt(c,`${(p.m/1000).toFixed(1)} T`,160,380,p.m>sp.mlw&&!p.onGround?'#ffb000':'#fff',22,'left');
  // flaps and gear
  txt(c,'FLAPS',330,345,'#3cdcff',16,'left',false);txt(c,flapName(p).toUpperCase(),490,345,Math.abs(p.flapPos-flapTarget(p))>0.02?'#ff5ad8':'#3cff6a',22,'right');
  const gm=p.gearPos>0.02&&p.gearPos<0.98;for(let i=0;i<3;i++){const x=340+i*56,y=i===1?405:430;c.fillStyle=p.gearPos>=0.98?'#3cff6a':gm?'#d00':'#222';c.fillRect(x,y,44,22);txt(c,p.gearPos>=0.98?'DOWN':gm?'TRANS':'UP',x+22,y+17,p.gearPos>=0.98||gm?'#000':'#666',13,'center');}
  if(p.rev>0.1)for(let i=0;i<n;i++)txt(c,'REV',gw*i+gw*0.32,40,'#3cff6a',18,'center');
  const w2=warnings(g);if(w2.length)txt(c,w2.join('  ').toUpperCase(),256,500,'#ff3020',18,'center');
}
function drawLower(c,w,h,g){frame512(c,w,h);if(!g)return;const p=g.plane,sp=p.spec,airbus=sp.cockpitType==='airbus';
  txt(c,airbus?'WHEEL':'GEAR AND BRAKES',256,36,'#fff',20,'center');
  // gear synoptic
  const legs=sp.geo?sp.geo.gear.mains.length*2+1:3;for(let i=0;i<legs;i++){const x=80+i*(352/Math.max(1,legs-1)),y=i===legs-1?120:160;c.strokeStyle=p.gearPos>=0.98?'#3cff6a':'#d00';c.lineWidth=3;c.strokeRect(x-16,y-14,32,28);}
  txt(c,'BRAKE TEMP',30,250,'#3cdcff',15,'left',false);const bt=Math.round(80+(p.brakeHeat||0));txt(c,`${bt} °C`,200,250,bt>300?'#ffb000':'#3cff6a',20,'left');
  txt(c,'AUTOBRAKE',30,290,'#3cdcff',15,'left',false);txt(c,p.ap.brake?'ACTIVE':p.ap.app?'ARMED':'OFF',200,290,p.ap.brake?'#3cff6a':'#fff',20,'left');
  txt(c,'SPOILERS',30,330,'#3cdcff',15,'left',false);txt(c,p.gsp>0.1?'GND SPLR':p.spd>0.1?'SPD BRK':'RET',200,330,p.gsp>0.1||p.spd>0.1?'#3cff6a':'#fff',20,'left');
  txt(c,'PAX',30,370,'#3cdcff',15,'left',false);txt(c,String(Math.round((p.payload/sp.payload)*(sp.pax||0))),200,370,'#fff',20,'left');
  const sat=Math.round(isa(p.pos.y).T-273.15);txt(c,`SAT ${sat>0?'+':''}${sat} °C`,30,460,'#fff',18,'left');txt(c,`GW ${(p.m/1000).toFixed(1)} T`,482,460,'#fff',18,'right');
}
// MCP (Boeing) or FCU (Airbus): windows and buttons in one strip, with click regions
// u ranges across the 1024-unit strip: the − and + knobs beside each window, then the buttons
const MCP_REGIONS=[['spd',-1,0.02,0.14],['spd',1,0.148,0.18],['at',0,0.18,0.26],['hdg',-1,0.28,0.396],['hdg',1,0.396,0.43],['app',0,0.44,0.52],['ap',0,0.54,0.64],['alt',-1,0.67,0.815],['alt',1,0.815,0.85],['nav',0,0.85,0.922],['vnav',0,0.922,1]];
function drawMCP(c,w,h,g){c.setTransform(w/1024,0,0,h/90,0,0);const airbus=g&&g.plane.spec.cockpitType==='airbus';c.fillStyle=airbus?'#3d4752':'#3a3f44';c.fillRect(0,0,1024,90);if(!g)return;const ap=g.plane.ap;
  const win=(x,wd,s,lbl)=>{c.fillStyle='#0b0d0e';c.fillRect(x,30,wd,38);txt(c,s,x+wd-8,59,'#ff9a3c',30,'right');txt(c,lbl,x+wd/2,22,'#e8e6dc',15,'center');};
  const btn=(x,wd,lbl,on)=>{c.fillStyle='#22262a';c.fillRect(x,28,wd,44);c.fillStyle=on?'#3cff6a':'#555';c.fillRect(x+6,32,wd-12,6);txt(c,lbl,x+wd/2,62,'#e8e6dc',16,'center');};
  const knob=(x,lbl)=>{c.fillStyle='#15181a';c.beginPath();c.arc(x,50,11,0,7);c.fill();c.strokeStyle='#777';c.lineWidth=2;c.stroke();txt(c,lbl,x,82,'#ddd',16,'center');};
  win(20,100,String(Math.round(ap.spd/KT||0)),airbus?'SPD':'IAS/MACH');knob(135,'−');knob(160,'+');
  btn(190,70,airbus?'A/THR':'A/T',ap.at);
  win(290,80,String(Math.round(ap.hdg)).padStart(3,'0'),'HDG');knob(393,'−');knob(418,'+');
  btn(452,80,airbus?'APPR':'APP',ap.app);btn(555,100,airbus?'AP1':'CMD A',ap.on);
  win(690,110,String(Math.round(ap.alt/FT/100)*100),'ALT');knob(822,'−');knob(847,'+');
  btn(870,70,airbus?'NAV':'LNAV',ap.lat==='NAV');btn(948,70,airbus?'MNGD':'VNAV',ap.vnav);}
function clickMCP(g,u){for(const [act,dir,u0,u1] of MCP_REGIONS){if(u>=u0&&u<u1){if(dir)apAdjust(g,act,dir);else window.__bear3d.act(act);AU.clunk();return true;}}return false;}
function drawOverhead(c,w,h){c.setTransform(w/512,0,0,h/512,0,0);c.fillStyle='#5b656d';c.fillRect(0,0,512,512);const r=rng(3);
  for(let row=0;row<6;row++){c.strokeStyle='rgba(255,255,255,.35)';c.strokeRect(14,14+row*82,484,74);
    for(let i=0;i<9;i++){const x=34+i*52,y=40+row*82;c.fillStyle='#202326';c.beginPath();c.arc(x,y,9,0,7);c.fill();c.fillStyle='#ddd';c.fillRect(x-2,y-14,4,10);
      if(r()<0.25){c.fillStyle=r()<0.5?'#3cdcff':'#ffb000';c.fillRect(x-14,y+16,28,10);}}}
  const L=['FUEL','ELEC','HYD','AIR','ANTI-ICE','LIGHTS'];L.forEach((s,i)=>txt(c,s,22,30+i*82,'#e8e6dc',12,'left',false));}
// classic panels for the bombers and transports: round gauges
function gauge(c,x,y,r,v,min,max,label,read,major,a0,a1){a0=a0===undefined?Math.PI*0.75:a0;a1=a1===undefined?Math.PI*2.25:a1;
  c.fillStyle='#111';c.beginPath();c.arc(x,y,r+6,0,7);c.fill();c.fillStyle='#1b1d1c';c.beginPath();c.arc(x,y,r,0,7);c.fill();
  const ang=t=>a0+(clamp(t,min,max)-min)/(max-min)*(a1-a0);c.strokeStyle='#eee';c.lineWidth=2;
  for(let t=min;t<=max+1e-6;t+=major){const a=ang(t);c.beginPath();c.moveTo(x+Math.cos(a)*r*0.78,y+Math.sin(a)*r*0.78);c.lineTo(x+Math.cos(a)*r*0.95,y+Math.sin(a)*r*0.95);c.stroke();}
  const a=ang(v);c.strokeStyle='#f6f2df';c.lineWidth=4;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*r*0.85,y+Math.sin(a)*r*0.85);c.stroke();
  txt(c,read,x,y+r*0.5,'#f2c46a',Math.round(r*0.3),'center');txt(c,label,x,y+r+22,'#e8e6dc',15,'center',false);}
function drawClassic(c,w,h,g){c.setTransform(w/1024,0,0,h/410,0,0);const sp=g?g.plane.spec:null;c.fillStyle=sp?ckColors(sp).panel:'#333';c.fillRect(0,0,1024,410);if(!g)return;const p=g.plane;
  const kmh=p.ias*3.6,r=78;gauge(c,100,120,r,kmh,0,sp.vne,'Speed km/h',String(Math.round(kmh)),100);
  // attitude
  c.save();c.beginPath();c.arc(290,120,r,0,7);c.clip();c.translate(290,120);c.rotate(-p.bank);const off=p.pitch*R2D*2.6;c.fillStyle='#3f78b6';c.fillRect(-200,-400+off,400,400);c.fillStyle='#7a5a34';c.fillRect(-200,off,400,400);c.strokeStyle='#fff';c.beginPath();c.moveTo(-200,off);c.lineTo(200,off);c.stroke();c.restore();
  c.strokeStyle='#f2c46a';c.lineWidth=4;c.beginPath();c.moveTo(230,120);c.lineTo(270,120);c.moveTo(310,120);c.lineTo(350,120);c.stroke();txt(c,'Attitude',290,120+r+22,'#e8e6dc',15,'center',false);
  const alt=Math.max(0,p.agl);gauge(c,480,120,r,alt%1000,0,1000,'Height m',String(Math.round(alt)),100,-Math.PI/2,Math.PI*1.5);
  gauge(c,100,310,r*0.85,p.vs,-30,30,'Climb m/s',(p.vs>=0?'+':'')+p.vs.toFixed(1),10,Math.PI*0.15,Math.PI*1.85);
  // heading
  c.save();c.translate(290,310);c.fillStyle='#1b1d1c';c.beginPath();c.arc(0,0,r*0.85,0,7);c.fill();c.rotate(-p.hdg);c.strokeStyle='#eee';c.fillStyle='#eee';c.font=CKF(15);c.textAlign='center';
  for(let d=0;d<360;d+=10){c.save();c.rotate(d*D2R);c.beginPath();c.moveTo(0,-r*0.82);c.lineTo(0,d%30?-r*0.74:-r*0.68);c.stroke();if(d%30===0)c.fillText(d===0?'N':d===90?'E':d===180?'S':d===270?'W':String(d/10),0,-r*0.5);c.restore();}c.restore();
  c.fillStyle='#f2c46a';c.beginPath();c.moveTo(290,310-20);c.lineTo(282,316);c.lineTo(298,316);c.fill();txt(c,'Heading',290,310+r*0.85+22,'#e8e6dc',15,'center',false);
  gauge(c,480,310,r*0.85,flapTarget(p)*100,0,100,'Flaps',flapName(p),25);
  // gear lamps and the autopilot state
  for(let i=0;i<3;i++){c.fillStyle=p.gearPos>=0.98?'#4c4':p.gearPos>0.02?'#d33':'#222';c.beginPath();c.arc(620+i*36,60,12,0,7);c.fill();}txt(c,'Gear',656,96,'#e8e6dc',15,'center',false);
  c.fillStyle=p.ap.on?'#4c4':'#222';c.beginPath();c.arc(620,150,12,0,7);c.fill();txt(c,`Autopilot ${p.ap.on?p.ap.lat+' '+p.ap.vert:'off'}`,640,156,'#e8e6dc',16,'left',false);
  c.fillStyle=p.stalled?'#f33':'#311';c.fillRect(600,200,110,34);txt(c,'STALL',655,224,p.stalled?'#fff':'#633',18,'center');
  const w2=warnings(g);c.fillStyle=w2.includes('Pull up')?'#f33':'#311';c.fillRect(720,200,120,34);txt(c,'PULL UP',780,224,w2.includes('Pull up')?'#fff':'#633',18,'center');
  txt(c,`Fuel ${Math.round(p.fuelKg/1000)} t   Weight ${Math.round(p.m/1000)} t`,600,300,'#e8e6dc',18,'left',false);}
function drawClassicEng(c,w,h,g){c.setTransform(w/700,0,0,h/380,0,0);const sp=g?g.plane.spec:null;c.fillStyle=sp?ckColors(sp).panel:'#333';c.fillRect(0,0,700,380);if(!g)return;const p=g.plane,n=Math.min(sp.engines,8);
  const cols=n>4?4:n,rows=n>4?2:1,r=n>4?44:58;for(let i=0;i<n;i++){const x=90+(i%cols)*(540/Math.max(1,cols-1||1))*(cols>1?1:0)+(cols===1?260:0),y=rows>1?(i<4?90:240):130;
    const rpm=p.engineMax*(p.fuelKg>0?(sp.prop?70+p.rpm*30:20+p.rpm*82):0);gauge(c,x,y,r,rpm,0,110,`Eng ${i+1} %`,String(Math.round(rpm)),10);}
  txt(c,`Power ${Math.round(p.thr*100)}%${p.ab>0.5?'  afterburner':''}${p.rev>0.1?'  reverse':''}`,350,360,'#e8e6dc',20,'center',false);}
// raycast a click on the MCP or FCU
function cockpitClick(g,nx,ny){if(!CK.mcp)return false;CK.raycaster=CK.raycaster||new THREE.Raycaster();CK.raycaster.setFromCamera({x:nx,y:ny},camera);const hit=CK.raycaster.intersectObject(CK.mcp.mesh);if(!hit.length)return false;return clickMCP(g,hit[0].uv.x);}
