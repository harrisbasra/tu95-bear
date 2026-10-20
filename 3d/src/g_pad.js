
/* ---------- game controllers ---------- */
// Any controller the browser sees through the Gamepad API works (Xbox, DualShock 4, DualSense, Switch Pro and others,
// over USB or Bluetooth). Rumble uses the Gamepad API's dual-rumble effect where the browser supports it.
// A DualSense can also be connected through WebHID (Chrome and Edge on desktop) for its lightbar, player LEDs,
// mute LED and adaptive triggers, using the output report layout documented by the Linux hid-playstation driver.
//
//   Left stick   pitch and roll (steer on the ground)      Right stick  look around / orbit the camera
//   L2 / R2      rudder (steer on the ground)              R1 / L1      power up / down (L1 at idle on the ground: reverse and brakes)
//   Cross        brakes (hold)                             Square       gear
//   D-pad ↑ / ↓  flaps up / down                           Circle       speedbrake
//   D-pad ←      autopilot on/off                          D-pad →      arm the approach
//   Triangle     camera                                    Options      pause      Create  autothrottle      R3  recentre view
const PAD={idx:null,name:'',prev:[],hid:null,hidPad:null,bt:false,seq:0,lastOut:0,out:null,rumble:{w:0,s:0,until:0},pulses:[],lastRumble:0};
const DS_IDS=[{vendorId:0x054c,productId:0x0ce6},{vendorId:0x054c,productId:0x0df2}]; // DualSense, DualSense Edge
const dz=v=>{const a=Math.abs(v);if(a<0.12)return 0;const t=(a-0.12)/0.88;return Math.sign(v)*(0.45*t+0.55*t*t);}; // dead zone and a gentle curve
addEventListener('gamepadconnected',e=>{PAD.idx=e.gamepad.index;PAD.name=e.gamepad.id;if(game&&game.mode==='play')toast(game,`Controller connected: ${padName()}`);renderPad();});
addEventListener('gamepaddisconnected',e=>{if(PAD.idx===e.gamepad.index){PAD.idx=null;PAD.name='';}renderPad();});
function padName(){const n=PAD.name||'';if(/dualsense|0ce6|0df2/i.test(n)||PAD.hid)return 'DualSense';if(/054c/i.test(n))return 'PlayStation controller';if(/xbox|045e/i.test(n))return 'Xbox controller';return n.replace(/\(.*?\)/g,'').trim()||'Controller';}
function readGamepad(){
  let gp=null;const list=navigator.getGamepads?navigator.getGamepads():[];
  if(PAD.idx!==null)gp=list[PAD.idx];if(!gp)for(const g of list)if(g&&g.connected){gp=g;PAD.idx=g.index;PAD.name=g.id;break;}
  if(!gp&&PAD.hidPad)gp=PAD.hidPad;
  if(!gp){IN.padP=IN.padR=IN.padY=0;IN.padThrUp=IN.padThrDown=IN.padBrake=false;return;}
  const b=i=>gp.buttons[i]&&(gp.buttons[i].pressed||gp.buttons[i].value>0.5),bv=i=>gp.buttons[i]?gp.buttons[i].value:0,ax=i=>gp.axes[i]||0;
  const pressed=i=>b(i)&&!PAD.prev[i];
  const playing=game&&game.mode==='play'&&game.status==='play';
  IN.padR=dz(ax(0));IN.padP=progress.invert?dz(ax(1)):-dz(ax(1));
  IN.padY=clamp(bv(7)-bv(6),-1,1);IN.padThrUp=b(5);IN.padThrDown=b(4);IN.padBrake=b(0);
  if(game&&game.mode==='play'){const lx=dz(ax(2)),ly=dz(ax(3));if(lx||ly){const c=game.cam;c.lookYaw=clamp((c.lookYaw||0)-lx*0.04,-2.6,2.6);c.lookPitch=clamp((c.lookPitch||0)-ly*0.03,-0.9,0.7);}}
  if(playing){if(pressed(2))act('gear');if(pressed(12))act('flapsUp');if(pressed(13))act('flaps');if(pressed(1))act('spd');if(pressed(14))act('ap');if(pressed(15))act('app');if(pressed(8))act('at');
    if(pressed(3))cycleCam();if(pressed(11)){game.cam.lookYaw=0;game.cam.lookPitch=0;}if(pressed(9))pause(true);}
  else if(game&&game.mode==='paused'){if(pressed(9)||pressed(0))pause(false);if(pressed(1))toMenu();}
  else if(!$('#menu').classList.contains('hidden')){if(pressed(0)||pressed(9))startFlight();if(pressed(14)||pressed(15)){const ids=AIRCRAFT.map(a=>a.id);const i=ids.indexOf(progress.plane);progress.plane=ids[(i+(pressed(15)?1:ids.length-1))%ids.length];save();buildMenu();startAttract();}
    if(pressed(12)||pressed(13)){progress.mission=(progress.mission+(pressed(13)?1:MISSIONS3.length-1))%MISSIONS3.length;save();buildMenu();}}
  else if(!$('#result').classList.contains('hidden')){if(pressed(0))startFlight();if(pressed(1))toMenu();}
  PAD.prev=gp.buttons.map((_,i)=>b(i));
}
/* ---- rumble and DualSense feedback, driven by the flight ---- */
function padPulse(strong,weak,ms){PAD.pulses.push({s:strong,w:weak,until:performance.now()+ms});}
function padFeedback(g){
  const now=performance.now();const p=g&&g.plane;let s=0,w=0;
  if(p&&g.mode==='play'){const kmh=p.v*3.6;
    if(p.onGround&&p.v>2)w=Math.max(w,clamp(p.v/90,0,1)*0.22),s=Math.max(s,clamp(p.v/90,0,1)*0.08);    // runway roll
    if(p.onGround)s=Math.max(s,p.rpm*0.14);                                                            // engines at power on the ground
    if(!p.onGround&&p.alive&&(p.stalled||(warnings(g).includes('Stall'))))w=Math.max(w,0.85),s=Math.max(s,0.35); // stick shaker and buffet
    if(!p.onGround&&p.gearPos>0.02&&p.gearPos<0.98)s=Math.max(s,0.06);                                 // gear in transit
    if(p.spd>0.3&&!p.onGround)w=Math.max(w,0.08*p.spd*clamp(kmh/400,0,1));}                          // speedbrake buffet
  PAD.pulses=PAD.pulses.filter(q=>q.until>now);for(const q of PAD.pulses){s=Math.max(s,q.s);w=Math.max(w,q.w);}
  if(!progress.rumble)s=w=0;
  // Gamepad API rumble: refresh a short effect every ~100 ms while something is happening
  if(!PAD.hid&&PAD.idx!==null&&now-PAD.lastRumble>90){const gp=navigator.getGamepads()[PAD.idx];const va=gp&&gp.vibrationActuator;
    if(va&&va.playEffect&&(s>0.01||w>0.01||PAD.rumbling)){PAD.lastRumble=now;PAD.rumbling=s>0.01||w>0.01;va.playEffect('dual-rumble',{startDelay:0,duration:140,strongMagnitude:clamp(s,0,1),weakMagnitude:clamp(w,0,1)}).catch(()=>{});}}
  if(PAD.hid)dsSend(g,s,w,now);
}
/* ---- DualSense over WebHID ---- */
const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(bytes){let c=0xFFFFFFFF;for(const b of bytes)c=CRC_T[(c^b)&0xFF]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
async function dsConnect(){
  if(!navigator.hid){toastMenu('This browser can’t reach the DualSense lights and triggers. Use Chrome or Edge on a computer.');return;}
  try{const [dev]=await navigator.hid.requestDevice({filters:DS_IDS});if(!dev)return;if(!dev.opened)await dev.open();
    PAD.hid=dev;PAD.bt=dev.collections.some(c=>(c.inputReports||[]).some(r=>r.reportId===0x31))&&!dev.collections.some(c=>(c.outputReports||[]).some(r=>r.reportId===0x02));
    dev.addEventListener('inputreport',dsInput);PAD.out=null;dsSend(null,0,0,performance.now(),true);renderPad();toastMenu('DualSense connected: lightbar, LEDs and adaptive triggers are on.');
    navigator.hid.addEventListener('disconnect',e=>{if(e.device===PAD.hid){PAD.hid=null;PAD.hidPad=null;renderPad();}});
  }catch(e){toastMenu('Couldn’t connect the DualSense. Check it is paired, then try again.');console.warn(e);}}
// Build the 47-byte common output block: rumble motors, trigger effects, mute LED, player LEDs and lightbar colour.
function dsCommon(g,strong,weak,first){const c=new Uint8Array(47);const p=g&&g.plane;
  c[0]=0x01|0x02|0x04|0x08;c[1]=0x01|0x04|0x10;c[2]=Math.round(clamp(weak,0,1)*255);c[3]=Math.round(clamp(strong,0,1)*255);
  // adaptive triggers (L2/R2 are the rudder): continuous resistance that stiffens with airspeed, like real rudder pedals
  const q=p?clamp(p.ias/120,0,1):0;const f=Math.round(20+q*160);const setTrig=(o)=>{c[o]=0x01;c[o+1]=0x10;c[o+2]=f;};setTrig(10);setTrig(21);
  if(p&&p.stalled){c[10]=0x06;c[11]=28;c[12]=0xff;c[13]=0x00;} // right trigger vibrates with the stick shaker (mode 0x06; parameters approximate)
  c[8]=p&&p.ap.on?1:0;                                         // mute LED: autopilot engaged
  const fl=p?Math.round(p.flapPos*5):0;c[43]=[0,0x04,0x0A,0x15,0x1B,0x1F][fl];c[42]=0x02;  // player LEDs: flap position
  // lightbar: olive in normal flight, cyan on autopilot, amber for cautions, flashing red for warnings, red after a crash
  let col=[70,120,40];if(!g||g.mode!=='play')col=[90,80,60];else{const w=warnings(g);const t=performance.now()/1000;
    if(!p.alive)col=[200,10,0];else if(g.status==='success')col=[235,229,203];else if(w.includes('Stall')||w.includes('Pull up'))col=Math.sin(t*14)>0?[255,0,0]:[40,0,0];
    else if(w.length)col=[255,140,0];else if(p.ap.on)col=[30,170,220];}
  c[44]=col[0];c[45]=col[1];c[46]=col[2];
  if(first){c[38]=0x02;c[41]=0x02;} // take over the lightbar from the default blue
  return c;}
function dsSend(g,strong,weak,now,first){const dev=PAD.hid;if(!dev||!dev.opened)return;if(!first&&now-PAD.lastOut<50)return;
  const c=dsCommon(g,strong,weak,first);const key=c.join(',');if(!first&&key===PAD.out&&now-PAD.lastOut<1000)return;PAD.out=key;PAD.lastOut=now;
  try{if(PAD.bt){const d=new Uint8Array(77);d[0]=(PAD.seq<<4)&0xF0;PAD.seq=(PAD.seq+1)&15;d[1]=0x10;d.set(c,2);
      const crc=crc32(new Uint8Array([0xA2,0x31,...d.subarray(0,73)]));d[73]=crc&0xFF;d[74]=(crc>>>8)&0xFF;d[75]=(crc>>>16)&0xFF;d[76]=(crc>>>24)&0xFF;dev.sendReport(0x31,d).catch(()=>{});}
    else dev.sendReport(0x02,c).catch(()=>{});}catch(e){}}
// If the browser doesn't also list the DualSense as a gamepad, read its sticks and buttons from the HID reports.
function dsInput(e){if(PAD.idx!==null)return;const v=e.data;let o;if(e.reportId===0x01&&!PAD.bt)o=0;else if(e.reportId===0x31)o=1;else return;
  const u=i=>v.getUint8(o+i),axis=i=>(u(i)-128)/127.5;const hat=u(7)&0x0F,b7=u(7),b8=u(8),b9=u(9);
  const btn=on=>({pressed:!!on,value:on?1:0}),trig=val=>({pressed:val>128,value:val/255});
  const B=[btn(b7&0x20),btn(b7&0x40),btn(b7&0x10),btn(b7&0x80),btn(b8&0x01),btn(b8&0x02),trig(u(4)),trig(u(5)),btn(b8&0x10),btn(b8&0x20),btn(b8&0x40),btn(b8&0x80),
    btn(hat===0||hat===1||hat===7),btn(hat>=3&&hat<=5),btn(hat>=5&&hat<=7),btn(hat>=1&&hat<=3),btn(b9&0x01),btn(b9&0x02)];
  PAD.hidPad={buttons:B,axes:[axis(0),axis(1),axis(2),axis(3)]};}
function renderPad(){const el=$('#pad-status');if(!el)return;const n=PAD.idx!==null||PAD.hidPad?padName():null;
  el.textContent=n?`${n} connected${PAD.hid?' with lights and adaptive triggers':''}.`:'Connect a controller over USB or Bluetooth and press any button.';
  const b=$('#pad-hid');if(b)b.hidden=!navigator.hid||!!PAD.hid;}
