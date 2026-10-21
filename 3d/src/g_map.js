
/* ---------- world map and flight planner ---------- */
// Pick a departure and a destination on the map (or in the lists), then fly the whole route: takeoff, cruise with
// time acceleration or a skip to the descent, and the landing. The land outline is Natural Earth 1:110m (public domain).
const MAP={dep:null,dest:null,view:{lon0:-100,lon1:105,lat0:-2,lat1:66},hover:null};
async function openMap(){AU.init();show($('#menu'),false);show($('#map'),true);
  if(!window.TU95_WORLD){try{await loadScript('data/world.js');}catch(e){console.warn(e.message);}}
  MAP.dep=MAP.dep||(PLAN&&PLAN.dep)||REGION.icao;MAP.dest=MAP.dest||(PLAN&&PLAN.dest)||'OPKC';fillPlanner();drawMap();}
function closeMap(){show($('#map'),false);show($('#menu'),true);buildMenu();}
function fillPlanner(){const opt=(sel,list,val,lab)=>{sel.innerHTML='';for(const x of list){const o=document.createElement('option');o.value=x.icao||x.id;o.textContent=lab(x);sel.appendChild(o);}sel.value=val;};
  opt($('#m-dep'),AIRPORTS,MAP.dep,a=>`${a.city}: ${a.name} (${a.iata})`);opt($('#m-dest'),AIRPORTS,MAP.dest,a=>`${a.city}: ${a.name} (${a.iata})`);
  opt($('#m-plane'),AIRCRAFT,progress.plane,a=>a.family?`${a.name} (${a.family})`:a.name);planInfo();}
function currentPlan(){const sp=AIRCRAFT_BY_ID[$('#m-plane').value]||currentSpec();return planFlight(sp,$('#m-dep').value,$('#m-dest').value,{load:+$('#m-load').value,start:$('#m-start').value,sky:$('#m-sky').value});}
function planInfo(){MAP.dep=$('#m-dep').value;MAP.dest=$('#m-dest').value;const P=currentPlan(),sp=AIRCRAFT_BY_ID[P.spec];const dl=$('#m-info');dl.innerHTML='';
  const add=(k,v,warn)=>{const a=document.createElement('dt');a.textContent=k;const b=document.createElement('dd');b.textContent=v;if(warn)b.className='warn';dl.append(a,b);};
  const h=Math.floor(P.hours),m=Math.round((P.hours-h)*60);
  if(P.dep===P.dest)add('Flight','A local flight: take off, fly round and land');
  else{add('Distance',`${Math.round(P.dist/1000).toLocaleString('en-GB')} km (${Math.round(P.dist/1852).toLocaleString('en-GB')} nm)`);
    add('Cruise',`FL${Math.round((P.alt-0)/FT/100)} at Mach ${sp.cruise.mach.toFixed(2)}, about ${Math.round(P.tas*3.6)} km/h`);add('Block time',`${h} h ${String(m).padStart(2,'0')} min`);}
  add('Runways',`${P.depEnd} out, ${P.arrEnd} in`);
  add('Fuel',`${(P.fuel/1000).toFixed(1)} t of ${(sp.fuelCap/1000).toFixed(0)} t (trip ${(P.trip/1000).toFixed(1)} t plus reserves)`,!P.range);
  add('Payload',sp.pax?`${(P.payload/1000).toFixed(1)} t, about ${P.pax} passengers`:`${(P.payload/1000).toFixed(1)} t`);
  add('Takeoff weight',`${((sp.oew+P.payload+P.fuel)/1000).toFixed(0)} t (max ${(sp.mtow/1000).toFixed(0)} t)`);
  if(!P.range)add('Range','Beyond this aircraft’s range: you will run out of fuel. Pick a closer airport or another aircraft.',true);
  $('#m-fly').disabled=!P.range;MAP.plan=P;drawMap();}
