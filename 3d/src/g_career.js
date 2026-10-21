
/* ---------- career screens ---------- */
const CUI={tab:'jobs',fleet:null,confirm:null};
function el(tag,attrs,...kids){const e=document.createElement(tag);for(const k in attrs||{}){if(k==='on')for(const ev in attrs.on)e.addEventListener(ev,attrs.on[ev]);else if(k==='class')e.className=attrs[k];else if(attrs[k]!==undefined&&attrs[k]!==false)e.setAttribute(k,attrs[k]===true?'':attrs[k]);}
  for(const c of kids.flat()){if(c===null||c===undefined||c===false)continue;e.append(c.nodeType?c:document.createTextNode(String(c)));}return e;}
function openCareer(){AU.init();loadCareer();show($('#menu'),false);show($('#career'),true);renderCareer();}
function closeCareer(){show($('#career'),false);show($('#menu'),true);buildMenu();}
function careerMsg(t,bad){const m=$('#career-msg');if(m){m.textContent=t||'';m.className='c-msg'+(bad?' bad':'');}}
function renderCareer(){const root=$('#career-in');root.innerHTML='';
  if(!CAREER){const name=el('input',{type:'text',maxlength:24,value:progress.name||'',placeholder:'Your name','aria-label':'Pilot name'});
    const base=el('select',{'aria-label':'Home base'},AIRPORTS.map(a=>el('option',{value:a.icao,selected:a.icao==='OPLA'},`${a.city} (${a.iata})`)));
    root.append(el('h2',{},'Start a career'),
      el('p',{},`You start with one used ${AIRCRAFT_BY_ID[ECON.startAircraft].name} at your home base and ${cr(ECON.startCash)}. Fly passenger and cargo jobs between the eight airports, then lease, buy and borrow to grow your fleet.`),
      el('p',{class:'c-note'},'Credits (cr) are a virtual currency for this game only. They have no real value and can’t be bought or sold.'),
      el('label',{class:'c-field'},'Pilot name',name),el('label',{class:'c-field'},'Home base',base),
      el('div',{class:'row'},el('button',{class:'primary',on:{click:()=>{const n=name.value.trim().slice(0,24)||'Pilot';progress.name=n;save();newCareer(n,base.value);renderCareer();}}},'Start career'),el('button',{class:'ghost',on:{click:closeCareer}},'Back')),
      el('p',{class:'credit'},'Ту-95 Bear 3D by ',el('strong',{},'@harrisbasra™')));return;}
  const c=CAREER,P=c.pilot;
  root.append(el('div',{class:'c-head'},el('div',{},el('h2',{},P.name),el('p',{class:'c-sub'},`${rankFor(P.hours)} · ${P.hours.toFixed(1)} h · ${P.landings} landings · based at ${AIRPORT_BY_ICAO[P.base].city} · day ${Math.floor(c.day)}`)),
    el('div',{class:'c-bal'},el('span',{},'Balance'),el('strong',{class:c.cash<0?'neg':''},cr(c.cash)))));
  root.append(el('div',{class:'cats',role:'tablist'},[['jobs','Jobs'],['fleet','Fleet'],['bank','Bank'],['profile','Profile']].map(([k,n])=>el('button',{class:'ghost',role:'tab','aria-selected':String(CUI.tab===k),on:{click:()=>{CUI.tab=k;CUI.confirm=null;renderCareer();}}},n))));
  root.append(el('p',{id:'career-msg',class:'c-msg'}));
  const body=el('div',{class:'c-body'});root.append(body);
  ({jobs:careerJobs,fleet:careerFleet,bank:careerBank,profile:careerProfile})[CUI.tab](body);
  root.append(el('div',{class:'row c-foot'},el('button',{class:'ghost',on:{click:closeCareer}},'Back to the menu')),el('p',{class:'credit'},'Virtual credits only. Ту-95 Bear 3D by ',el('strong',{},'@harrisbasra™')));}
