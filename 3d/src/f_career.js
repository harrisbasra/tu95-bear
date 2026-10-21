
/* ---------- career: jobs, fleet, bank ---------- */
// Virtual currency only: "credits" (cr) have no real value, and there is nothing to buy with real money.
// Every number that shapes the economy lives in ECON, so it can be tuned in one place. The figures are loosely based on
// real airline costs, but scaled for a game: aircraft cost about a tenth of their real market value, and fares are
// generous, so a new fleet member is a few evenings' flying away rather than a decade.
const ECON={
  startCash:150000,startAircraft:'b738',startCondition:78,
  // revenue
  fareBase:40,fareKm:0.1,loadFactor:[0.62,0.95],cargoBase:900,cargoTkm:0.4,
  onTimeBonus:0.08,lateMinutesFree:15,latePerMinute:0.004,latePenaltyMax:0.35,
  landingBonus:{smooth:0.08,firm:0,hard:-0.15},centrelinePenalty:0.05,
  // costs
  fuelPrice:{OPLA:0.95,OPIS:0.95,OPKC:0.9,OMDB:0.75,EGLL:1.05,KJFK:0.85,LTFM:0.9,OEJN:0.7}, // credits per kg
  landingFee:{OPLA:6,OPIS:6,OPKC:6,OMDB:9,EGLL:25,KJFK:18,LTFM:10,OEJN:8},                // credits per tonne of MTOW
  crewPerHour:{narrow:900,wide:1500,a388:2200,turboprop:700,freighter:1200},
  maintPerHourOfValue:0.00006,wearPerHour:0.35,hardLandingWear:5,hardLandingInspection:0.005,repairPerPoint:0.0035,
  overspeedFine:15000,diversionRevenue:0.3,diversionPerPax:150,crashInsurance:0.7,crashPerPax:500,
  // fleet and bank
  prices:{b738:2200000,a320:2500000,b789:12000000,b77w:9000000,a359:14000000,b744:1500000,a388:8000000,c130:3000000,c17:10000000},
  usedPrice:0.62,usedCondition:72,sellFraction:0.85,leaseMonthly:0.03,leaseDeposit:1,
  loanBaseRate:0.07,loanRiskRate:0.06,loanTerms:[12,24,36,60],
  maxLoan:25000000,daysPerFlight:1,daysPerMonth:30,maxTransactions:400,minCondition:25,jobsPerAirport:7
};
const RANKS=[[0,'Second officer'],[20,'First officer'],[60,'Senior first officer'],[150,'Captain'],[400,'Senior captain'],[1000,'Training captain']];
const CAREER_KEY='tu95-bear-3d-career-v1';
let CAREER=null;
function loadCareer(){try{const c=JSON.parse(localStorage.getItem(CAREER_KEY)||'null');if(c&&c.v===1)CAREER=c;}catch(e){}return CAREER;}
function saveCareer(){if(!CAREER)return;CAREER.updated=Date.now();try{localStorage.setItem(CAREER_KEY,JSON.stringify(CAREER));}catch(e){}CLOUD.saveCareer();}
const careerAircraft=()=>AIRCRAFT.filter(a=>ECON.prices[a.id]!==undefined);
const cr=n=>`${n<0?'−':''}${Math.round(Math.abs(n)).toLocaleString('en-GB')} cr`;
function rankFor(h){let r=RANKS[0][1];for(const [m,n] of RANKS)if(h>=m)r=n;return r;}
function crewClass(sp){if(sp.id==='a388')return'a388';if(sp.id==='c130')return'turboprop';if(sp.cat!=='airliner')return'freighter';return sp.geo&&sp.geo.D>5?'wide':'narrow';}
function marketValue(f){return ECON.prices[f.type]*(0.4+0.6*f.condition/100);}
function newCareer(name,base){const c={v:1,created:Date.now(),pilot:{name:name||progress.name||'Pilot',base,hours:0,landings:0,smooth:0,flights:0},
  day:1,cash:0,fleet:[],tx:[],loans:[],months:[],month:{n:1,revenue:0,costs:0,flights:0},jobs:{},seq:1,txN:0,active:null};
  CAREER=c;tx('Opening balance',ECON.startCash,'bank');
  c.fleet.push({id:'f'+(c.seq++),name:'Bear 01',type:ECON.startAircraft,own:'owned',condition:ECON.startCondition,hours:0,loc:base,bought:c.day,paid:0});
  saveCareer();return c;}
