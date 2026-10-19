const router    = require('express').Router();
const auth      = require('../middleware/auth');
const User      = require('../models/User');
const axios     = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 120 });

// ── 500+ NSE stocks ───────────────────────────────────────────────────────
const ALL_STOCKS = [
  // NIFTY 50
  { symbol:'RELIANCE',   name:'Reliance Industries',         sector:'Energy'      },
  { symbol:'TCS',        name:'Tata Consultancy Services',   sector:'IT'          },
  { symbol:'HDFCBANK',   name:'HDFC Bank',                   sector:'Banking'     },
  { symbol:'INFY',       name:'Infosys',                     sector:'IT'          },
  { symbol:'ICICIBANK',  name:'ICICI Bank',                  sector:'Banking'     },
  { symbol:'HINDUNILVR', name:'Hindustan Unilever',          sector:'FMCG'        },
  { symbol:'ITC',        name:'ITC Limited',                 sector:'FMCG'        },
  { symbol:'SBIN',       name:'State Bank of India',         sector:'Banking'     },
  { symbol:'BHARTIARTL', name:'Bharti Airtel',               sector:'Telecom'     },
  { symbol:'KOTAKBANK',  name:'Kotak Mahindra Bank',         sector:'Banking'     },
  { symbol:'LT',         name:'Larsen & Toubro',             sector:'Infra'       },
  { symbol:'BAJFINANCE', name:'Bajaj Finance',               sector:'NBFC'        },
  { symbol:'HCLTECH',    name:'HCL Technologies',            sector:'IT'          },
  { symbol:'ASIANPAINT', name:'Asian Paints',                sector:'Chemicals'   },
  { symbol:'AXISBANK',   name:'Axis Bank',                   sector:'Banking'     },
  { symbol:'WIPRO',      name:'Wipro',                       sector:'IT'          },
  { symbol:'MARUTI',     name:'Maruti Suzuki',               sector:'Auto'        },
  { symbol:'SUNPHARMA',  name:'Sun Pharmaceutical',          sector:'Pharma'      },
  { symbol:'TITAN',      name:'Titan Company',               sector:'Consumer'    },
  { symbol:'TATAMOTORS', name:'Tata Motors',                 sector:'Auto'        },
  { symbol:'NTPC',       name:'NTPC Limited',                sector:'Utilities'   },
  { symbol:'POWERGRID',  name:'Power Grid Corp',             sector:'Utilities'   },
  { symbol:'TATASTEEL',  name:'Tata Steel',                  sector:'Metals'      },
  { symbol:'ONGC',       name:'Oil & Natural Gas Corp',      sector:'Energy'      },
  { symbol:'ULTRACEMCO', name:'UltraTech Cement',            sector:'Cement'      },
  { symbol:'ADANIENT',   name:'Adani Enterprises',           sector:'Diversified' },
  { symbol:'ADANIPORTS', name:'Adani Ports',                 sector:'Infra'       },
  { symbol:'JSWSTEEL',   name:'JSW Steel',                   sector:'Metals'      },
  { symbol:'BAJAJFINSV', name:'Bajaj Finserv',               sector:'NBFC'        },
  { symbol:'INDUSINDBK', name:'IndusInd Bank',               sector:'Banking'     },
  { symbol:'DRREDDY',    name:'Dr Reddys Labs',              sector:'Pharma'      },
  { symbol:'CIPLA',      name:'Cipla',                       sector:'Pharma'      },
  { symbol:'HINDALCO',   name:'Hindalco Industries',         sector:'Metals'      },
  { symbol:'GRASIM',     name:'Grasim Industries',           sector:'Diversified' },
  { symbol:'NESTLEIND',  name:'Nestle India',                sector:'FMCG'        },
  { symbol:'DIVISLAB',   name:'Divis Laboratories',          sector:'Pharma'      },
  { symbol:'TATACONSUM', name:'Tata Consumer Products',      sector:'FMCG'        },
  { symbol:'BRITANNIA',  name:'Britannia Industries',        sector:'FMCG'        },
  { symbol:'APOLLOHOSP', name:'Apollo Hospitals',            sector:'Healthcare'  },
  { symbol:'EICHERMOT',  name:'Eicher Motors',               sector:'Auto'        },
  { symbol:'HEROMOTOCO', name:'Hero MotoCorp',               sector:'Auto'        },
  { symbol:'BPCL',       name:'Bharat Petroleum',            sector:'Energy'      },
  { symbol:'COALINDIA',  name:'Coal India',                  sector:'Energy'      },
  { symbol:'SBILIFE',    name:'SBI Life Insurance',          sector:'Insurance'   },
  { symbol:'HDFCLIFE',   name:'HDFC Life Insurance',         sector:'Insurance'   },
  { symbol:'TECHM',      name:'Tech Mahindra',               sector:'IT'          },
  { symbol:'BAJAJ-AUTO', name:'Bajaj Auto',                  sector:'Auto'        },
  { symbol:'M&M',        name:'Mahindra & Mahindra',         sector:'Auto'        },
  { symbol:'TATAPOWER',  name:'Tata Power',                  sector:'Utilities'   },
  { symbol:'ZOMATO',     name:'Zomato',                      sector:'Tech'        },

  // NIFTY NEXT 50
  { symbol:'ADANIGREEN', name:'Adani Green Energy',          sector:'Utilities'   },
  { symbol:'ADANITRANS', name:'Adani Transmission',          sector:'Utilities'   },
  { symbol:'AMBUJACEM',  name:'Ambuja Cements',              sector:'Cement'      },
  { symbol:'AUROPHARMA', name:'Aurobindo Pharma',            sector:'Pharma'      },
  { symbol:'BANDHANBNK', name:'Bandhan Bank',                sector:'Banking'     },
  { symbol:'BERGEPAINT', name:'Berger Paints',               sector:'Chemicals'   },
  { symbol:'BIOCON',     name:'Biocon',                      sector:'Pharma'      },
  { symbol:'BOSCHLTD',   name:'Bosch',                       sector:'Auto'        },
  { symbol:'CANBK',      name:'Canara Bank',                 sector:'Banking'     },
  { symbol:'CHOLAFIN',   name:'Cholamandalam Finance',       sector:'NBFC'        },
  { symbol:'COLPAL',     name:'Colgate-Palmolive',           sector:'FMCG'        },
  { symbol:'DABUR',      name:'Dabur India',                 sector:'FMCG'        },
  { symbol:'DLF',        name:'DLF Limited',                 sector:'RealEstate'  },
  { symbol:'GODREJCP',   name:'Godrej Consumer Products',    sector:'FMCG'        },
  { symbol:'HAVELLS',    name:'Havells India',               sector:'Consumer'    },
  { symbol:'ICICIPRULI', name:'ICICI Prudential Life',       sector:'Insurance'   },
  { symbol:'ICICIGI',    name:'ICICI Lombard General',       sector:'Insurance'   },
  { symbol:'INDHOTEL',   name:'Indian Hotels',               sector:'Hospitality' },
  { symbol:'INDUSTOWER', name:'Indus Towers',                sector:'Telecom'     },
  { symbol:'IRCTC',      name:'Indian Railway Catering',     sector:'Services'    },
  { symbol:'JUBLFOOD',   name:'Jubilant Foodworks',          sector:'Consumer'    },
  { symbol:'LICHSGFIN',  name:'LIC Housing Finance',         sector:'NBFC'        },
  { symbol:'LICI',       name:'Life Insurance Corp',         sector:'Insurance'   },
  { symbol:'LUPIN',      name:'Lupin',                       sector:'Pharma'      },
  { symbol:'MARICO',     name:'Marico',                      sector:'FMCG'        },
  { symbol:'MCDOWELL-N', name:'United Spirits',              sector:'FMCG'        },
  { symbol:'MOTHERSON',  name:'Samvardhana Motherson',       sector:'Auto'        },
  { symbol:'MPHASIS',    name:'Mphasis',                     sector:'IT'          },
  { symbol:'NAUKRI',     name:'Info Edge (Naukri)',          sector:'Tech'        },
  { symbol:'NYKAA',      name:'FSN E-Commerce (Nykaa)',      sector:'Tech'        },
  { symbol:'PAGEIND',    name:'Page Industries',             sector:'Consumer'    },
  { symbol:'PAYTM',      name:'One97 Communications',        sector:'Fintech'     },
  { symbol:'PGHH',       name:'P&G Hygiene',                 sector:'FMCG'        },
  { symbol:'PIDILITIND', name:'Pidilite Industries',         sector:'Chemicals'   },
  { symbol:'PNB',        name:'Punjab National Bank',        sector:'Banking'     },
  { symbol:'SBICARD',    name:'SBI Cards',                   sector:'NBFC'        },
  { symbol:'SHREECEM',   name:'Shree Cement',                sector:'Cement'      },
  { symbol:'SIEMENS',    name:'Siemens India',               sector:'Capital Goods'},
  { symbol:'SRF',        name:'SRF Limited',                 sector:'Chemicals'   },
  { symbol:'TORNTPHARM', name:'Torrent Pharmaceuticals',     sector:'Pharma'      },
  { symbol:'TRENT',      name:'Trent',                       sector:'Retail'      },
  { symbol:'VEDL',       name:'Vedanta',                     sector:'Metals'      },
  { symbol:'VOLTAS',     name:'Voltas',                      sector:'Consumer'    },
  { symbol:'WHIRLPOOL',  name:'Whirlpool of India',          sector:'Consumer'    },
  { symbol:'ZEEL',       name:'Zee Entertainment',           sector:'Media'       },

  // NIFTY MIDCAP 100
  { symbol:'AARTIIND',   name:'Aarti Industries',            sector:'Chemicals'   },
  { symbol:'ABBOTINDIA', name:'Abbott India',                sector:'Pharma'      },
  { symbol:'ABCAPITAL',  name:'Aditya Birla Capital',        sector:'NBFC'        },
  { symbol:'ABFRL',      name:'Aditya Birla Fashion',        sector:'Retail'      },
  { symbol:'ACC',        name:'ACC Cement',                  sector:'Cement'      },
  { symbol:'ALKEM',      name:'Alkem Laboratories',          sector:'Pharma'      },
  { symbol:'APLLTD',     name:'Alembic Pharma',              sector:'Pharma'      },
  { symbol:'ASTRAL',     name:'Astral Limited',              sector:'Chemicals'   },
  { symbol:'ATUL',       name:'Atul Limited',                sector:'Chemicals'   },
  { symbol:'AUBANK',     name:'AU Small Finance Bank',       sector:'Banking'     },
  { symbol:'BALKRISIND', name:'Balkrishna Industries',       sector:'Auto'        },
  { symbol:'BATAINDIA',  name:'Bata India',                  sector:'Consumer'    },
  { symbol:'BEL',        name:'Bharat Electronics',          sector:'Defence'     },
  { symbol:'BHARATFORG', name:'Bharat Forge',                sector:'Auto'        },
  { symbol:'BHEL',       name:'Bharat Heavy Electricals',    sector:'Capital Goods'},
  { symbol:'CANFINHOME', name:'Can Fin Homes',               sector:'NBFC'        },
  { symbol:'CASTROLIND', name:'Castrol India',               sector:'Energy'      },
  { symbol:'CESC',       name:'CESC Limited',                sector:'Utilities'   },
  { symbol:'CGPOWER',    name:'CG Power',                    sector:'Capital Goods'},
  { symbol:'CHAMBLFERT', name:'Chambal Fertilisers',         sector:'Chemicals'   },
  { symbol:'CROMPTON',   name:'Crompton Greaves Consumer',   sector:'Consumer'    },
  { symbol:'CUMMINSIND', name:'Cummins India',               sector:'Capital Goods'},
  { symbol:'DALBHARAT',  name:'Dalmia Bharat',               sector:'Cement'      },
  { symbol:'DEEPAKNTR',  name:'Deepak Nitrite',              sector:'Chemicals'   },
  { symbol:'DELTACORP',  name:'Delta Corp',                  sector:'Gaming'      },
  { symbol:'DIXON',      name:'Dixon Technologies',          sector:'Consumer'    },
  { symbol:'DMART',      name:'Avenue Supermarts (DMart)',   sector:'Retail'      },
  { symbol:'ELGIEQUIP',  name:'Elgi Equipments',             sector:'Capital Goods'},
  { symbol:'ENGINERSIN', name:'Engineers India',             sector:'Capital Goods'},
  { symbol:'EQUITASBNK', name:'Equitas Small Finance Bank',  sector:'Banking'     },
  { symbol:'ESCORTS',    name:'Escorts Kubota',              sector:'Auto'        },
  { symbol:'EXIDEIND',   name:'Exide Industries',            sector:'Auto'        },
  { symbol:'FEDERALBNK', name:'Federal Bank',                sector:'Banking'     },
  { symbol:'FLUOROCHEM', name:'Gujarat Fluorochemicals',     sector:'Chemicals'   },
  { symbol:'FORTIS',     name:'Fortis Healthcare',           sector:'Healthcare'  },
  { symbol:'GAIL',       name:'GAIL India',                  sector:'Energy'      },
  { symbol:'GLENMARK',   name:'Glenmark Pharma',             sector:'Pharma'      },
  { symbol:'GMRINFRA',   name:'GMR Airports Infra',          sector:'Infra'       },
  { symbol:'GNFC',       name:'Gujarat Narmada Valley',      sector:'Chemicals'   },
  { symbol:'GODREJPROP', name:'Godrej Properties',           sector:'RealEstate'  },
  { symbol:'GRANULES',   name:'Granules India',              sector:'Pharma'      },
  { symbol:'GRAPHITE',   name:'Graphite India',              sector:'Metals'      },
  { symbol:'GUJGASLTD',  name:'Gujarat Gas',                 sector:'Energy'      },
  { symbol:'HAL',        name:'Hindustan Aeronautics',       sector:'Defence'     },
  { symbol:'HFCL',       name:'HFCL Limited',                sector:'Telecom'     },
  { symbol:'HINDZINC',   name:'Hindustan Zinc',              sector:'Metals'      },
  { symbol:'HONAUT',     name:'Honeywell Automation',        sector:'Capital Goods'},
  { symbol:'HUDCO',      name:'HUDCO',                       sector:'NBFC'        },
  { symbol:'IBREALEST',  name:'Indiabulls Real Estate',      sector:'RealEstate'  },
  { symbol:'IDFCFIRSTB', name:'IDFC First Bank',             sector:'Banking'     },
  { symbol:'IEX',        name:'Indian Energy Exchange',      sector:'Services'    },
  { symbol:'IFCI',       name:'IFCI Limited',                sector:'NBFC'        },
  { symbol:'IIFL',       name:'IIFL Finance',                sector:'NBFC'        },
  { symbol:'INDIANB',    name:'Indian Bank',                 sector:'Banking'     },
  { symbol:'INDIAMART',  name:'IndiaMART InterMESH',         sector:'Tech'        },
  { symbol:'IOC',        name:'Indian Oil Corporation',      sector:'Energy'      },
  { symbol:'IRB',        name:'IRB Infrastructure',          sector:'Infra'       },
  { symbol:'ISEC',       name:'ICICI Securities',            sector:'Fintech'     },
  { symbol:'J&KBANK',    name:'Jammu & Kashmir Bank',        sector:'Banking'     },
  { symbol:'JKCEMENT',   name:'JK Cement',                   sector:'Cement'      },
  { symbol:'JKPAPER',    name:'JK Paper',                    sector:'Paper'       },
  { symbol:'JKTYRE',     name:'JK Tyre & Industries',        sector:'Auto'        },
  { symbol:'JSL',        name:'Jindal Stainless',            sector:'Metals'      },
  { symbol:'JINDALSTEL', name:'Jindal Steel & Power',        sector:'Metals'      },
  { symbol:'KAJARIACER', name:'Kajaria Ceramics',            sector:'Consumer'    },
  { symbol:'KALPATPOWR', name:'Kalpataru Projects',          sector:'Infra'       },
  { symbol:'KEC',        name:'KEC International',           sector:'Infra'       },
  { symbol:'KPIL',       name:'Kalpataru Power Transmission',sector:'Infra'       },
  { symbol:'KRBL',       name:'KRBL Limited',                sector:'FMCG'        },
  { symbol:'LALPATHLAB', name:'Dr Lal PathLabs',             sector:'Healthcare'  },
  { symbol:'LAURUSLABS',  name:'Laurus Labs',                sector:'Pharma'      },
  { symbol:'LTIM',       name:'LTIMindtree',                 sector:'IT'          },
  { symbol:'LTTS',       name:'L&T Technology Services',     sector:'IT'          },
  { symbol:'MAHLIFE',    name:'Mahindra Lifespace',          sector:'RealEstate'  },
  { symbol:'MANAPPURAM', name:'Manappuram Finance',          sector:'NBFC'        },
  { symbol:'MASTEK',     name:'Mastek',                      sector:'IT'          },
  { symbol:'MFSL',       name:'Max Financial Services',      sector:'Insurance'   },
  { symbol:'MMTC',       name:'MMTC Limited',                sector:'Metals'      },
  { symbol:'MOIL',       name:'MOIL Limited',                sector:'Metals'      },
  { symbol:'MRPL',       name:'MRPL',                        sector:'Energy'      },
  { symbol:'MRF',        name:'MRF Limited',                 sector:'Auto'        },
  { symbol:'NATIONALUM', name:'National Aluminium',          sector:'Metals'      },
  { symbol:'NAVINFLUOR', name:'Navin Fluorine',              sector:'Chemicals'   },
  { symbol:'NCC',        name:'NCC Limited',                 sector:'Infra'       },
  { symbol:'NHPC',       name:'NHPC Limited',                sector:'Utilities'   },
  { symbol:'NLCINDIA',   name:'NLC India',                   sector:'Utilities'   },
  { symbol:'NMDC',       name:'NMDC Limited',                sector:'Metals'      },
  { symbol:'NOCIL',      name:'NOCIL Limited',               sector:'Chemicals'   },
  { symbol:'OBEROIRLTY', name:'Oberoi Realty',               sector:'RealEstate'  },
  { symbol:'OIL',        name:'Oil India',                   sector:'Energy'      },
  { symbol:'OLECTRA',    name:'Olectra Greentech',           sector:'Auto'        },
  { symbol:'ORIENTCEM',  name:'Orient Cement',               sector:'Cement'      },
  { symbol:'PCBL',       name:'PCBL Limited',                sector:'Chemicals'   },
  { symbol:'PERSISTENT', name:'Persistent Systems',          sector:'IT'          },
  { symbol:'PETRONET',   name:'Petronet LNG',                sector:'Energy'      },
  { symbol:'PFIZER',     name:'Pfizer India',                sector:'Pharma'      },
  { symbol:'PHOENIXLTD', name:'Phoenix Mills',               sector:'RealEstate'  },
  { symbol:'PIIND',      name:'PI Industries',               sector:'Chemicals'   },
  { symbol:'POLYCAB',    name:'Polycab India',               sector:'Capital Goods'},
  { symbol:'PRESTIGE',   name:'Prestige Estates',            sector:'RealEstate'  },
  { symbol:'PRINCEPIPE', name:'Prince Pipes',                sector:'Consumer'    },
  { symbol:'PRSMJOHNSN', name:'Prism Johnson',               sector:'Cement'      },
  { symbol:'RAJESHEXPO', name:'Rajesh Exports',              sector:'Consumer'    },
  { symbol:'RAMCOCEM',   name:'Ramco Cements',               sector:'Cement'      },
  { symbol:'RATNAMANI',  name:'Ratnamani Metals',            sector:'Metals'      },
  { symbol:'RECLTD',     name:'REC Limited',                 sector:'NBFC'        },
  { symbol:'RELAXO',     name:'Relaxo Footwears',            sector:'Consumer'    },
  { symbol:'RBLBANK',    name:'RBL Bank',                    sector:'Banking'     },
  { symbol:'RITES',      name:'RITES Limited',               sector:'Services'    },
  { symbol:'ROSSARI',    name:'Rossari Biotech',             sector:'Chemicals'   },
  { symbol:'SAIL',       name:'Steel Authority of India',    sector:'Metals'      },
  { symbol:'SCHAEFFLER', name:'Schaeffler India',            sector:'Auto'        },
  { symbol:'SEQUENT',    name:'SeQuent Scientific',          sector:'Pharma'      },
  { symbol:'SHYAMMETL',  name:'Shyam Metalics',             sector:'Metals'      },
  { symbol:'SKFINDIA',   name:'SKF India',                   sector:'Capital Goods'},
  { symbol:'SOBHA',      name:'Sobha Limited',               sector:'RealEstate'  },
  { symbol:'SOLARA',     name:'Solara Active Pharma',        sector:'Pharma'      },
  { symbol:'SONACOMS',   name:'Sona BLW Precision',          sector:'Auto'        },
  { symbol:'SPICEJET',   name:'SpiceJet',                    sector:'Aviation'    },
  { symbol:'STAR',       name:'Star Health Insurance',       sector:'Insurance'   },
  { symbol:'STARCEMENT', name:'Star Cement',                 sector:'Cement'      },
  { symbol:'SUMICHEM',   name:'Sumitomo Chemical',           sector:'Chemicals'   },
  { symbol:'SUNDARMFIN', name:'Sundaram Finance',            sector:'NBFC'        },
  { symbol:'SUNDRMBRAK', name:'Sundaram-Clayton',            sector:'Auto'        },
  { symbol:'SUNTV',      name:'Sun TV Network',              sector:'Media'       },
  { symbol:'SUPRAJIT',   name:'Suprajit Engineering',        sector:'Auto'        },
  { symbol:'SUPREMEIND', name:'Supreme Industries',          sector:'Chemicals'   },
  { symbol:'SUVEN',      name:'Suven Pharmaceuticals',       sector:'Pharma'      },
  { symbol:'SUZLON',     name:'Suzlon Energy',               sector:'Utilities'   },
  { symbol:'SYMPHONY',   name:'Symphony Limited',            sector:'Consumer'    },
  { symbol:'TANLA',      name:'Tanla Platforms',             sector:'Tech'        },
  { symbol:'TATACHEM',   name:'Tata Chemicals',              sector:'Chemicals'   },
  { symbol:'TATACOMM',   name:'Tata Communications',         sector:'Telecom'     },
  { symbol:'TATAELXSI',  name:'Tata Elxsi',                  sector:'IT'          },
  { symbol:'TATAINVEST', name:'Tata Investment Corp',        sector:'Diversified' },
  { symbol:'TCNSBRANDS', name:'TCNS Clothing',               sector:'Retail'      },
  { symbol:'TEAMLEASE',  name:'TeamLease Services',          sector:'Services'    },
  { symbol:'THERMAX',    name:'Thermax',                     sector:'Capital Goods'},
  { symbol:'TIINDIA',    name:'Tube Investments',            sector:'Auto'        },
  { symbol:'TIMKEN',     name:'Timken India',                sector:'Capital Goods'},
  { symbol:'TIMETECHNO', name:'Time Technoplast',            sector:'Chemicals'   },
  { symbol:'TORNTPOWER', name:'Torrent Power',               sector:'Utilities'   },
  { symbol:'TRITURBINE', name:'Triveni Turbine',             sector:'Capital Goods'},
  { symbol:'TTKPRESTIG', name:'TTK Prestige',                sector:'Consumer'    },
  { symbol:'TVSHLTD',    name:'TVS Holdings',                sector:'Auto'        },
  { symbol:'TVSMOTOR',   name:'TVS Motor Company',           sector:'Auto'        },
  { symbol:'UCOBANK',    name:'UCO Bank',                    sector:'Banking'     },
  { symbol:'UJJIVANSFB', name:'Ujjivan Small Finance Bank',  sector:'Banking'     },
  { symbol:'UNIONBANK',  name:'Union Bank of India',         sector:'Banking'     },
  { symbol:'UPL',        name:'UPL Limited',                 sector:'Chemicals'   },
  { symbol:'VAIBHAVGBL', name:'Vaibhav Global',              sector:'Retail'      },
  { symbol:'VBL',        name:'Varun Beverages',             sector:'FMCG'        },
  { symbol:'VINATIORGA', name:'Vinati Organics',             sector:'Chemicals'   },
  { symbol:'VIPIND',     name:'VIP Industries',              sector:'Consumer'    },
  { symbol:'VSTIND',     name:'VST Industries',              sector:'FMCG'        },
  { symbol:'WABCOINDIA', name:'Wabco India',                 sector:'Auto'        },
  { symbol:'WELCORP',    name:'Welspun Corp',                sector:'Metals'      },
  { symbol:'WELSPUNIND', name:'Welspun India',               sector:'Textiles'    },
  { symbol:'WESTLIFE',   name:'Westlife Foodworld',          sector:'Consumer'    },
  { symbol:'WONDERLA',   name:'Wonderla Holidays',           sector:'Hospitality' },
  { symbol:'WOCKPHARMA', name:'Wockhardt',                   sector:'Pharma'      },
  { symbol:'XPROINDIA',  name:'Xpro India',                  sector:'Chemicals'   },
  { symbol:'YESBANK',    name:'Yes Bank',                    sector:'Banking'     },
  { symbol:'ZENSARTECH', name:'Zensar Technologies',         sector:'IT'          },
  { symbol:'ZYDUSLIFE',  name:'Zydus Lifesciences',          sector:'Pharma'      },

  // Additional popular stocks
  { symbol:'ANGELONE',   name:'Angel One',                   sector:'Fintech'     },
  { symbol:'CDSL',       name:'CDSL',                        sector:'Fintech'     },
  { symbol:'CRISIL',     name:'CRISIL',                      sector:'Fintech'     },
  { symbol:'DELHIVERY',  name:'Delhivery',                   sector:'Logistics'   },
  { symbol:'EASEMYTRIP', name:'EaseMyTrip',                  sector:'Tech'        },
  { symbol:'FINPIPE',    name:'Finolex Industries',          sector:'Chemicals'   },
  { symbol:'FINCABLES',  name:'Finolex Cables',              sector:'Capital Goods'},
  { symbol:'FIRSTSOURCE',name:'FirstSource Solutions',       sector:'IT'          },
  { symbol:'GICRE',      name:'General Insurance Corp',      sector:'Insurance'   },
  { symbol:'GLAXO',      name:'GSK Pharmaceuticals',         sector:'Pharma'      },
  { symbol:'HAPPSTMNDS', name:'Happiest Minds',              sector:'IT'          },
  { symbol:'HLEGLAS',    name:'HLE Glascoat',                sector:'Capital Goods'},
  { symbol:'IIFLWAM',    name:'IIFL Wealth',                 sector:'Fintech'     },
  { symbol:'INDIGO',     name:'InterGlobe Aviation (IndiGo)',sector:'Aviation'    },
  { symbol:'INOXWIND',   name:'Inox Wind',                   sector:'Utilities'   },
  { symbol:'IPCALAB',    name:'IPCA Laboratories',           sector:'Pharma'      },
  { symbol:'JBCHEPHARM', name:'JB Chemicals',                sector:'Pharma'      },
  { symbol:'JYOTHYLAB',  name:'Jyothy Labs',                 sector:'FMCG'        },
  { symbol:'KANSAINER',  name:'Kansai Nerolac Paints',       sector:'Chemicals'   },
  { symbol:'KAYNES',     name:'Kaynes Technology',           sector:'Capital Goods'},
  { symbol:'KNRCON',     name:'KNR Constructions',           sector:'Infra'       },
  { symbol:'LXCHEM',     name:'Laxmi Organic',               sector:'Chemicals'   },
  { symbol:'MUTHOOTFIN', name:'Muthoot Finance',             sector:'NBFC'        },
  { symbol:'NATCOPHARM', name:'Natco Pharma',                sector:'Pharma'      },
  { symbol:'NAVNETEDUL', name:'Navneet Education',           sector:'Consumer'    },
  { symbol:'NUVAMA',     name:'Nuvama Wealth',               sector:'Fintech'     },
  { symbol:'OLABEV',     name:'Ola Electric',                sector:'Auto'        },
  { symbol:'POLICYBZR',  name:'PB Fintech (PolicyBazaar)',   sector:'Fintech'     },
  { symbol:'POONAWALLA', name:'Poonawalla Fincorp',          sector:'NBFC'        },
  { symbol:'PTCIL',      name:'PTC India',                   sector:'Utilities'   },
  { symbol:'RAILTEL',    name:'RailTel Corporation',         sector:'Telecom'     },
  { symbol:'RVNL',       name:'Rail Vikas Nigam',            sector:'Infra'       },
  { symbol:'ROUTE',      name:'Route Mobile',                sector:'Tech'        },
  { symbol:'SAPPHIRE',   name:'Sapphire Foods',              sector:'Consumer'    },
  { symbol:'SENCO',      name:'Senco Gold',                  sector:'Consumer'    },
  { symbol:'SIGNATURE',  name:'Signatureglobal',             sector:'RealEstate'  },
  { symbol:'SOLARINDS',  name:'Solar Industries',            sector:'Defence'     },
  { symbol:'SPANDANA',   name:'Spandana Sphoorty',           sector:'NBFC'        },
  { symbol:'SWANENERGY', name:'Swan Energy',                 sector:'Energy'      },
  { symbol:'SWSOLAR',    name:'Sterling and Wilson Solar',   sector:'Utilities'   },
  { symbol:'TITAGARH',   name:'Titagarh Rail Systems',       sector:'Capital Goods'},
  { symbol:'TPLASTIQ',   name:'Time Technoplast',            sector:'Chemicals'   },
  { symbol:'TRIDENT',    name:'Trident Limited',             sector:'Textiles'    },
  { symbol:'TRIVENI',    name:'Triveni Engineering',         sector:'FMCG'        },
  { symbol:'UNIPARTS',   name:'Uniparts India',              sector:'Auto'        },
  { symbol:'UTIAMC',     name:'UTI Asset Management',        sector:'Fintech'     },
  { symbol:'V2RETAIL',   name:'V2 Retail',                   sector:'Retail'      },
  { symbol:'VAKRANGEE',  name:'Vakrangee',                   sector:'Tech'        },
  { symbol:'VARROC',     name:'Varroc Engineering',          sector:'Auto'        },
  { symbol:'VGUARD',     name:'V-Guard Industries',          sector:'Consumer'    },
  { symbol:'VIKASECO',   name:'Vikas Ecotech',               sector:'Chemicals'   },
  { symbol:'VINDHYATEL', name:'Vindhya Telelinks',           sector:'Telecom'     },
  { symbol:'VMART',      name:'V-Mart Retail',               sector:'Retail'      },
  { symbol:'WABAG',      name:'VA Tech Wabag',               sector:'Utilities'   },
  { symbol:'WEBELSOLAR', name:'Websol Energy',               sector:'Utilities'   },
  { symbol:'WENDT',      name:'Wendt India',                 sector:'Capital Goods'},
  { symbol:'WINDLAS',    name:'Windlas Biotech',             sector:'Pharma'      },
  { symbol:'XCHANGING',  name:'Xchanging Solutions',         sector:'IT'          },
  { symbol:'ZENTEC',     name:'Zen Technologies',            sector:'Defence'     },

  // ── Additional real NSE-listed companies (verified tickers) ─────────────
  // Insurance & AMC
  { symbol:'NIACL',         name:'New India Assurance',             sector:'Insurance'   },
  { symbol:'HDFCAMC',       name:'HDFC Asset Management',           sector:'AMC'         },
  { symbol:'NAM-INDIA',     name:'Nippon Life India AMC',           sector:'AMC'         },
  // PSU / Small Finance Banks
  { symbol:'BANKBARODA',    name:'Bank of Baroda',                  sector:'Banking'     },
  { symbol:'MAHABANK',      name:'Bank of Maharashtra',             sector:'Banking'     },
  { symbol:'CENTRALBK',     name:'Central Bank of India',           sector:'Banking'     },
  { symbol:'IOB',           name:'Indian Overseas Bank',            sector:'Banking'     },
  { symbol:'CSBBANK',       name:'CSB Bank',                        sector:'Banking'     },
  { symbol:'DCBBANK',       name:'DCB Bank',                        sector:'Banking'     },
  { symbol:'SOUTHBANK',     name:'South Indian Bank',               sector:'Banking'     },
  { symbol:'KARURVYSYA',    name:'Karur Vysya Bank',                sector:'Banking'     },
  { symbol:'CUB',           name:'City Union Bank',                 sector:'Banking'     },
  // NBFC / Financial Services
  { symbol:'PFC',           name:'Power Finance Corporation',       sector:'NBFC'        },
  { symbol:'IRFC',          name:'Indian Railway Finance Corp',     sector:'NBFC'        },
  { symbol:'M&MFIN',        name:'M&M Financial Services',          sector:'NBFC'        },
  { symbol:'CREDITACC',     name:'CreditAccess Grameen',            sector:'NBFC'        },
  { symbol:'PEL',           name:'Piramal Enterprises',             sector:'NBFC'        },
  // Exchanges / Fintech
  { symbol:'CAMS',          name:'CAMS',                            sector:'Fintech'     },
  { symbol:'MCX',           name:'Multi Commodity Exchange',        sector:'Fintech'     },
  { symbol:'BSE',           name:'BSE Limited',                     sector:'Fintech'     },
  // New-age / Internet
  { symbol:'JUSTDIAL',      name:'Just Dial',                       sector:'Internet'    },
  { symbol:'MAPMYINDIA',    name:'C.E. Info Systems (MapmyIndia)',  sector:'Internet'    },
  { symbol:'NAZARA',        name:'Nazara Technologies',             sector:'Internet'    },
  { symbol:'LATENTVIEW',    name:'Latent View Analytics',           sector:'IT'          },
  { symbol:'MEDPLUS',       name:'MedPlus Health Services',         sector:'Retail'      },
  // Aviation / Travel / Hospitality
  { symbol:'LEMONTREE',     name:'Lemon Tree Hotels',                sector:'Hospitality' },
  { symbol:'CHALET',        name:'Chalet Hotels',                   sector:'Hospitality' },
  { symbol:'EIHOTEL',       name:'EIH Limited (Oberoi)',            sector:'Hospitality' },
  // Retail / Consumer Discretionary
  { symbol:'SHOPERSTOP',    name:'Shoppers Stop',                   sector:'Retail'      },
  { symbol:'METROBRAND',    name:'Metro Brands',                    sector:'Retail'      },
  { symbol:'CAMPUS',        name:'Campus Activewear',               sector:'Retail'      },
  { symbol:'UBL',           name:'United Breweries',                sector:'FMCG'        },
  { symbol:'RADICO',        name:'Radico Khaitan',                  sector:'FMCG'        },
  { symbol:'EMAMILTD',      name:'Emami Limited',                   sector:'FMCG'        },
  { symbol:'GILLETTE',      name:'Gillette India',                  sector:'FMCG'        },
  // Pharma / Healthcare
  { symbol:'METROPOLIS',    name:'Metropolis Healthcare',           sector:'Healthcare'  },
  { symbol:'MAXHEALTH',     name:'Max Healthcare Institute',        sector:'Healthcare'  },
  { symbol:'NARAYANHRUD',   name:'Narayana Hrudayalaya',            sector:'Healthcare'  },
  { symbol:'SYNGENE',       name:'Syngene International',           sector:'Pharma'      },
  { symbol:'SANOFI',        name:'Sanofi India',                    sector:'Pharma'      },
  { symbol:'GLAND',         name:'Gland Pharma',                    sector:'Pharma'      },
  // Auto & Ancillaries
  { symbol:'ASHOKLEY',      name:'Ashok Leyland',                   sector:'Auto'        },
  { symbol:'APOLLOTYRE',    name:'Apollo Tyres',                    sector:'Auto'        },
  { symbol:'CEATLTD',       name:'CEAT Limited',                    sector:'Auto'        },
  { symbol:'AMARAJABAT',    name:'Amara Raja Energy & Mobility',    sector:'Auto'        },
  { symbol:'ENDURANCE',     name:'Endurance Technologies',          sector:'Auto'        },
  { symbol:'MINDAIND',      name:'Uno Minda',                       sector:'Auto'        },
  // Cement / Building Materials
  { symbol:'HEIDELBERG',    name:'HeidelbergCement India',          sector:'Cement'      },
  { symbol:'CENTURYPLY',    name:'Century Plyboards',               sector:'Building'    },
  { symbol:'GREENPANEL',    name:'Greenpanel Industries',           sector:'Building'    },
  { symbol:'BLUESTARCO',    name:'Blue Star Limited',               sector:'Consumer'    },
  // Real Estate
  { symbol:'BRIGADE',       name:'Brigade Enterprises',             sector:'Real Estate' },
  { symbol:'LODHA',         name:'Macrotech Developers (Lodha)',    sector:'Real Estate' },
  // Metals / Mining / Energy
  { symbol:'HINDCOPPER',    name:'Hindustan Copper',                sector:'Metals'      },
  { symbol:'ADANIPOWER',    name:'Adani Power',                     sector:'Power'       },
  { symbol:'ADANIENSOL',    name:'Adani Energy Solutions',          sector:'Power'       },
  { symbol:'JSWENERGY',     name:'JSW Energy',                      sector:'Power'       },
  { symbol:'SJVN',          name:'SJVN Limited',                    sector:'Power'       },
  { symbol:'PGCIL',         name:'Power Grid Corporation',          sector:'Power'       },
  // Chemicals / Specialty
  { symbol:'CLEAN',         name:'Clean Science and Technology',    sector:'Chemicals'   },
  { symbol:'GALAXYSURF',    name:'Galaxy Surfactants',              sector:'Chemicals'   },
  { symbol:'COROMANDEL',    name:'Coromandel International',        sector:'Agrichem'    },
  // Telecom / Media
  { symbol:'IDEA',          name:'Vodafone Idea',                   sector:'Telecom'     },
  { symbol:'PVRINOX',       name:'PVR INOX',                        sector:'Media'       },
  { symbol:'NETWORK18',     name:'Network18 Media & Investments',   sector:'Media'       },
  { symbol:'SAREGAMA',      name:'Saregama India',                  sector:'Media'       },
  // Defence / PSU / Infra
  { symbol:'BDL',           name:'Bharat Dynamics',                 sector:'Defence'     },
  { symbol:'MAZDOCK',       name:'Mazagon Dock Shipbuilders',       sector:'Defence'     },
  { symbol:'COCHINSHIP',    name:'Cochin Shipyard',                 sector:'Defence'     },
  { symbol:'IRCON',         name:'IRCON International',             sector:'Infra'       },
  { symbol:'NBCC',          name:'NBCC (India)',                    sector:'Infra'       },
  { symbol:'GRINFRA',       name:'G R Infraprojects',               sector:'Infra'       },
  { symbol:'PNCINFRA',      name:'PNC Infratech',                   sector:'Infra'       },
  // Textiles / Paper / Others
  { symbol:'WELSPUNLIV',    name:'Welspun Living',                  sector:'Textiles'    },
  { symbol:'RAYMOND',       name:'Raymond Limited',                 sector:'Textiles'    },
  { symbol:'BALRAMCHIN',    name:'Balrampur Chini Mills',           sector:'Sugar'       },
  { symbol:'EIDPARRY',      name:'EID Parry (India)',               sector:'Sugar'       },
  { symbol:'RENUKA',        name:'Shree Renuka Sugars',             sector:'Sugar'       },
  { symbol:'CONCOR',        name:'Container Corporation of India',  sector:'Logistics'   },
  { symbol:'BLUEDART',      name:'Blue Dart Express',               sector:'Logistics'   },
  { symbol:'TCI',           name:'Transport Corporation of India',  sector:'Logistics'   },
  { symbol:'GATEWAY',       name:'Gateway Distriparks',              sector:'Logistics'   },
];