function careerJobs(body){const c=CAREER;if(!c.fleet.length){body.append(el('p',{},'You have no aircraft. Lease or buy one in the Fleet tab.'));return;}
  if(!CUI.fleet||!c.fleet.find(f=>f.id===CUI.fleet))CUI.fleet=c.fleet[0].id;const f=c.fleet.find(x=>x.id===CUI.fleet),sp=AIRCRAFT_BY_ID[f.type];
  body.append(el('label',{class:'c-field'},'Aircraft',el('select',{on:{change:e=>{CUI.fleet=e.target.value;renderCareer();}}},c.fleet.map(x=>el('option',{value:x.id,selected:x.id===f.id},`${x.name}: ${AIRCRAFT_BY_ID[x.type].name} at ${x.loc} (${Math.round(x.condition)}%)`)))));
  if(c.active)body.append(el('p',{class:'c-note'},`Flight in progress: ${c.active.title}. `,el('button',{class:'ghost',on:{click:()=>{const J=c.active,f2=c.fleet.find(x=>x.id===J.fleet);if(!f2){c.active=null;saveCareer();renderCareer();return;}if(!PLAN||!PLAN.job||PLAN.job.id!==J.id){const sp2=AIRCRAFT_BY_ID[f2.type];PLAN=planFlight(sp2,J.from,J.to,{load:(J.quote.payload||0)/sp2.payload});PLAN.job=J;progress.plane=sp2.id;}show($('#career'),false);startFlight();}}},'Resume'),' ',el('button',{class:'ghost',on:{click:()=>{c.active=null;PLAN=null;saveCareer();renderCareer();}}},'Cancel it')));
  const list=el('ol',{class:'log c-jobs'});
  for(const job of jobsAt(f.loc)){const q=jobQuote(job,f),why=canFly(job,f),d=AIRPORT_BY_ICAO[job.to];
    const est=q?planFlight(sp,job.from,job.to,{load:q.payload/sp.payload}):null;
    list.append(el('li',{},el('div',{class:'c-job'},el('span',{class:'nm'},job.title),
      el('span',{class:'sm'},`${job.from} to ${job.to} (${d.name}) · ${Math.round(job.dist/1000).toLocaleString('en-GB')} km${est?` · about ${Math.floor(est.hours)} h ${String(Math.round((est.hours%1)*60)).padStart(2,'0')}`:''} · ${q?(q.pax?`${q.pax} passengers`:`${q.t} t`):'—'}`),
      why?el('span',{class:'sm bad'},why):null),
      el('div',{class:'c-pay'},el('strong',{},q?cr(q.pay):'—'),el('button',{class:'primary',disabled:!!why,on:{click:()=>{startJob(job,f);show($('#career'),false);startFlight();}}},'Fly'))));}
  body.append(list);
  const to=el('select',{'aria-label':'Ferry to'},AIRPORTS.filter(a=>a.icao!==f.loc).map(a=>el('option',{value:a.icao},`${a.city} (${a.iata})`)));
  body.append(el('div',{class:'row c-ferry'},el('span',{},`Ferry ${f.name} empty to`),to,el('button',{class:'ghost',on:{click:()=>{if(f.condition<ECON.minCondition){careerMsg('Repair the aircraft first',true);return;}const P=ferryJob(f,to.value);if(!P.range){careerMsg('That’s beyond its range',true);CAREER.active=null;PLAN=null;return;}show($('#career'),false);startFlight();}}},'Fly the ferry')));}