function tx(desc,amount,kind){const c=CAREER;c.cash=Math.round(c.cash+amount);c.txN=(c.txN||0)+1;c.tx.unshift({id:`${c.created}-${c.txN}`,n:c.txN,d:Math.floor(c.day),desc,amount:Math.round(amount),bal:c.cash,kind:kind||'other'});
  if(c.tx.length>ECON.maxTransactions)c.tx.length=ECON.maxTransactions;
  // the monthly summary is operating results: aircraft purchases and sales, and loan principal, are capital
  if(kind!=='bank'&&kind!=='loan'&&kind!=='fleet'){if(amount>0)c.month.revenue+=amount;else c.month.costs-=amount;}}
/* ---- jobs ---- */
// Each airport offers a handful of passenger and cargo jobs to the others, refreshed every day.
function jobsAt(icao){const c=CAREER,key=icao+'@'+Math.floor(c.day);if(c.jobs.key===key)return c.jobs.list;
  const r=rng(Math.floor(c.day)*131+icao.charCodeAt(0)*7+icao.charCodeAt(3));const list=[];
  const dests=AIRPORTS.filter(a=>a.icao!==icao);
  for(let i=0;i<ECON.jobsPerAirport;i++){const d=dests[Math.floor(r()*dests.length)];const cargo=r()<0.3;const dist=gcDist(AIRPORT_BY_ICAO[icao].ref,d.ref);
    const lf=lerp(ECON.loadFactor[0],ECON.loadFactor[1],r());const urgent=r()<0.25;
    list.push({id:`${key}#${i}`,from:icao,to:d.icao,kind:cargo?'cargo':'pax',lf,urgent,dist,
      title:cargo?`${urgent?'Urgent freight':'Freight'} to ${d.city}`:`${urgent?'Charter':'Scheduled flight'} to ${d.city}`});}
  c.jobs={key,list};return list;}
// what a job pays with a given aircraft, before bonuses and penalties
function jobQuote(job,f){const sp=AIRCRAFT_BY_ID[f.type];const km=job.dist/1000;
  if(job.kind==='pax'){if(!sp.pax)return null;const pax=Math.round(sp.pax*job.lf);const fare=(ECON.fareBase+ECON.fareKm*km)*(job.urgent?1.25:1);return{pax,payload:Math.min(sp.payload,pax*95),pay:Math.round(pax*fare)};}
  const t=Math.round(sp.payload*job.lf/1000*10)/10;return{t,payload:Math.round(t*1000),pay:Math.round((ECON.cargoBase*t+ECON.cargoTkm*t*km)*(job.urgent?1.3:1))};}
function canFly(job,f){if(f.loc!==job.from)return`${f.name} is at ${f.loc}, not ${job.from}`;if(f.condition<ECON.minCondition)return`${f.name} needs maintenance before it can fly`;
  const sp=AIRCRAFT_BY_ID[f.type],q=jobQuote(job,f);if(!q)return`${sp.name} can’t carry passengers`;
  const P=planFlight(sp,job.from,job.to,{load:q.payload/sp.payload});if(!P.range)return`Beyond the ${sp.name}’s range with this load`;return null;}
function startJob(job,f,opts){const sp=AIRCRAFT_BY_ID[f.type],q=jobQuote(job,f);const P=planFlight(sp,job.from,job.to,Object.assign({load:q.payload/sp.payload},opts||{}));
  P.job={id:job.id,kind:job.kind,from:job.from,to:job.to,quote:q,fleet:f.id,sched:P.hours,urgent:job.urgent,title:job.title};CAREER.active=P.job;saveCareer();
  progress.plane=sp.id;save();PLAN=P;return P;}
function ferryJob(f,to){const sp=AIRCRAFT_BY_ID[f.type];const P=planFlight(sp,f.loc,to,{load:0});P.job={id:'ferry',kind:'ferry',from:f.loc,to,quote:{pay:0,payload:0},fleet:f.id,sched:P.hours,title:`Ferry ${f.name} to ${AIRPORT_BY_ICAO[to].city}`};
  CAREER.active=P.job;saveCareer();progress.plane=sp.id;save();PLAN=P;return P;}