// equirectangular map, sized to the canvas
function mapXY(lat,lon,w,h){const v=MAP.view;return[(lon-v.lon0)/(v.lon1-v.lon0)*w,(v.lat1-lat)/(v.lat1-v.lat0)*h];}
function drawMap(){const cv=$('#map-cv');if(!cv||$('#map').classList.contains('hidden'))return;const r=cv.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);const w=r.width,h=r.height;
  c.fillStyle='#04070e';c.fillRect(0,0,w,h);
  // graticule
  c.strokeStyle='rgba(62,230,255,.07)';c.lineWidth=1;for(let lon=-90;lon<=100;lon+=15){const [x]=mapXY(0,lon,w,h);c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
  for(let lat=0;lat<=60;lat+=15){const [,y]=mapXY(lat,0,w,h);c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
  if(window.TU95_WORLD){c.fillStyle='#14233a';c.strokeStyle='#2c4a72';c.lineWidth=0.8;
    for(const p of TU95_WORLD){c.beginPath();for(let i=0;i<p.length;i+=2){const [x,y]=mapXY(p[i+1],p[i],w,h);i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();c.stroke();}}
  // the planned great-circle route
  const P=MAP.plan;if(P&&P.dep!==P.dest){const a=AIRPORT_BY_ICAO[P.dep].ref,b=AIRPORT_BY_ICAO[P.dest].ref,brg=gcBearing(a,b);c.strokeStyle='#3ee6ff';c.shadowColor='#3ee6ff';c.shadowBlur=10;c.lineWidth=2.5;c.setLineDash([8,6]);c.beginPath();
    for(let i=0;i<=64;i++){const q=gcPoint(a,brg,P.dist*i/64);const [x,y]=mapXY(q[0],q[1],w,h);i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();c.setLineDash([]);c.shadowBlur=0;}
  c.font=`700 14px ${FONT}`;c.textBaseline='middle';
  for(const ap of AIRPORTS){const [x,y]=mapXY(ap.ref[0],ap.ref[1],w,h);const dep=ap.icao===MAP.dep,dest=ap.icao===MAP.dest;
    if(dep||dest){c.strokeStyle=dep?'#4dffa1':'#ff8a3d';c.lineWidth=3;c.beginPath();c.arc(x,y,9,0,7);c.stroke();}
    c.fillStyle=MAP.hover===ap.icao?'#ffffff':'#e9f1ff';c.beginPath();c.arc(x,y,4.5,0,7);c.fill();
    const right=!['OPIS','OPKC','OPLA'].includes(ap.icao)||ap.icao==='OPIS';const ty=ap.icao==='OPLA'?y+12:ap.icao==='OPKC'?y+10:ap.icao==='OPIS'?y-11:y;
    c.textAlign=ap.icao==='OPLA'||ap.icao==='OPKC'?'left':right?'left':'right';c.fillStyle='rgba(5,9,18,.82)';const t=`${ap.iata} ${ap.city}`;const tw=c.measureText(t).width;const tx=c.textAlign==='left'?x+10:x-10-tw;
    c.fillRect(tx-3,ty-9,tw+6,18);c.fillStyle=dep?'#9dffcf':dest?'#ffc49a':'#e9f1ff';c.textAlign='left';c.fillText(t,tx,ty);}
  c.fillStyle='rgba(214,228,255,.5)';c.font=`700 11px ${FONT}`;c.textAlign='right';c.fillText('Land outline: Natural Earth (public domain). Ту-95 Bear 3D by @harrisbasra™',w-8,h-10);}
function mapPick(e){const cv=$('#map-cv'),r=cv.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;let best=null;
  for(const ap of AIRPORTS){const [px,py]=mapXY(ap.ref[0],ap.ref[1],r.width,r.height);const d=Math.hypot(px-x,py-y);if(d<24&&(!best||d<best.d))best={d,ap};}return best&&best.ap;}
function wireMap(){const cv=$('#map-cv');
  cv.addEventListener('pointermove',e=>{const a=mapPick(e);const h=a?a.icao:null;if(h!==MAP.hover){MAP.hover=h;cv.style.cursor=h?'pointer':'default';drawMap();}});
  // first tap picks the departure, the next the destination
  cv.addEventListener('click',e=>{const a=mapPick(e);if(!a)return;if(MAP.next==='dest'){$('#m-dest').value=a.icao;MAP.next='dep';}else{$('#m-dep').value=a.icao;MAP.next='dest';}planInfo();});
  for(const id of ['#m-dep','#m-dest','#m-plane','#m-load','#m-start','#m-sky'])$(id).addEventListener('change',planInfo);
  $('#m-fly').addEventListener('click',()=>{const P=currentPlan();if(!P.range)return;progress.plane=P.spec;save();PLAN=P;startFlight();});
  $('#m-back').addEventListener('click',closeMap);$('#btn-map').addEventListener('click',openMap);
  addEventListener('resize',drawMap);}
