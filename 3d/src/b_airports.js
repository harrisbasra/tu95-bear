
/* ---------- airports ---------- */
// One entry per airport. Add an airport by adding an entry here (and, optionally, OpenStreetMap data in 3d/data/<ICAO>.js
// generated with scripts/osm-airport.mjs). The game loads one airport region at a time.
//
// Runways: physical runway ends and displaced thresholds from OurAirports (public domain, ourairports.com), which is
// compiled from the national AIPs; widths in metres. `ils` lists which ends have an ILS (assumed for every end at the
// large international airports; verified for Lahore). Elevations are the published field elevations.
// City districts, coastlines, rivers, hills and landmarks are simplified and approximate: they give each region its
// shape and skyline, not a survey.
// districts: [lat, lon, density 0..1, radius km, height factor]. water: polygons [[lat,lon]...]. rivers: {w metres, pts}.
// hills: [lat, lon, radius km, height m above the field]. landmarks: {type, name, lat, lon}. vis: typical daytime visibility, km.
const AIRPORTS=[
 {icao:'OPLA',vis:19,iata:'LHE',name:'Allama Iqbal International',city:'Lahore',country:'Pakistan',elev:217,ref:[31.5216,74.4036],osm:true,ground:'fields',haze:'#c9cfc8',
  rwys:[{id:'18L/36R',w:46,surf:'concrete',ils:['36R'],ends:[{n:'36R',lat:31.5065,lon:74.4043,disp:0},{n:'18L',lat:31.5366,lon:74.4048,disp:0}]},
        {id:'18R/36L',w:46,surf:'asphalt',ils:['36L'],ends:[{n:'36L',lat:31.5092,lon:74.4024,disp:0},{n:'18R',lat:31.5339,lon:74.4028,disp:0}]}],
  districts:[[31.583,74.315,1.0,3.2],[31.515,74.345,0.95,2.8],[31.47,74.28,0.85,3.5],[31.475,74.41,0.75,2.6],[31.512,74.372,0.55,1.6],[31.48,74.325,0.85,2.6],[31.625,74.282,0.55,2.4],[31.448,74.31,0.75,3.0],[31.54,74.31,0.9,2.8],[31.565,74.36,0.7,2.4],[31.42,74.25,0.55,3.5],
        [31.528,74.375,0.75,1.8],[31.495,74.43,0.6,1.6],[31.53,74.435,0.5,1.4],[31.555,74.405,0.5,1.5],[31.49,74.39,0.6,1.5]],
  rivers:[{name:'Ravi',w:240,bank:700,pts:[[31.72,74.45],[31.67,74.37],[31.635,74.315],[31.613,74.285],[31.585,74.255],[31.54,74.22],[31.48,74.19],[31.41,74.12]]}],
  landmarks:[{type:'minar',name:'Minar-e-Pakistan',lat:31.5925,lon:74.3095},{type:'badshahi',name:'Badshahi Mosque',lat:31.5879,lon:74.3101},{type:'fort',name:'Lahore Fort',lat:31.5878,lon:74.3155}]},
 {icao:'OPIS',vis:40,iata:'ISB',name:'Islamabad International',city:'Islamabad',country:'Pakistan',elev:536,ref:[33.549,72.826],osm:true,ground:'fields',haze:'#c8cfd2',
  rwys:[{id:'10L/28R',w:45,surf:'asphalt',ils:['10L','28R'],ends:[{n:'10L',lat:33.553001,lon:72.806602,disp:0},{n:'28R',lat:33.547001,lon:72.845200,disp:0}]},
        {id:'10R/28L',w:60,surf:'asphalt',ils:['10R','28L'],ends:[{n:'10R',lat:33.551174,lon:72.806145,disp:0},{n:'28L',lat:33.545124,lon:72.844826,disp:0}]}],
  districts:[[33.70,73.05,0.8,4,1.2],[33.60,73.06,1.0,4],[33.52,73.10,0.6,3],[33.68,72.98,0.5,2],[33.63,72.95,0.45,2.5],[33.56,72.75,0.35,2.5]],
  hills:[[33.77,72.93,4.5,700],[33.78,73.03,5,950],[33.77,73.14,5,850],[33.74,72.84,3.5,450],[33.80,73.22,6,1100]],
  landmarks:[{type:'faisal',name:'Faisal Mosque',lat:33.7295,lon:73.0372}]},
 {icao:'OPKC',vis:24,iata:'KHI',name:'Jinnah International',city:'Karachi',country:'Pakistan',elev:30,ref:[24.9065,67.1608],osm:true,ground:'arid',haze:'#d4cfc2',
  rwys:[{id:'07L/25R',w:46,surf:'concrete',ils:['25R','07L'],ends:[{n:'07L',lat:24.904699,lon:67.147598,disp:0},{n:'25R',lat:24.912399,lon:67.178001,disp:0}]},
        {id:'07R/25L',w:46,surf:'concrete',ils:['25L','07R'],ends:[{n:'07R',lat:24.900400,lon:67.142601,disp:0},{n:'25L',lat:24.908701,lon:67.175003,disp:0}]}],
  districts:[[24.86,67.01,1.0,6,1.5],[24.92,67.09,0.9,4],[24.83,67.13,0.8,3.5],[24.89,67.20,0.7,3],[24.94,67.04,0.9,4],[24.82,67.03,0.8,2.5,1.6],[24.96,67.13,0.6,3]],
  water:[[[24.86,66.60],[24.83,66.90],[24.80,66.98],[24.81,67.03],[24.79,67.08],[24.81,67.18],[24.77,67.30],[24.70,67.42],[24.40,67.42],[24.40,66.60]]],
  landmarks:[{type:'mazar',name:'Mazar-e-Quaid',lat:24.8753,lon:67.0400}]},
 {icao:'OMDB',vis:20,iata:'DXB',name:'Dubai International',city:'Dubai',country:'United Arab Emirates',elev:19,ref:[25.2528,55.3644],osm:true,ground:'desert',haze:'#dcd1bb',
  rwys:[{id:'12L/30R',w:60,surf:'asphalt',ils:['12L','30R'],ends:[{n:'12L',lat:25.264627,lon:55.350422,disp:450},{n:'30R',lat:25.247709,lon:55.380932,disp:300}]},
        {id:'12R/30L',w:60,surf:'asphalt',ils:['12R','30L'],ends:[{n:'12R',lat:25.252836,lon:55.364376,disp:715},{n:'30L',lat:25.235920,lon:55.394882,disp:132}]}],
  districts:[[25.27,55.31,0.9,3,1.3],[25.25,55.29,0.8,2.5,1.2],[25.19,55.27,1.0,2.5,4.5],[25.185,55.26,0.9,2,3],[25.08,55.14,1.0,2.5,4],[25.34,55.40,0.9,4,1.5],[25.28,55.38,0.7,2.5],[25.13,55.20,0.7,4,1.4],[25.22,55.42,0.5,3]],
  water:[[[25.00,54.90],[25.06,55.11],[25.14,55.19],[25.20,55.24],[25.24,55.27],[25.27,55.295],[25.30,55.33],[25.33,55.37],[25.40,55.43],[25.47,55.50],[25.65,55.62],[25.65,54.90]]],
  rivers:[{name:'Dubai Creek',w:220,bank:0,pts:[[25.272,55.296],[25.262,55.306],[25.246,55.322],[25.225,55.334],[25.205,55.340]]}],
  landmarks:[{type:'burj',name:'Burj Khalifa',lat:25.1972,lon:55.2744},{type:'sail',name:'Burj Al Arab',lat:25.1412,lon:55.1853}]},
 {icao:'EGLL',vis:28,iata:'LHR',name:'Heathrow',city:'London',country:'United Kingdom',elev:25,ref:[51.4707,-0.4619],osm:true,ground:'temperate',haze:'#c4c9cc',
  rwys:[{id:'09L/27R',w:50,surf:'asphalt',ils:['09L','27R'],ends:[{n:'09L',lat:51.477490,lon:-0.489439,disp:307},{n:'27R',lat:51.477681,lon:-0.433227,disp:0}]},
        {id:'09R/27L',w:50,surf:'asphalt',ils:['09R','27L'],ends:[{n:'09R',lat:51.464780,lon:-0.486808,disp:309},{n:'27L',lat:51.464957,lon:-0.434048,disp:0}]}],
  districts:[[51.51,-0.12,1.0,6,1.6],[51.515,-0.085,1.0,1.5,4],[51.505,-0.02,1.0,1.2,5],[51.47,-0.36,0.8,3],[51.51,-0.59,0.7,3],[51.51,-0.30,0.8,3],[51.43,-0.51,0.6,2],[51.51,-0.42,0.7,2.5],[51.45,-0.20,0.9,4],[51.56,-0.25,0.9,4],[51.42,-0.30,0.8,3]],
  rivers:[{name:'Thames',w:200,bank:0,pts:[[51.487,-0.61],[51.46,-0.55],[51.43,-0.51],[51.41,-0.42],[51.41,-0.34],[51.45,-0.30],[51.48,-0.25],[51.49,-0.21],[51.48,-0.17],[51.49,-0.12],[51.505,-0.10],[51.505,-0.07],[51.49,-0.03],[51.50,0.0],[51.49,0.05]]}],
  water:[[[51.462,-0.535],[51.465,-0.522],[51.452,-0.518],[51.448,-0.530]],[[51.475,-0.536],[51.478,-0.527],[51.468,-0.525]]],
  landmarks:[{type:'castle',name:'Windsor Castle',lat:51.4839,lon:-0.6044},{type:'shard',name:'The Shard',lat:51.5045,lon:-0.0865}]},
 {icao:'KJFK',vis:32,iata:'JFK',name:'John F. Kennedy International',city:'New York',country:'United States',elev:4,ref:[40.6398,-73.7789],osm:true,ground:'temperate',haze:'#c5cbd0',
  rwys:[{id:'04L/22R',w:61,surf:'concrete',ils:['04L','22R'],ends:[{n:'04L',lat:40.622002,lon:-73.785599,disp:141},{n:'22R',lat:40.648800,lon:-73.764702,disp:822}]},
        {id:'04R/22L',w:61,surf:'asphalt',ils:['04R','22L'],ends:[{n:'04R',lat:40.625401,lon:-73.770302,disp:0},{n:'22L',lat:40.645199,lon:-73.754898,disp:0}]},
        {id:'13L/31R',w:61,surf:'concrete',ils:['13L','31R'],ends:[{n:'13L',lat:40.657799,lon:-73.790199,disp:276},{n:'31R',lat:40.643700,lon:-73.759300,disp:314}]},
        {id:'13R/31L',w:61,surf:'concrete',ils:['13R','31L'],ends:[{n:'13R',lat:40.648399,lon:-73.816704,disp:623},{n:'31L',lat:40.627899,lon:-73.771599,disp:995}]}],
  districts:[[40.755,-73.985,1.0,2.5,6],[40.71,-74.01,1.0,1.4,5],[40.65,-73.95,1.0,6,1.2],[40.72,-73.83,0.9,6],[40.70,-73.65,0.6,6],[40.70,-73.80,0.8,3],[40.72,-74.05,0.8,2.5,2],[40.79,-73.95,0.9,2.5,2.2]],
  water:[[[40.622,-73.86],[40.640,-73.835],[40.648,-73.805],[40.640,-73.795],[40.622,-73.790],[40.605,-73.80],[40.598,-73.83],[40.598,-73.88]],
         [[40.575,-74.05],[40.583,-73.95],[40.585,-73.85],[40.590,-73.75],[40.585,-73.60],[40.40,-73.55],[40.40,-74.05]],
         [[40.70,-74.05],[40.72,-74.02],[40.69,-74.00],[40.66,-74.03],[40.60,-74.04],[40.60,-74.08],[40.65,-74.10]]],
  rivers:[{name:'East River',w:350,bank:0,pts:[[40.80,-73.93],[40.775,-73.94],[40.75,-73.965],[40.73,-73.97],[40.71,-73.99],[40.70,-74.01]]},{name:'Hudson',w:1100,bank:0,pts:[[40.88,-73.93],[40.82,-73.96],[40.77,-74.00],[40.73,-74.015],[40.70,-74.025]]}],
  landmarks:[{type:'empire',name:'Empire State Building',lat:40.7484,lon:-73.9857},{type:'owtc',name:'One World Trade Center',lat:40.7127,lon:-74.0134},{type:'liberty',name:'Statue of Liberty',lat:40.6892,lon:-74.0445}]},
 {icao:'LTFM',vis:32,iata:'IST',name:'Istanbul',city:'Istanbul',country:'Türkiye',elev:99,ref:[41.2753,28.7519],osm:true,ground:'temperate',haze:'#c9ccc6',
  rwys:[{id:'16L/34R',w:45,surf:'asphalt',ils:['16L','34R'],ends:[{n:'16L',lat:41.298599,lon:28.709200,disp:0},{n:'34R',lat:41.264900,lon:28.709900,disp:0}]},
        {id:'16R/34L',w:60,surf:'asphalt',ils:['16R','34L'],ends:[{n:'16R',lat:41.298599,lon:28.706751,disp:0},{n:'34L',lat:41.264839,lon:28.707411,disp:0}]},
        {id:'17L/35R',w:60,surf:'asphalt',ils:['17L','35R'],ends:[{n:'17L',lat:41.298828,lon:28.727039,disp:0},{n:'35R',lat:41.261921,lon:28.727760,disp:0}]},
        {id:'17R/35L',w:45,surf:'asphalt',ils:['17R','35L'],ends:[{n:'17R',lat:41.298801,lon:28.724501,disp:0},{n:'35L',lat:41.261902,lon:28.725299,disp:0}]},
        {id:'18/36',w:45,surf:'concrete',ils:['18','36'],ends:[{n:'18',lat:41.289799,lon:28.756201,disp:0},{n:'36',lat:41.262199,lon:28.756701,disp:0}]},
        {id:'09/27',w:45,surf:'concrete',ils:['09','27'],ends:[{n:'09',lat:41.253693,lon:28.766272,disp:0},{n:'27',lat:41.254063,lon:28.800018,disp:0}]}],
  districts:[[41.01,28.97,1.0,4,1.2],[41.05,28.99,1.0,3,2],[41.08,29.01,1.0,2,4],[40.99,29.03,0.9,4],[41.02,29.03,0.8,3],[41.09,28.80,0.8,3,1.5],[41.18,28.74,0.5,3],[41.05,28.87,0.9,4,1.3]],
  water:[[[41.32,28.35],[41.345,28.55],[41.34,28.72],[41.31,28.90],[41.25,29.05],[41.235,29.12],[41.70,29.12],[41.70,28.35]],
         [[41.0,28.55],[40.98,28.80],[40.99,28.95],[41.0,29.0],[40.96,29.10],[40.80,29.30],[40.70,29.30],[40.70,28.55]]],
  rivers:[{name:'Bosphorus',w:900,bank:0,pts:[[41.235,29.11],[41.19,29.07],[41.12,29.06],[41.08,29.05],[41.04,29.01],[41.01,28.995],[40.995,29.0]]},{name:'Golden Horn',w:300,bank:0,pts:[[41.02,28.975],[41.03,28.955],[41.045,28.94]]}],
  landmarks:[{type:'hagia',name:'Hagia Sophia',lat:41.0086,lon:28.9802},{type:'mosque6',name:'Blue Mosque',lat:41.0054,lon:28.9768}]},
 {icao:'OEJN',vis:24,iata:'JED',name:'King Abdulaziz International',city:'Jeddah',country:'Saudi Arabia',elev:15,ref:[21.6796,39.1565],osm:true,ground:'desert',haze:'#ddd2bd',
  rwys:[{id:'16C/34C',w:60,surf:'asphalt',ils:['16C','34C'],ends:[{n:'16C',lat:21.695070,lon:39.151543,disp:0},{n:'34C',lat:21.661179,lon:39.164917,disp:0}]},
        {id:'16L/34R',w:60,surf:'asphalt',ils:['16L','34R'],ends:[{n:'16L',lat:21.700436,lon:39.167131,disp:0},{n:'34R',lat:21.666500,lon:39.180500,disp:0}]},
        {id:'16R/34L',w:60,surf:'asphalt',ils:['16R','34L'],ends:[{n:'16R',lat:21.702700,lon:39.126900,disp:0},{n:'34L',lat:21.670500,lon:39.139599,disp:0}]}],
  districts:[[21.49,39.19,1.0,5,1.5],[21.485,39.187,0.9,1.5],[21.6,39.13,0.8,4,1.3],[21.73,39.10,0.6,2],[21.55,39.22,0.8,4]],
  water:[[[22.2,38.80],[22.2,39.02],[21.9,39.07],[21.76,39.095],[21.72,39.10],[21.6,39.125],[21.5,39.155],[21.45,39.16],[21.3,39.12],[21.2,39.10],[21.2,38.80]]],
  landmarks:[{type:'fountain',name:'King Fahd’s Fountain',lat:21.5150,lon:39.1428}]}
];
const AIRPORT_BY_ICAO={};for(const a of AIRPORTS)AIRPORT_BY_ICAO[a.icao]=a;