// De-duplicate by symbol
const STOCKS = ALL_STOCKS.filter((s, i, a) => a.findIndex(x => x.symbol === s.symbol) === i);

// ── Fetch live price ──────────────────────────────────────────────────────
async function getLivePrice(symbol) {
  const normalized = String(symbol || '').trim().toUpperCase();
  const key = `price_${normalized}`;
  const cached = cache.get(key);
  if (cached) return cached;

  // Prefer NSE, then try BSE. Some securities and newly changed symbols
  // are not available under the first exchange suffix.
  const candidates = normalized.includes('.')
    ? [normalized]
    : [`${normalized}.NS`, `${normalized}.BO`];

  for (const sym of candidates) {
    try {
      const res = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'application/json' }, timeout: 7000 }
      );
      const result = res.data?.chart?.result?.[0];
      const meta = result?.meta;
      const closes = result?.indicators?.quote?.[0]?.close || [];
      const lastClose = [...closes].reverse().find(v => Number.isFinite(v) && v > 0);
      const price = Number(meta?.regularMarketPrice || lastClose || 0);
      const prev = Number(meta?.chartPreviousClose || meta?.previousClose || price);
      if (price > 0) {
        const change = prev > 0 ? +(price - prev).toFixed(2) : 0;
        const data = {
          price: +price.toFixed(2),
          change,
          changePct: prev > 0 ? +((change / prev) * 100).toFixed(2) : 0,
          name: meta?.longName || meta?.shortName || normalized,
          exchangeSymbol: sym,
          priceAvailable: true,
        };
        cache.set(key, data, 120);
        return data;
      }
    } catch { /* Try the next exchange symbol. */ }
  }

  // Keep a consistent result shape; callers can show an unavailable state
  // instead of throwing or silently interpreting a missing quote as zero.
  return { price: null, name: normalized, change: 0, changePct: 0, priceAvailable: false };
}