// Settle a finished career flight: pay, bonuses and penalties, then the real costs of the flight.
function settleJob(g,ok){const P=g.M.route,J=P&&P.job,c=CAREER;if(!J||!c)return null;const f=c.fleet.find(x=>x.id===J.fleet);if(!f)return null;
  const sp=AIRCRAFT_BY_ID[f.type],p=g.plane,lines=[];const L=(k,v)=>{lines.push([k,v]);return v;};
  const hours=(g.time+(g.skippedSec||0))/3600,landedAt=REGION.icao,crashed=!p.alive,arrived=ok&&landedAt===J.to;
  let revenue=0;
  if(J.kind!=='ferry'){
    if(arrived){revenue=L(J.kind==='pax'?`${J.quote.pax} passengers`:`${J.quote.t} t of cargo`,J.quote.pay);
      const late=(hours-J.sched)*60-ECON.lateMinutesFree;
      if(late<=0)revenue+=L('On time',J.quote.pay*ECON.onTimeBonus);else revenue-=L(`Late by ${Math.round(late+ECON.lateMinutesFree)} min`,J.quote.pay*Math.min(ECON.latePenaltyMax,late*ECON.latePerMinute))*1;
      const s=g.stats.sink||0;const lb=s<1.5?ECON.landingBonus.smooth:s<3?ECON.landingBonus.firm:ECON.landingBonus.hard;if(lb)revenue+=L(s<1.5?`Smooth landing (${s.toFixed(1)} m/s)`:`Hard landing (${s.toFixed(1)} m/s)`,J.quote.pay*lb);
      if((g.stats.offset||0)>10)revenue-=L(`${Math.round(g.stats.offset)} m off the centreline`,J.quote.pay*ECON.centrelinePenalty)*1;}
    else if(!crashed&&p.onGround){revenue=L(`Diverted to ${landedAt}: part payment`,J.quote.pay*ECON.diversionRevenue);if(J.quote.pax)revenue-=L('Passenger compensation',J.quote.pax*ECON.diversionPerPax);}}
  // costs from the flight itself
  const fuelUsed=Math.max(0,g.startFuel-p.fuelKg),fp=ECON.fuelPrice[J.from]||0.9;
  const costs=[[`Fuel, ${(fuelUsed/1000).toFixed(1)} t at ${J.from}`,fuelUsed*fp],[`Crew, ${hours.toFixed(1)} h`,hours*ECON.crewPerHour[crewClass(sp)]],[`Maintenance reserve`,ECON.prices[f.type]*ECON.maintPerHourOfValue*hours]];
  if(p.onGround&&!crashed)costs.push([`Landing fee at ${landedAt}`,(ECON.landingFee[landedAt]||8)*sp.mtow/1000]);
  if((g.flags.overspeedT||0)>5)costs.push(['Overspeed fine',ECON.overspeedFine]);
  const s=g.stats.sink||0;if(s>=3.05&&!crashed)costs.push(['Hard-landing inspection',ECON.prices[f.type]*ECON.hardLandingInspection]);
  // the aircraft
  f.hours+=hours;f.condition=Math.max(0,f.condition-ECON.wearPerHour*hours-(s>=3.05?ECON.hardLandingWear*(1+(s-3.05)):0));
  if(crashed){const ins=f.own==='owned'?marketValue(f)*ECON.crashInsurance:0;if(J.quote.pax)costs.push(['Passenger compensation',J.quote.pax*ECON.crashPerPax]);
    if(ins)revenue+=L('Insurance pay-out (hull loss)',ins);else costs.push(['Leased aircraft lost: lessor claim',ECON.prices[f.type]*0.25]);c.fleet=c.fleet.filter(x=>x!==f);}
  else if(p.onGround)f.loc=landedAt;
  // the pilot
  c.pilot.hours+=hours;c.pilot.flights++;if(p.onGround&&!crashed){c.pilot.landings++;if(s<1.5)c.pilot.smooth++;}
  // post it all to the bank
  const label=J.title;if(revenue)tx(`${label}: revenue`,revenue,'revenue');let costTotal=0;for(const [k,v] of costs){tx(`${label}: ${k.toLowerCase()}`,-v,'cost');costTotal+=v;}
  c.month.flights++;advanceDays(Math.max(ECON.daysPerFlight,hours/24));c.active=null;saveCareer();
  return{lines,costs,revenue,costTotal,net:revenue-costTotal,cash:c.cash,fleet:f,crashed};}