function careerFleet(body){const c=CAREER;
  for(const f of c.fleet){const sp=AIRCRAFT_BY_ID[f.type],rep=ECON.prices[f.type]*ECON.repairPerPoint*(100-f.condition);
    const confirmKey='sell'+f.id;
    body.append(el('div',{class:'c-card'},el('div',{class:'c-row'},el('strong',{},`${f.name}: ${sp.name}`),el('span',{},f.own==='leased'?`Leased, ${cr(f.lease)} a month`:`Owned, worth about ${cr(marketValue(f))}`)),
      el('div',{class:'c-row sm'},`At ${f.loc} · ${f.hours.toFixed(1)} flight hours`),
      el('div',{class:'c-cond',title:'Condition'},el('i',{style:`width:${Math.round(f.condition)}%;background:${f.condition<ECON.minCondition?'#c23b2b':f.condition<55?'#e3a33a':'#5fae4f'}`}),el('span',{},`Condition ${Math.round(f.condition)}%${f.condition<ECON.minCondition?': grounded':''}`)),
      el('div',{class:'row'},el('button',{class:'ghost',disabled:f.condition>=99.5,on:{click:()=>{const e=repairAircraft(f.id);careerMsg(e||`${f.name} is back to 100%`,!!e);if(!e)renderCareer();}}},`Maintenance check (${cr(rep)})`),
        el('button',{class:'ghost',disabled:c.fleet.length<2,on:{click:()=>{if(CUI.confirm!==confirmKey){CUI.confirm=confirmKey;renderCareer();careerMsg(`Tap again to ${f.own==='leased'?'return':'sell'} ${f.name}`);return;}CUI.confirm=null;const e=sellAircraft(f.id);careerMsg(e||'Done',!!e);renderCareer();}}},CUI.confirm===confirmKey?'Tap again to confirm':f.own==='leased'?'Return to lessor':`Sell (${cr(marketValue(f)*ECON.sellFraction)})`))));}
  body.append(el('h3',{},'Market'),el('p',{class:'c-note'},'New and used aircraft are delivered to your home base. Leases are charged every 30 days.'));
  const t=el('table',{class:'c-table'},el('tr',{},['Aircraft','New','Used','Lease a month',''].map(h=>el('th',{},h))));
  for(const sp of careerAircraft()){const p=ECON.prices[sp.id];const buy=(used,lease)=>()=>{const e=buyAircraft(sp.id,used,lease);careerMsg(e||`${sp.name} added to the fleet`,!!e);if(!e)renderCareer();};
    t.append(el('tr',{},el('td',{},sp.name,el('br'),el('small',{},sp.pax?`${sp.pax} seats`:`${Math.round(sp.payload/1000)} t cargo`)),el('td',{},cr(p)),el('td',{},cr(p*ECON.usedPrice)),el('td',{},cr(p*ECON.leaseMonthly)),
      el('td',{class:'c-btns'},el('button',{class:'ghost',on:{click:buy(false,false)}},'Buy'),el('button',{class:'ghost',on:{click:buy(true,false)}},'Buy used'),el('button',{class:'ghost',on:{click:buy(false,true)}},'Lease'))));}
  body.append(t);}