// ── Recalculate avgPrice from transactions ────────────────────────────────
function recalcFromTxns(transactions) {
  const map = {};
  const sorted = [...transactions].sort((a,b) =>
    new Date(a.date||a.createdAt||0) - new Date(b.date||b.createdAt||0)
  );
  sorted.forEach(tx => {
    const sym    = (tx.symbol||'').toUpperCase().replace('.NS','').replace('.BSE','');
    const action = (tx.action||tx.type||'').toLowerCase();
    const qty    = Number(tx.quantity   || 0);
    const price  = Number(tx.price      || 0);
    if (!sym || !qty || !price) return;
    if (!map[sym]) map[sym] = { quantity:0, totalCost:0, name:tx.name||sym, sector:tx.sector||'' };
    if (action === 'buy') {
      map[sym].quantity  += qty;
      map[sym].totalCost += price * qty;
    } else if (action === 'sell') {
      const sellQty = Math.min(qty, map[sym].quantity);
      if (map[sym].quantity > 0) {
        const avgCost = map[sym].totalCost / map[sym].quantity;
        map[sym].totalCost -= avgCost * sellQty;
      }
      map[sym].quantity = Math.max(0, map[sym].quantity - sellQty);
      if (map[sym].quantity === 0) map[sym].totalCost = 0;
    }
  });
  return Object.entries(map)
    .filter(([_,v]) => v.quantity > 0)
    .map(([symbol, v]) => ({
      symbol,
      name:     v.name,
      sector:   v.sector,
      quantity: v.quantity,
      avgPrice: v.quantity > 0 ? +(v.totalCost / v.quantity).toFixed(2) : 0,
    }));
}