/* ---- time, months, leases and loans ---- */
function advanceDays(d){const c=CAREER;const before=Math.floor((c.day-1)/ECON.daysPerMonth);c.day+=d;const after=Math.floor((c.day-1)/ECON.daysPerMonth);for(let m=before;m<after;m++)endOfMonth();}
function endOfMonth(){const c=CAREER;
  for(const f of c.fleet)if(f.own==='leased')tx(`Lease: ${f.name} (${AIRCRAFT_BY_ID[f.type].name})`,-f.lease,'cost');
  for(const L of c.loans){if(L.remaining<=0)continue;const interest=L.remaining*L.rate/12,pay=Math.min(L.monthly,L.remaining+interest);L.remaining=Math.max(0,L.remaining+interest-pay);L.paid++;tx(`Loan repayment (${L.paid} of ${L.months})`,-pay,'loan');c.month.costs+=interest;}
  c.loans=c.loans.filter(L=>L.remaining>0.5);
  c.months.unshift(Object.assign({},c.month,{net:c.month.revenue-c.month.costs,cash:c.cash}));if(c.months.length>24)c.months.length=24;c.month={n:c.month.n+1,revenue:0,costs:0,flights:0};}
function loanOffer(){const c=CAREER;const fleetVal=c.fleet.filter(f=>f.own==='owned').reduce((a,f)=>a+marketValue(f),0);const debt=c.loans.reduce((a,L)=>a+L.remaining,0);
  const recent=c.months.slice(0,3);const avgNet=recent.length?recent.reduce((a,m)=>a+m.net,0)/recent.length:0;
  const max=Math.max(0,Math.round((fleetVal*0.5+Math.max(0,avgNet)*6+200000-debt)/10000)*10000);const rate=ECON.loanBaseRate+ECON.loanRiskRate*clamp(debt/Math.max(1,fleetVal),0,1);return{max,rate,debt};}
function takeLoan(amount,months){const o=loanOffer();amount=Math.min(amount,o.max,ECON.maxLoan);if(amount<=0)return false;const r=o.rate/12;const monthly=amount*r/(1-Math.pow(1+r,-months));
  CAREER.loans.push({id:'L'+(CAREER.seq++),principal:amount,rate:o.rate,months,paid:0,monthly:Math.round(monthly),remaining:amount,day:CAREER.day});tx(`Loan of ${cr(amount)} over ${months} months at ${(o.rate*100).toFixed(1)}%`,amount,'loan');saveCareer();return true;}
function repayLoan(id){const c=CAREER,L=c.loans.find(x=>x.id===id);if(!L)return;const amt=Math.min(L.remaining,c.cash);if(amt<=0)return;L.remaining-=amt;tx('Early loan repayment',-amt,'loan');c.loans=c.loans.filter(x=>x.remaining>0.5);saveCareer();}
function buyAircraft(type,used,lease){const c=CAREER,sp=AIRCRAFT_BY_ID[type],price=ECON.prices[type]*(used?ECON.usedPrice:1),n=c.fleet.length+1;
  const f={id:'f'+(c.seq++),name:`Bear ${String(n).padStart(2,'0')}`,type,own:lease?'leased':'owned',condition:used?ECON.usedCondition:100,hours:0,loc:c.pilot.base,bought:c.day,paid:lease?0:price,lease:lease?Math.round(ECON.prices[type]*ECON.leaseMonthly*(used?0.7:1)):0};
  const due=lease?f.lease*ECON.leaseDeposit:price;if(due>c.cash)return`You need ${cr(due)}: ${cr(c.cash)} in the bank`;
  c.fleet.push(f);tx(lease?`Lease deposit: ${f.name} (${sp.name})`:`Bought ${f.name} (${used?'used ':''}${sp.name})`,-due,'fleet');saveCareer();return null;}
function sellAircraft(id){const c=CAREER,f=c.fleet.find(x=>x.id===id);if(!f||c.fleet.length<2)return'You need at least one aircraft';
  if(f.own==='leased'){c.fleet=c.fleet.filter(x=>x!==f);tx(`Returned ${f.name} to the lessor`,0,'fleet');}else{const v=marketValue(f)*ECON.sellFraction;c.fleet=c.fleet.filter(x=>x!==f);tx(`Sold ${f.name} (${AIRCRAFT_BY_ID[f.type].name})`,v,'fleet');}saveCareer();return null;}
function repairAircraft(id){const c=CAREER,f=c.fleet.find(x=>x.id===id);if(!f)return;const pts=100-f.condition,cost=ECON.prices[f.type]*ECON.repairPerPoint*pts;if(cost>c.cash)return`Repairs cost ${cr(cost)}`;
  f.condition=100;tx(`Maintenance check: ${f.name}`,-cost,'cost');advanceDays(1);saveCareer();return null;}
