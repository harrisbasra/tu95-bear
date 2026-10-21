
/* ---------- procedural aircraft models ---------- */
function stdMat(color,o){return new THREE.MeshStandardMaterial(Object.assign({color,metalness:0.35,roughness:0.5},o||{}));}
const SHARED={tire:null,strut:null,dark:null,glass:null,disc:null,blade:null,ab:null};
function shared(){
  if(SHARED.tire)return SHARED;
  SHARED.tire=stdMat('#1b1d1f',{metalness:0,roughness:0.9});SHARED.strut=stdMat('#7c8285',{metalness:0.7,roughness:0.35});
  SHARED.dark=stdMat('#2a2e31',{metalness:0.2,roughness:0.6});SHARED.blade=stdMat('#24272a',{metalness:0.2,roughness:0.6});
  SHARED.disc=new THREE.MeshBasicMaterial({color:'#303438',transparent:true,opacity:0.2,side:THREE.DoubleSide,depthWrite:false});
  SHARED.ab=new THREE.MeshBasicMaterial({color:'#ffb060',transparent:true,opacity:0.8,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  return SHARED;}
function fuselageGeo(st,glass,ring){
  const S=st.slice().sort((a,b)=>b[0]-a[0]);const hq=progress.quality!=='low';const N=hq?110:56;ring=ring||(hq?36:22);const x0=S[0][0],x1=S[S.length-1][0];
  const sample=x=>{for(let i=0;i<S.length-1;i++){const a=S[i],b=S[i+1];if(x<=a[0]&&x>=b[0]){const t=(a[0]-x)/((a[0]-b[0])||1);return[lerp(a[1],b[1],t),lerp(a[2],b[2],t),lerp(a[3],b[3],t)];}}const l=S[S.length-1];return[l[1],l[2],l[3]];};
  const pos=[],col=[],idx=[];
  for(let i=0;i<=N;i++){const x=lerp(x0,x1,i/N);const [top,bot,hw]=sample(x);const cy=(top+bot)/2,ry=Math.max(0.02,(top-bot)/2);
    for(let j=0;j<=ring;j++){const a=j/ring*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a);pos.push(x,cy+ca*ry,sa*hw);
      let c=0.86+0.14*(ca*0.5+0.5);
      for(const gl of glass){if(x<=gl[0]&&x>=gl[1]){if(gl[2]==='nose'||(ca>0.25&&ca<0.92&&Math.abs(sa)>0.25)){c=-1;}}}
      if(c<0)col.push(0.12,0.17,0.22);else col.push(c,c,c);}}
  for(let i=0;i<N;i++)for(let j=0;j<ring;j++){const a=i*(ring+1)+j,b=a+ring+1;idx.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return g;}
// A smooth aerofoil surface through sections {le:[x,y,z], c: chord (towards -x), th: thickness, up: thickness direction}.
// Each section uses a NACA four-digit thickness form with cosine spacing and a little camber; shading is smooth.
const FOIL_N=()=>({low:5,medium:8,high:11}[progress.quality]||11);
function foilGeo(secs){const n=FOIL_N(),m=2*n,pos=[],idx=[];
  const f=x=>5*(0.2969*Math.sqrt(x)-0.126*x-0.3516*x*x+0.2843*x*x*x-0.1036*x*x*x*x);
  for(const s of secs){const u=s.up,pt=(x,y)=>pos.push(s.le[0]-x*s.c+u[0]*y,s.le[1]+u[1]*y,s.le[2]+u[2]*y);
    for(let i=0;i<n;i++){const x=(1-Math.cos(Math.PI*i/n))/2;pt(x,s.th*f(x)*1.15);}
    for(let i=n;i>0;i--){const x=(1-Math.cos(Math.PI*i/n))/2;pt(x,-s.th*f(x)*0.85);}}
  for(let a=0;a<secs.length-1;a++)for(let i=0;i<m;i++){const p=a*m+i,q=a*m+(i+1)%m,r=p+m,t=q+m;idx.push(p,r,q,q,r,t);}
  // end caps
  const cap=(o,flip)=>{const c=pos.length/3;let cx=0,cy=0,cz=0;for(let i=0;i<m;i++){cx+=pos[(o+i)*3];cy+=pos[(o+i)*3+1];cz+=pos[(o+i)*3+2];}pos.push(cx/m,cy/m,cz/m);
    for(let i=0;i<m;i++){const p=o+i,q=o+(i+1)%m;flip?idx.push(c,q,p):idx.push(c,p,q);}};
  cap(0,false);cap((secs.length-1)*m,true);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;}
// a two-section aerofoil between a root and tip; n = thickness direction
function slabGeo(rLE,rc,tLE,tc,tr,tt,n){return foilGeo([{le:rLE,c:rc,th:tr,up:n},{le:tLE,c:tc,th:tt,up:n}]);}
function podGeo(len,r,kind){
  const h=len/2;let pts;
  if(kind==='prop')pts=[[0.001,h+0.5],[r*0.45,h+0.3],[r*0.9,h-0.3],[r,h-1.2],[r*0.95,-h+2.2],[r*0.55,-h+0.4],[0.001,-h]];
  else pts=[[r*0.82,h],[r,h-0.25],[r*1.02,h-len*0.25],[r*0.9,-h+len*0.25],[r*0.62,-h+0.4],[r*0.5,-h]];
  const g=new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),18);g.rotateZ(-Math.PI/2);return g;}