// ── GET /api/stocks ───────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { sector, search, limit = 60 } = req.query;
    let list = [...STOCKS];
    if (sector && sector !== 'All') list = list.filter(s => s.sector === sector);
    if (search) {
      const q = search.toLowerCase();
      list    = list.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    list = list.slice(0, Number(limit));

    const results = await Promise.allSettled(
      list.map(async s => {
        const live = await getLivePrice(s.symbol);
        return {
          ...s,
          price: live?.price ?? null,
          priceAvailable: Number(live?.price) > 0,
          change: live?.change ?? 0,
          changePct: live?.changePct ?? 0,
        };
      })
    );
    const stocks = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/stocks/list ──────────────────────────────────────────────────
router.get('/list', auth, (req, res) => {
  res.json(STOCKS);
});

// ── GET /api/stocks/sectors ───────────────────────────────────────────────
router.get('/sectors', auth, (req, res) => {
  const sectors = [...new Set(STOCKS.map(s => s.sector))].sort();
  res.json(['All', ...sectors]);
});

// ── GET /api/stocks/:symbol ───────────────────────────────────────────────
router.get('/:symbol', auth, async (req, res) => {
  try {
    const sym  = req.params.symbol.toUpperCase().replace('.NS','').replace('.BSE','');
    const info = STOCKS.find(s => s.symbol === sym) || { symbol:sym, name:sym, sector:'' };
    const live = await getLivePrice(sym);
    if (!live.price) return res.status(404).json({ message:`No price data for ${sym}` });
    res.json({
      ...info,
      price:     live.price,
      change:    live.change,
      changePct: live.changePct,
      name:      live.name || info.name,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/stocks/trade ────────────────────────────────────────────────
router.post('/trade', auth, async (req, res) => {
  try {
    const { symbol, action, quantity, price: clientPrice, orderType } = req.body;

    if (!symbol)
      return res.status(400).json({ message:'Symbol is required' });
    if (!action || !['buy','sell'].includes(action.toLowerCase()))
      return res.status(400).json({ message:'Action must be buy or sell' });

    const qty = parseInt(quantity);
    if (!qty || qty <= 0)
      return res.status(400).json({ message:'Quantity must be a positive integer' });

    const sym = symbol.toUpperCase().replace('.NS','').replace('.BSE','');

    // Get live price — must be real, fallback to client price
    const live       = await getLivePrice(sym);
    const tradePrice = live.price || Number(clientPrice) || 0;
    if (!tradePrice || tradePrice <= 0)
      return res.status(400).json({ message:`Could not get valid price for ${sym}` });

    const totalCost = +(tradePrice * qty).toFixed(2);

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message:'User not found' });

    let balance = Number(user.virtualCoins || 0);

    // Always recalc portfolio from transactions for accuracy
    let txns     = (user.transactions || []).map(t => ({ ...t.toObject ? t.toObject() : t }));
    let holdings = recalcFromTxns(txns);

    // ── BUY ───────────────────────────────────────────────────────────────
    if (action.toLowerCase() === 'buy') {
      if (balance < totalCost)
        return res.status(400).json({
          message:`Insufficient balance. Need ₹${totalCost.toLocaleString('en-IN')}, have ₹${balance.toLocaleString('en-IN')}`
        });
      balance = +(balance - totalCost).toFixed(2);
    }

    // ── SELL ──────────────────────────────────────────────────────────────
    if (action.toLowerCase() === 'sell') {
      const holding = holdings.find(h => h.symbol === sym);
      if (!holding || holding.quantity <= 0)
        return res.status(400).json({ message:`You don't own any ${sym} shares` });
      if (holding.quantity < qty)
        return res.status(400).json({ message:`Only ${holding.quantity} shares available, can't sell ${qty}` });
      balance = +(balance + totalCost).toFixed(2);
    }

    // ── Append transaction ────────────────────────────────────────────────
    const newTxn = {
      symbol:      sym,
      name:        live.name || STOCKS.find(s => s.symbol === sym)?.name || sym,
      action:      action.toLowerCase(),
      type:        action.toLowerCase(),
      orderType:   orderType === 'intraday' ? 'intraday' : 'delivery', // tags for portfolio/tax views
      quantity:    qty,
      price:       +tradePrice.toFixed(2),    // real price — this is the key fix
      totalAmount: totalCost,
      total:       totalCost,
      date:        new Date(),
      createdAt:   new Date(),
    };
    txns.push(newTxn);

    // Recalc holdings from updated txns
    const newHoldings = recalcFromTxns(txns);

    // ── Save via updateOne (bypasses Mongoose casting issues) ─────────────
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          virtualCoins: balance,
          portfolio:    newHoldings,
          transactions: txns,
        }
      }
    );

    res.json({
      success:      true,
      action:       action.toLowerCase(),
      symbol:       sym,
      name:         live.name || sym,
      quantity:     qty,
      price:        +tradePrice.toFixed(2),
      totalAmount:  totalCost,
      newBalance:   balance,
      virtualCoins: balance,
      message:      `${action.toLowerCase()==='buy'?'📈 Bought':'📉 Sold'} ${qty} × ${sym} @ ₹${tradePrice.toFixed(2)}`,
    });

  } catch (err) {
    console.error('TRADE ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
module.exports.getLivePrice = getLivePrice;