function careerBank(body){const c=CAREER,o=loanOffer();
  body.append(el('h3',{},'Loans'));
  if(c.loans.length){const t=el('table',{class:'c-table'},el('tr',{},['Loan','Rate','Monthly','Left',''].map(h=>el('th',{},h))));
    for(const L of c.loans)t.append(el('tr',{},el('td',{},`${cr(L.principal)}, ${L.paid} of ${L.months} paid`),el('td',{},`${(L.rate*100).toFixed(1)}%`),el('td',{},cr(L.monthly)),el('td',{},cr(L.remaining)),el('td',{},el('button',{class:'ghost',on:{click:()=>{repayLoan(L.id);renderCareer();}}},'Repay'))));body.append(t);}
  else body.append(el('p',{class:'c-note'},'No loans.'));
  const amt=el('select',{'aria-label':'Amount'},[0.25,0.5,0.75,1].map(k=>Math.round(o.max*k/10000)*10000).filter((v,i,a)=>v>0&&a.indexOf(v)===i).map(v=>el('option',{value:v},cr(v))));
  const term=el('select',{'aria-label':'Term'},ECON.loanTerms.map(m=>el('option',{value:m,selected:m===36},`${m} months`)));
  body.append(o.max>0?el('div',{class:'row c-loan'},el('span',{},`The bank will lend up to ${cr(o.max)} at ${(o.rate*100).toFixed(1)}% a year.`),amt,term,
    el('button',{class:'ghost',on:{click:()=>{const ok=takeLoan(+amt.value,+term.value);careerMsg(ok?'Loan paid into your account':'The bank said no',!ok);renderCareer();}}},'Take the loan')):el('p',{class:'c-note'},'The bank won’t lend more until your fleet or income grows.'));
  body.append(el('h3',{},'Monthly summaries'));
  const all=[Object.assign({},c.month,{net:c.month.revenue-c.month.costs,cash:c.cash,current:true})].concat(c.months);
  const ms=el('table',{class:'c-table'},el('tr',{},['Month','Flights','Revenue','Costs','Net','Balance'].map(h=>el('th',{},h))));
  for(const m of all.slice(0,12))ms.append(el('tr',{},el('td',{},`${m.n}${m.current?' (so far)':''}`),el('td',{},m.flights),el('td',{},cr(m.revenue)),el('td',{},cr(m.costs)),el('td',{class:m.net<0?'neg':''},cr(m.net)),el('td',{},cr(m.cash))));body.append(ms);
  body.append(el('h3',{},'Statement'));
  const st=el('table',{class:'c-table c-stmt'},el('tr',{},['Day','Description','Amount','Balance'].map(h=>el('th',{},h))));
  for(const t of c.tx.slice(0,80))st.append(el('tr',{},el('td',{},t.d),el('td',{},t.desc),el('td',{class:t.amount<0?'neg':''},cr(t.amount)),el('td',{},cr(t.bal))));body.append(st);}
function careerProfile(body){const c=CAREER,P=c.pilot;const next=RANKS.find(r=>r[0]>P.hours);
  const dl=el('dl',{class:'stats'});const add=(k,v)=>dl.append(el('dt',{},k),el('dd',{},v));
  add('Rank',rankFor(P.hours)+(next?` (${next[1]} at ${next[0]} h)`:''));add('Flight hours',P.hours.toFixed(1));add('Flights',P.flights);add('Landings',`${P.landings}, ${P.landings?Math.round(P.smooth/P.landings*100):0}% smooth`);
  add('Home base',`${AIRPORT_BY_ICAO[P.base].name}, ${AIRPORT_BY_ICAO[P.base].city}`);add('Fleet',`${c.fleet.length} aircraft`);add('Career day',Math.floor(c.day));body.append(dl);
  const base=el('select',{},AIRPORTS.map(a=>el('option',{value:a.icao,selected:a.icao===P.base},`${a.city} (${a.iata})`)));
  body.append(el('div',{class:'row'},el('span',{},'Move home base to'),base,el('button',{class:'ghost',on:{click:()=>{P.base=base.value;saveCareer();renderCareer();careerMsg('New deliveries will go to '+AIRPORT_BY_ICAO[P.base].city);}}},'Move')));
  body.append(el('div',{class:'row'},el('button',{class:'ghost',on:{click:()=>{if(CUI.confirm!=='reset'){CUI.confirm='reset';renderCareer();careerMsg('Tap again to delete this career and start over. This can’t be undone.',true);return;}
    CUI.confirm=null;CAREER=null;try{localStorage.removeItem(CAREER_KEY);}catch(e){}if(typeof CLOUD!=='undefined'&&CLOUD.deleteCareer)CLOUD.deleteCareer();renderCareer();}}},CUI.confirm==='reset'?'Tap again to confirm':'Reset career')));}
function careerResultRows(r,add){for(const [k,v] of r.lines)add(k,cr(v));for(const [k,v] of r.costs)add(k,cr(-v));add('Net for the flight',cr(r.net));add('Bank balance',cr(r.cash));add('Aircraft condition',`${Math.round(r.fleet.condition)}%`);}
function wireCareer(){$('#btn-career').addEventListener('click',openCareer);}