function decalTex(kind){
  const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');
  const star=(x,y,r,col)=>{c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*0.4:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fillStyle=col;c.fill();};
  if(kind==='red'){star(64,66,52,'#ffffff');star(64,66,44,'#c62f25');}
  else{c.fillStyle='#3f464b';c.fillRect(4,52,120,24);c.beginPath();c.arc(64,64,34,0,Math.PI*2);c.fill();star(64,66,30,'#d9dcde');c.fillStyle='#d9dcde';c.fillRect(100,60,20,8);c.fillRect(8,60,20,8);}
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;}
function buildAircraft(sp){
  if(sp.geo)return buildAirliner(sp);
  const S=shared(),M=sp.model;
  const bodyM=stdMat(M.color,{vertexColors:true}),wingM=stdMat(M.color),acc=stdMat(M.accent);
  const g=new THREE.Group();const parts={props:[],flaps:[],gear:[],swing:[],ab:[],lights:{},discs:[],blades:[]};
  const add=(geo,m,parent)=>{const me=new THREE.Mesh(geo,m);me.castShadow=true;me.receiveShadow=false;(parent||g).add(me);return me;};
  add(fuselageGeo(M.fus,M.glass),bodyM);
  const W=M.wing,tan=Math.tan;
  const wingAt=(w,z)=>({x:w.x-(z-w.z)*tan((w.sweep||0)*D2R),y:w.y+(z-w.z)*Math.sin((w.dihedral||0)*D2R)});
  const sides=[1,-1];
  // main wing (fixed)
  if(W){for(const s of sides){const t=wingAt(W,W.span);add(slabGeo([W.x,W.y,W.z*s],W.chord,[t.x,t.y,W.span*s],W.tip,W.t,W.t*0.4,[0,1,0]),wingM);
      if(W.winglet){add(slabGeo([t.x+0.2,t.y,W.span*s],W.tip,[t.x-1.6,t.y+W.winglet,W.span*s+0.4*s],1.6,0.25,0.15,[0,0,1]),wingM);}
      // flaps on inner trailing edge
      const fz0=W.z+0.3,fz1=W.z+(W.span-W.z)*0.42;const a=wingAt(W,fz0),b=wingAt(W,fz1);
      const ca=W.chord-(fz0-W.z)/(W.span-W.z)*(W.chord-W.tip),cb=W.chord-(fz1-W.z)/(W.span-W.z)*(W.chord-W.tip);
      const hinge=new THREE.Group();hinge.position.set(a.x-ca,a.y,fz0*s);g.add(hinge);
      const fc=0.24;add(slabGeo([0,0,0],ca*fc,[(b.x-cb)-(a.x-ca),b.y-a.y,(fz1-fz0)*s],cb*fc,0.18,0.12,[0,1,0]),acc,hinge);
      parts.flaps.push(hinge);}}
  // swing-wing glove + outer panels
  if(M.glove){const gl=M.glove;for(const s of sides)add(slabGeo([gl.x,gl.y,gl.z*s],gl.chord,[gl.tipx,gl.y,(gl.z+gl.span)*s],gl.tip,gl.t,gl.t*0.8,[0,1,0]),wingM);}
  if(M.swingWing){const sw=M.swingWing;for(const s of sides){const piv=new THREE.Group();piv.position.set(sw.pivotX,sw.y,sw.z*s);g.add(piv);
      add(slabGeo([sw.chord*0.45,0,0],sw.chord,[sw.chord*0.45-sw.span*0.08,-0.15,sw.span*s],sw.tip,sw.t,sw.t*0.4,[0,1,0]),wingM,piv);
      const hinge=new THREE.Group();hinge.position.set(sw.chord*0.45-sw.chord,0,1.0*s);piv.add(hinge);
      add(slabGeo([0,0,0],sw.chord*0.26,[-sw.span*0.05-0.4,-0.1,sw.span*0.55*s],sw.chord*0.2,0.15,0.1,[0,1,0]),acc,hinge);parts.flaps.push(hinge);
      parts.swing.push({g:piv,s});}}
  // fin + stabilisers
  const F=M.fin;add(slabGeo([F.x,F.y,0],F.chord,[F.x-F.h*tan(F.sweep*D2R),F.y+F.h,0],F.tip,0.55,0.25,[0,0,1]),wingM);
  const T=M.stab;for(const s of sides){add(slabGeo([T.x,T.y,0.2*s],T.chord,[T.x-T.span*tan(T.sweep*D2R),T.y+T.span*Math.sin((T.dihedral||0)*D2R),T.span*s],T.tip,0.4,0.2,[0,1,0]),wingM);}
  // insignia
  if(M.insignia!=='none'){const dTex=decalTex(M.insignia);const dMat=new THREE.MeshBasicMaterial({map:dTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  for(const s of sides){const fx=F.x-F.chord*0.45-F.h*0.45*tan(F.sweep*D2R),fy=F.y+F.h*0.5;const d=new THREE.Mesh(new THREE.PlaneGeometry(F.h*0.32,F.h*0.32),dMat);d.position.set(fx,fy,0.3*s);if(s<0)d.rotation.y=Math.PI;g.add(d);}}
  // sponsons
  if(M.sponson){const sp2=M.sponson;for(const s of sides){const b=add(new THREE.BoxGeometry(sp2.x1-sp2.x0,sp2.y1-sp2.y0,1.2),acc);b.position.set((sp2.x0+sp2.x1)/2,(sp2.y0+sp2.y1)/2,(sp2.z-0.4)*s);}}
  // engines
  const engPts=[];
  if(M.engines)for(const e of M.engines)for(const s of sides){
    const z=W.z+(W.span-W.z)*e.s,lw=wingAt(W,z);
    const zs=e.twin?[z-0.75,z+0.75]:[z];
    for(const zz of zs){
      const front=e.type==='prop'?lw.x+e.len*0.42:lw.x+e.fwd,cx=front-e.len/2,cy=lw.y+e.dy;
      const pod=add(podGeo(e.len,e.r,e.type),e.type==='prop'?wingM:acc);pod.position.set(cx,cy,zz*s);
      engPts.push([cx-e.len/2,cy,zz*s]);
      if(e.type==='jet'){const intake=new THREE.Mesh(new THREE.CircleGeometry(e.r*0.8,18),S.dark);intake.rotation.y=Math.PI/2;intake.position.set(front+0.01,cy,zz*s);g.add(intake);
        const py=add(slabGeo([front-e.len*0.25,cy+e.r*0.8,zz*s],e.len*0.55,[lw.x-0.5,lw.y,zz*s],W.chord*0.5,0.3,0.3,[0,0,1]),acc);}
      else{const n=e.contra?2:1;for(let k=0;k<n;k++){const pg=new THREE.Group();pg.position.set(front+0.55-k*0.65,cy,zz*s);g.add(pg);
          const disc=new THREE.Mesh(new THREE.CircleGeometry(e.pr,28),S.disc.clone());disc.rotation.y=Math.PI/2;pg.add(disc);parts.discs.push(disc.material);
          const bl=new THREE.Group();pg.add(bl);for(let b=0;b<e.blades;b++){const bg=new THREE.BoxGeometry(0.12,e.pr,0.32);bg.translate(0,e.pr/2,0);const bm=new THREE.Mesh(bg,S.blade);bm.rotation.x=b*Math.PI*2/e.blades+(k?Math.PI/e.blades:0);bl.add(bm);}
          parts.blades.push(bl);parts.props.push({g:bl,dir:k?-1:1});
          const hub=new THREE.Mesh(new THREE.ConeGeometry(0.42,1.0,14),acc);hub.rotation.z=-Math.PI/2;hub.position.x=0.45;pg.add(hub);}}
    }}
  if(M.bodyEngines){const be=M.bodyEngines;for(const s of sides){const L=be.x0-be.x1;const b=add(new THREE.BoxGeometry(L,be.h,be.w),acc);b.position.set((be.x0+be.x1)/2,be.y,be.z*s);
      const it=new THREE.Mesh(new THREE.BoxGeometry(0.3,be.h*0.8,be.w*0.85),S.dark);it.position.set(be.x0+0.02,be.y,be.z*s);g.add(it);
      for(const nz of be.nozzles){const nzl=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.7,1.2,14,1,true),S.dark);nzl.rotation.z=Math.PI/2;nzl.position.set(nz[0],be.y,nz[1]*s);g.add(nzl);
        const cone=new THREE.Mesh(new THREE.ConeGeometry(0.55,7,12,1,true),S.ab);cone.rotation.z=Math.PI/2;cone.position.set(nz[0]-4,be.y,nz[1]*s);cone.visible=false;g.add(cone);parts.ab.push(cone);engPts.push([nz[0],be.y,nz[1]*s]);}}}
  parts.exhaust=engPts;
  // landing gear
  const gearAll=new THREE.Group();g.add(gearAll);
  const gh=sp.gearH;
  const mkLeg=(x,z,n,r,tandem,topY)=>{const leg=new THREE.Group();leg.position.set(x,0,z);gearAll.add(leg);
    const st=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,Math.max(0.5,topY+gh-r),8),S.strut);st.position.y=(topY-gh+r)/2;leg.add(st);
    const xs=tandem?[-tandem/2,tandem/2]:[0];const zs=n===1?[0]:n===2?[-0.38,0.38]:[-0.75,0,0.75];
    for(const ox of xs)for(const oz of zs){const wh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,0.42,16),S.tire);wh.rotation.x=Math.PI/2;wh.position.set(ox,-gh+r,oz);wh.castShadow=true;leg.add(wh);}
    parts.gear.push({leg,up:Math.max(0,gh-r-0.6)});return leg;};
  const GR=M.gear;
  if(GR.mains)for(const m of GR.mains)for(const s of sides)mkLeg(m.x,m.z*s,m.w,0.62,m.tandem,GR.mainOnNacelle?-0.9:-0.9);
  if(GR.noseX!==undefined)mkLeg(GR.noseX,0,2,0.55,0,-0.9);
  if(GR.bicycle){for(const b of GR.bicycle)mkLeg(b.x,0,2,0.6,1.8,-1.2);
    for(const s of sides){const z=W.span*GR.outrigger,lw=wingAt(W,z);const leg=new THREE.Group();leg.position.set(lw.x-1,0,z*s);gearAll.add(leg);
      const st=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,lw.y+gh-0.6,6),S.strut);st.position.y=(lw.y-gh+0.6)/2;leg.add(st);
      const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.38,0.25,12),S.tire);wh.rotation.x=Math.PI/2;wh.position.y=-gh+0.3+0.25;leg.add(wh);parts.gear.push({leg,up:lw.y+gh-1});}}
  parts.gearAll=gearAll;
  // lights
  const lm=c=>new THREE.MeshBasicMaterial({color:c});
  const tipZ=M.swingWing?(M.swingWing.z+M.swingWing.span):W.span,tipP=M.swingWing?null:wingAt(W,W.span);
  const lr=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,6),lm('#ff3020')),lg=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,6),lm('#30ff60'));
  if(tipP){lr.position.set(tipP.x-0.5,tipP.y,-W.span);lg.position.set(tipP.x-0.5,tipP.y,W.span);g.add(lr,lg);}
  else{const sw=M.swingWing;for(const p of parts.swing){const l=p.s>0?lg:lr;l.position.set(sw.chord*0.45-sw.span*0.08-0.3,-0.15,sw.span*p.s);p.g.add(l);}}
  const tailTop=sp.model.fus.reduce((m,s)=>s[0]<m[0]?s:m);
  const lt=new THREE.Mesh(new THREE.SphereGeometry(0.2,8,6),lm('#ffffff'));lt.position.set(tailTop[0]-0.1,(tailTop[1]+tailTop[2])/2,0);g.add(lt);
  const bc=new THREE.Mesh(new THREE.SphereGeometry(0.28,8,6),lm('#ff2a1a'));const midTop=sp.model.fus.find(s=>s[0]<3)||sp.model.fus[5];bc.position.set(2,midTop[1]+0.15,0);g.add(bc);
  parts.lights={red:lr,green:lg,tail:lt,beacon:bc};
  // contact points (local, metres)
  const tipPts=[];
  if(tipP){for(const s of sides)tipPts.push([tipP.x-W.tip*0.5,tipP.y,W.span*s,'wing']);}
  else{for(const s of sides)tipPts.push([M.swingWing.pivotX-2,M.swingWing.y,(M.swingWing.z+M.swingWing.span*0.95)*s,'wing']);}
  for(const e of engPts){if(sp.prop){/* prop tips handled below */}}
  if(M.engines&&sp.prop){for(const e of M.engines)for(const s of sides){const z=W.z+(W.span-W.z)*e.s,lw=wingAt(W,z);tipPts.push([lw.x+e.len*0.42+0.5,lw.y+e.dy-e.pr,z*s,'prop']);}}
  if(M.engines&&!sp.prop){for(const e of M.engines)for(const s of sides){const z=W.z+(W.span-W.z)*e.s,lw=wingAt(W,z);tipPts.push([lw.x+e.fwd-e.len/2,lw.y+e.dy-e.r,z*s,'pod']);}}
  const body=[];for(const t of sp.tailPts)body.push([t[0],t[1],0,'tail']);
  const fx0=M.fus[0][0];body.push([fx0-0.3,M.fus[0][2],0,'belly']);for(const s of M.fus)if(s[0]>-15&&s[0]<15)body.push([s[0],s[2],0,'belly']);
  const gearPts=[];
  if(GR.bicycle){for(const b of GR.bicycle)gearPts.push([b.x,-gh,0,'main']);}
  else{for(const m of GR.mains)for(const s of sides)gearPts.push([m.x,-gh,m.z*s,'main']);gearPts.push([GR.noseX,-gh,0,'nose']);}
  return{g,parts,pts:{gear:gearPts,body:body.concat(tipPts)}};
}
function setAircraftState(A,p,t){
  const P=A.parts,sp=p.spec;
  const blur=clamp(p.rpm*1.4+(p.engineMax===0&&p.v>40?0.3:0),0,0.97);
  for(const pr of P.props)pr.g.rotation.x+=pr.dir*(p.rpm*40+(p.engineMax===0?clamp(p.v/60,0,1)*5:0))*t;
  for(const d of P.discs)d.opacity=0.08+blur*0.32;
  for(const b of P.blades)b.visible=blur<0.85;
  for(const f of P.flaps)f.rotation.z=p.flapPos*0.6;
  if(P.spoilers){const spl=Math.max((p.spd||0)*(p.onGround?1:0.55),p.gsp||0);for(const s of P.spoilers)s.rotation.z=-spl*0.85;}
  for(const s of P.swing)s.g.rotation.y=-p.sweep*s.s;
  for(const gl of P.gear){gl.leg.position.y=(1-p.gearPos)*gl.up;gl.leg.visible=p.gearPos>0.04;}
  for(const c of P.ab){c.visible=p.ab>0.03;c.scale.set(1,0.6+p.ab*0.7,1);}
}
