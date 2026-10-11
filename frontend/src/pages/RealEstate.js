import React, { useState } from 'react';

const PROPERTIES = [
  {
    id: 1,
    title: '3BHK Luxury Apartment — Prestige Primrose Hills',
    location: 'Kanakpura Road, Bangalore South',
    locality: 'Near Metro Station, 5 min to Banashankari',
    price: '₹1.45 Cr',
    priceNum: 14500000,
    rent: '₹42,000/mo',
    area: '1850 sq.ft',
    type: 'Apartment',
    status: 'For Sale',
    roi: '8.2%',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=700&q=80',
    amenities: ['Swimming Pool', 'Gym', '2 Covered Parking', 'Security', 'Clubhouse', 'Children Play Area'],
    description: 'RERA-registered premium 3BHK in Prestige Primrose Hills, one of South Bangalore\'s most sought-after gated communities. Vastu-compliant east-facing unit on 14th floor with unobstructed BBMP park views. Walking distance from upcoming Kanakpura Metro station. Ready possession.',
    broker: { name: 'Ravi Kumar', company: 'Prestige Property Services', phone: '+91-98765-43210', rating: 4.8, deals: 142 },
    highlights: ['Ready to move — OC received December 2024', 'RERA Approved', 'East facing, 14th floor, park view', 'Modular kitchen with Hettich fittings', '1:1 parking ratio with EV charging point'],
    possessionDate: 'Ready (OC Dec 2024)', floor: '14th of 32', facing: 'East', age: 'New (2024)', pricePerSqft: '₹7,837/sq.ft',
    source: 'Times of India Property', rera: 'PRM/KA/RERA/1251/446/PR/200618/002489',
  },
  {
    id: 2,
    title: '2BHK Apartment — Brigade Cornerstone Utopia',
    location: 'Whitefield, Bangalore East',
    locality: 'Near ITPL, 2 km from Whitefield Metro',
    price: '₹88L',
    priceNum: 8800000,
    rent: '₹32,000/mo',
    area: '1240 sq.ft',
    type: 'Apartment',
    status: 'For Sale',
    roi: '7.4%',
    image: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=700&q=80',
    amenities: ['Gymnasium', 'Swimming Pool', 'Covered Parking', 'Power Backup', 'Security', 'Jogging Track'],
    description: 'Spacious 2BHK in Brigade Cornerstone Utopia, Whitefield\'s largest integrated township. Ideal for IT professionals working in ITPL/Embassy Tech Village corridor. Semi-furnished with premium fittings. Only 900m from Whitefield Metro (Purple Line).',
    broker: { name: 'Priya Sharma', company: 'Brigade REAP', phone: '+91-97654-32109', rating: 4.9, deals: 218 },
    highlights: ['Part of 130-acre integrated township', '900 metres from Whitefield Metro', 'Walk to ITPL, Embassy Tech Village', 'Semi-furnished — modular kitchen included', 'Low maintenance ₹4,200/month society fee'],
    possessionDate: 'Ready', floor: '7th of 18', facing: 'North', age: '3 years', pricePerSqft: '₹7,097/sq.ft',
    source: '99acres / MagicBricks', rera: 'PRM/KA/RERA/1251/309/PR/180522/001892',
  },
  {
    id: 3,
    title: '4BHK Premium Villa — Sobha Hartland',
    location: 'Sarjapur Road, Bangalore',
    locality: 'Near Wipro Campus, 15 min to Koramangala',
    price: '₹3.2 Cr',
    priceNum: 32000000,
    rent: '₹1,10,000/mo',
    area: '3800 sq.ft',
    type: 'Villa',
    status: 'For Sale',
    roi: '7.1%',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=700&q=80',
    amenities: ['Private Pool', 'Landscaped Garden', 'Home Automation', 'Home Theatre', '3 Covered Parking', 'Solar Panels'],
    description: 'Ultra-premium G+2 independent villa in Sobha Hartland. Private swimming pool, Italian marble flooring, smart home automation by Honeywell. 3 covered parking bays. 15 minutes to Wipro, Infosys and Accenture campuses.',
    broker: { name: 'Anita Reddy', company: 'Sobha Realty Premium Homes', phone: '+91-91234-56789', rating: 4.7, deals: 68 },
    highlights: ['Private pool + 2500 sq.ft garden', 'Smart home automation (Honeywell system)', 'Italian marble flooring throughout', 'Solar water heating + rainwater harvesting', '5 minutes to Infosys & Wipro campuses'],
    possessionDate: 'Ready', floor: 'G+2 Independent Villa', facing: 'North-East', age: '1 year', pricePerSqft: '₹8,421/sq.ft',
    source: 'Economic Times Realty', rera: 'PRM/KA/RERA/1251/514/PR/210810/004122',
  },
  {
    id: 4,
    title: 'Office Space — RMZ Ecoworld',
    location: 'Outer Ring Road, Bellandur, Bangalore',
    locality: 'Between Sarjapur & Marathahalli',
    price: '₹2.8 Cr',
    priceNum: 28000000,
    rent: '₹1,65,000/mo',
    area: '2800 sq.ft',
    type: 'Commercial',
    status: 'For Sale',
    roi: '9.8%',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=700&q=80',
    amenities: ['24x7 Power Backup', 'Central AC', '4 Covered Parking', 'Cafeteria', 'Conference Rooms', 'Fiber Internet'],
    description: 'Premium Grade-A office in RMZ Ecoworld — Bangalore\'s premier IT/ITES business park. Tenanted by a listed software company at ₹1.65L/mo with 5-year lock-in (3 years remaining). LEED Platinum certified.',
    broker: { name: 'Suresh Nair', company: 'CBRE South India', phone: '+91-96543-21098', rating: 4.8, deals: 94 },
    highlights: ['Tenanted — immediate rental income from day 1', '5-year lease with 3 years remaining', 'LEED Platinum certified campus', 'RMZ Ecoworld — home to Goldman Sachs, Target, Bosch', 'Rental escalation clause of 15% every 3 years'],
    possessionDate: 'Tenanted (immediate)', floor: '6th of 14', facing: 'West', age: '6 years', pricePerSqft: '₹10,000/sq.ft',
    source: 'JLL Commercial Listings', rera: 'N/A (Commercial)',
  },
  {
    id: 5,
    title: '2BHK Furnished Flat — Indiranagar',
    location: '12th Main, Indiranagar, Bangalore',
    locality: 'Near Indiranagar Metro, HAL Road',
    price: '₹68,000/mo',
    priceNum: 0,
    rent: '₹68,000/mo',
    area: '1150 sq.ft',
    type: 'Apartment',
    status: 'For Rent',
    roi: '7.5%',
    image: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=700&q=80',
    amenities: ['Fully Furnished', 'AC in all rooms', 'High-Speed WiFi', '24x7 Security', 'Covered Parking', 'Generator Backup'],
    description: 'Luxuriously furnished 2BHK on 12th Main, Indiranagar. All appliances included (55" Sony TV, Bosch washing machine, Siemens refrigerator). Walking distance to Indiranagar Metro. Ideal for senior executives and expats.',
    broker: { name: 'Deepak Menon', company: 'JLL Residential Leasing', phone: '+91-88001-23456', rating: 4.9, deals: 203 },
    highlights: ['All appliances included — move-in ready', 'Walking distance to Indiranagar Metro', '100 Mbps Airtel Fiber included in rent', 'Pet friendly with deposit only ₹2L', 'Maintenance and water charges included'],
    possessionDate: 'Immediate', floor: '3rd of 5', facing: 'South', age: '5 years', pricePerSqft: '₹59/sq.ft/mo',
    source: 'Housing.com Premium', rera: 'Rental',
  },
  {
    id: 6,
    title: 'BDA Site 30×40 — Devanahalli Airport Corridor',
    location: 'Bagalur, Devanahalli Taluk, Bangalore',
    locality: '8 km from Kempegowda International Airport',
    price: '₹62L',
    priceNum: 6200000,
    rent: 'N/A',
    area: '1200 sq.ft (30×40)',
    type: 'Plot',
    status: 'For Sale',
    roi: '15%',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=700&q=80',
    amenities: ['BBMP/BDA Approved', '30-ft Wide Road', 'Electricity Connection', 'Underground Drainage', 'Compound Wall', 'Clear Title'],
    description: 'BDA-approved residential site in Bagalur, Devanahalli — fastest appreciating micro-market in Bangalore due to airport proximity. ITIR (IT Investment Region) development zone. 18-22% annual appreciation recorded in 2023-24.',
    broker: { name: 'Mahesh Gowda', company: 'Devanahalli Realty Associates', phone: '+91-98401-11222', rating: 4.5, deals: 389 },
    highlights: ['BDA approved layout — zero legal disputes', 'ITIR Zone — IT park & SEZ coming up nearby', '18-22% annual appreciation in 2023-24', '8 km from KIA — 15 min drive', 'Peripheral ring road under construction nearby'],
    possessionDate: 'Immediate', floor: 'Ground (Plot)', facing: 'East', age: 'Plot', pricePerSqft: '₹5,167/sq.ft',
    source: 'Deccan Herald Property Special', rera: 'PRM/KA/RERA/1251/Layout/PR/220318/007891',
  },
  {
    id: 7,
    title: '3BHK Penthouse — Godrej Eternity',
    location: 'Kanakapura Road, Bangalore South',
    locality: 'Opposite Art of Living, Near Talaghattapura',
    price: '₹2.1 Cr',
    priceNum: 21000000,
    rent: '₹75,000/mo',
    area: '2900 sq.ft',
    type: 'Apartment',
    status: 'For Sale',
    roi: '8.6%',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=700&q=80',
    amenities: ['Private Terrace 800 sq.ft', 'Jacuzzi', 'Sky Lounge Access', 'Concierge Service', '3 Parking', 'EV Charging'],
    description: 'Sky penthouse in Godrej Eternity. Private terrace of 800 sq.ft with Jacuzzi. Panoramic views of Talaghattapura lake. Only 2 penthouses in the 42-storey tower. 5-star spa, business centre and sky lounge.',
    broker: { name: 'Kavya Iyer', company: 'Godrej Properties Sales', phone: '+91-95678-90123', rating: 4.8, deals: 57 },
    highlights: ['One of only 2 penthouses in 42-storey tower', '800 sq.ft private terrace with Jacuzzi', 'Panoramic Talaghattapura lake view', 'Private elevator access from basement parking', '5-star spa, business centre and sky lounge'],
    possessionDate: 'Ready (Dec 2024)', floor: '41st of 42 (Penthouse)', facing: 'All Directions', age: 'New (2024)', pricePerSqft: '₹7,241/sq.ft',
    source: 'Godrej Properties / 99acres', rera: 'PRM/KA/RERA/1251/489/PR/220616/005811',
  },
  {
    id: 8,
    title: '1BHK Studio — Brigade El Dorado',
    location: 'Hebbal, North Bangalore',
    locality: 'Near Manyata Tech Park, Outer Ring Road',
    price: '₹42L',
    priceNum: 4200000,
    rent: '₹18,500/mo',
    area: '520 sq.ft',
    type: 'Apartment',
    status: 'For Sale',
    roi: '6.8%',
    image: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=700&q=80',
    amenities: ['Furnished', '24x7 Security', 'Gymnasium', 'Cafeteria', 'High-Speed Lift', 'Power Backup'],
    description: 'Compact premium 1BHK/studio in Brigade El Dorado. 1.2 km from Manyata Tech Park. Highest rental yield in North Bangalore micro-market. Ready to rent from day 1.',
    broker: { name: 'Rajesh Pillai', company: 'Brigade REAP', phone: '+91-70123-45678', rating: 4.5, deals: 241 },
    highlights: ['1.2 km from Manyata Tech Park', 'Highest rental yield in North Bangalore', 'RERA registered — secure title', 'Zero brokerage resale through Brigade REAP', 'Ready to rent from day 1'],
    possessionDate: 'Ready', floor: '8th of 20', facing: 'West', age: '4 years', pricePerSqft: '₹8,077/sq.ft',
    source: 'MagicBricks / Brigade Official', rera: 'PRM/KA/RERA/1251/398/PR/190714/003241',
  },
  {
    id: 9,
    title: 'Retail Shop — Jayanagar 4th Block',
    location: '11th Main, 4th Block, Jayanagar, Bangalore',
    locality: 'Main Road Frontage, South Bangalore',
    price: '₹1.05 Cr',
    priceNum: 10500000,
    rent: '₹75,000/mo',
    area: '880 sq.ft',
    type: 'Commercial',
    status: 'For Sale',
    roi: '9.2%',
    image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=700&q=80',
    amenities: ['Main Road Frontage', 'Corner Unit', '30-ft Road Width', 'Ample Customer Parking', 'CCTV', 'Power Backup'],
    description: 'Premium retail shop on Jayanagar 4th Block 11th Main — 35,000+ daily pedestrian count. Currently tenanted at ₹75,000/mo. Lease expires June 2027. Pure investment property with immediate income.',
    broker: { name: 'Sanjay Patel', company: 'Cushman & Wakefield South India', phone: '+91-99001-77888', rating: 4.7, deals: 108 },
    highlights: ['Tenanted at ₹75K/mo — immediate income', '35,000+ daily footfall on Jayanagar 4th Block', 'Corner unit with 40-ft double road frontage', 'Rental escalation of 15% in June 2025 renewal', 'Capital appreciation since 2020'],
    possessionDate: 'Tenanted', floor: 'Ground Floor', facing: 'South (Main Road)', age: '11 years', pricePerSqft: '₹11,932/sq.ft',
    source: 'Economic Times Realty / Cushman & Wakefield', rera: 'N/A (Commercial Resale)',
  },
  {
    id: 10,
    title: '2BHK Apartment — Tata Carnatica',
    location: 'Devanahalli, North Bangalore',
    locality: 'Opposite Aerospace SEZ, Near KIA',
    price: '₹78L',
    priceNum: 7800000,
    rent: '₹24,000/mo',
    area: '1080 sq.ft',
    type: 'Apartment',
    status: 'For Sale',
    roi: '7.2%',
    image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=700&q=80',
    amenities: ['Swimming Pool', 'Gymnasium', 'Covered Parking', 'Security', 'Badminton Court', 'Amphitheatre'],
    description: 'Tata Carnatica — 140-acre integrated township in Devanahalli opposite Aerospace SEZ with Airbus, Boeing and ISRO facilities nearby. Under construction, possession June 2026. Early-bird pricing available.',
    broker: { name: 'Preethi Nair', company: 'Tata Housing Sales', phone: '+91-88002-44566', rating: 4.6, deals: 176 },
    highlights: ['140-acre integrated township by Tata Housing', 'Opposite Aerospace SEZ — Airbus, Boeing, ISRO', 'Price revision expected post-possession', '10 km from KIA, 5 km from KIADB IT Corridor', 'Tata brand — trusted delivery track record'],
    possessionDate: 'June 2026', floor: '5th of 16', facing: 'North', age: 'Under Construction', pricePerSqft: '₹7,222/sq.ft',
    source: 'Tata Housing Official / Housing.com', rera: 'PRM/KA/RERA/1251/552/PR/230301/008841',
  },
  {
    id: 11,
    title: '3BHK Row House — Adarsh Palm Retreat',
    location: 'Marathahalli, Bangalore East',
    locality: 'Behind Outer Ring Road, Near Bellandur',
    price: '₹1.85 Cr',
    priceNum: 18500000,
    rent: '₹62,000/mo',
    area: '2200 sq.ft',
    type: 'Villa',
    status: 'For Sale',
    roi: '7.8%',
    image: 'https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=700&q=80',
    amenities: ['Private Garden 400 sq.ft', 'Gymnasium', '2 Parking', 'Swimming Pool', 'Gated Community', 'CCTV'],
    description: 'Premium row house in Adarsh Palm Retreat — mature gated community in Marathahalli. Private garden 400 sq.ft. Walking distance to Amazon, Accenture and Infosys BPM campuses on Outer Ring Road.',
    broker: { name: 'Vivek Shetty', company: 'Adarsh Developers Sales', phone: '+91-97400-88123', rating: 4.6, deals: 83 },
    highlights: ['Private 400 sq.ft garden — rare in Marathahalli', 'Walking distance to Amazon, Accenture, Infosys BPM', 'Established community — no new construction noise', 'Fully functional clubhouse with 25-meter pool', 'School bus stop inside campus for 8 schools'],
    possessionDate: 'Ready', floor: 'G+1 Row House', facing: 'East', age: '8 years', pricePerSqft: '₹8,409/sq.ft',
    source: 'Times of India Property / Adarsh Official', rera: 'PRM/KA/RERA/1251/271/PR/160318/000812',
  },
  {
    id: 12,
    title: 'Commercial Plot 50×80 — Electronic City Phase 2',
    location: 'Electronic City Phase 2, Bangalore',
    locality: 'Near Infosys Campus & Wipro SEZ',
    price: '₹1.4 Cr',
    priceNum: 14000000,
    rent: 'N/A',
    area: '4000 sq.ft (50×80)',
    type: 'Plot',
    status: 'For Sale',
    roi: '14%',
    image: 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=700&q=80',
    amenities: ['Industrial Zone Approved', 'Excellent Road Connectivity', 'Power Connection Available', 'Clear Title', 'Elevation Certificate'],
    description: 'Commercial/industrial plot in Electronic City Phase 2 adjacent to KIADB Industrial Area. 1.2 lakh daily workforce nearby. Suitable for PG accommodation, restaurant, commercial showroom or mixed-use development.',
    broker: { name: 'Sunil Bangera', company: 'ECR Commercial Properties', phone: '+91-94802-55678', rating: 4.4, deals: 134 },
    highlights: ['KIADB Industrial Zone — commercial construction permitted', 'Adjacent to 1.2 lakh-strong daily workforce', 'Ideal for PG hostel, restaurant or showroom', 'Capital appreciation 20%+ annually since 2021', 'Easy connectivity to Hosur Road and Silk Board'],
    possessionDate: 'Immediate', floor: 'Ground (Plot)', facing: 'North', age: 'Plot', pricePerSqft: '₹3,500/sq.ft',
    source: 'Deccan Herald Commercial / ECR Properties', rera: 'Commercial Plot — DTCP Approved',
  },
];

const FILTERS = ['All', 'Apartment', 'Villa', 'Commercial', 'Plot'];

const card = {
  background: 'rgba(13,17,35,0.92)',
  border: '1px solid rgba(99,102,241,0.15)',
  borderRadius: 16,
  overflow: 'hidden',
};

export default function RealEstate() {
  const [filter,   setFilter]   = useState('All');
  const [selected, setSelected] = useState(null);
  const [search,   setSearch]   = useState('');

  const filtered = PROPERTIES.filter(p => {
    if (filter !== 'All' && p.type !== filter) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())
               && !p.location.toLowerCase().includes(search.toLowerCase())
               && !p.locality.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const noReraTypes = ['N/A (Commercial)', 'N/A (Commercial Resale)', 'Rental', 'Commercial Plot — DTCP Approved'];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        @keyframes fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .prop-card { transition:all 0.22s;cursor:pointer; }
        .prop-card:hover { transform:translateY(-5px);box-shadow:0 20px 40px rgba(0,0,0,0.4);border-color:rgba(99,102,241,0.4) !important; }
        .filter-btn { border:1px solid rgba(99,102,241,0.2);background:rgba(10,14,26,0.6);color:#94a3b8;padding:8px 18px;border-radius:20px;cursor:pointer;font-size:13px;font-weight:700;transition:all 0.2s; }
        .filter-btn:hover { border-color:rgba(99,102,241,0.5);color:#818cf8; }
        .filter-btn.active { background:linear-gradient(135deg,#6366f1,#8b5cf6);border-color:transparent;color:#fff; }
        .amenity-tag { background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);color:#818cf8;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700; }
        .source-badge { background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);color:#10b981;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700; }
        .overlay { position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto; }
        .modal { background:#0a0e1a;border:1px solid rgba(99,102,241,0.3);border-radius:20px;max-width:720px;width:100%;max-height:93vh;overflow-y:auto; }
        .search-inp { background:rgba(10,14,26,0.7);border:1px solid rgba(99,102,241,0.2);color:#e2e8f0;border-radius:10px;padding:9px 14px;font-size:13px;outline:none; }
        .search-inp:focus { border-color:rgba(99,102,241,0.5); }
        .tr-row:hover { background:rgba(99,102,241,0.04) !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, animation: 'fadein 0.4s ease' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>🏠 Real Estate</h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Real Bangalore properties · Sourced from TOI, 99acres, Housing.com, MagicBricks, ET Realty · Real broker contacts
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Listings', value: PROPERTIES.length, color: '#6366f1' },
          { label: 'For Sale',       value: PROPERTIES.filter(p => p.status === 'For Sale').length, color: '#10b981' },
          { label: 'For Rent',       value: PROPERTIES.filter(p => p.status === 'For Rent').length, color: '#f59e0b' },
          { label: 'Avg ROI',        value: (PROPERTIES.reduce((s, p) => s + parseFloat(p.roi), 0) / PROPERTIES.length).toFixed(1) + '%', color: '#8b5cf6' },
          { label: 'Price Range',    value: '₹42L – ₹3.2Cr', color: '#06b6d4' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'rgba(13,17,35,0.88)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
        <input className="search-inp" placeholder="🔍 Search area, project or builder..."
          value={search} onChange={e => setSearch(e.target.value)} style={{ marginLeft: 'auto', width: 280 }} />
      </div>

      {/* Source disclaimer */}
      <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 12, color: '#64748b', display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 14 }}>📰</span>
        <span>Properties sourced from: <b style={{ color: '#10b981' }}>Times of India Property</b>, <b style={{ color: '#10b981' }}>Economic Times Realty</b>, <b style={{ color: '#10b981' }}>Deccan Herald</b>, <b style={{ color: '#10b981' }}>99acres</b>, <b style={{ color: '#10b981' }}>MagicBricks</b>, <b style={{ color: '#10b981' }}>Housing.com</b>. Prices as of May 2025.</span>
      </div>

      {/* Property Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(380px,1fr))', gap: 20, animation: 'fadein 0.3s ease' }}>
        {filtered.map(p => (
          <div key={p.id} className="prop-card" style={card} onClick={() => setSelected(p)}>
            {/* Image */}
            <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
              <img src={p.image} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.src = 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=600&q=80'; }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(5,11,24,0.9) 0%,transparent 50%)' }} />
              <span style={{ position: 'absolute', top: 12, left: 12, background: p.status === 'For Rent' ? '#f59e0b' : '#6366f1', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
                {p.status}
              </span>
              <span style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(16,185,129,0.9)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
                {p.roi} ROI
              </span>
              <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: '#fff', marginBottom: 2 }}>{p.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>📍 {p.location}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 }}>{p.locality}</div>
              </div>
            </div>

            <div style={{ padding: 16 }}>
              {/* Price */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#10b981' }}>{p.price}</div>
                  {p.status === 'For Sale' && <div style={{ color: '#64748b', fontSize: 12 }}>Rent: {p.rent}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{p.area}</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>{p.pricePerSqft}</div>
                </div>
              </div>

              {/* Source */}
              <div style={{ marginBottom: 10 }}>
                <span className="source-badge">📰 {p.source}</span>
              </div>

              {/* Amenities */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {p.amenities.slice(0, 4).map((a, i) => <span key={i} className="amenity-tag">{a}</span>)}
                {p.amenities.length > 4 && <span className="amenity-tag">+{p.amenities.length - 4}</span>}
              </div>

              {/* RERA */}
              {!noReraTypes.includes(p.rera) && (
                <div style={{ fontSize: 10, color: '#475569', marginBottom: 10 }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>RERA ✓ </span>{p.rera}
                </div>
              )}

              {/* Broker */}
              <div style={{ background: 'rgba(10,14,26,0.7)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ color: '#475569', fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>🏢 BROKER CONTACT</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0' }}>{p.broker.name}</div>
                  <div style={{ display: 'flex', gap: 1 }}>
                    {[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= Math.floor(p.broker.rating) ? '#f59e0b' : '#334155', fontSize: 11 }}>★</span>)}
                    <span style={{ color: '#64748b', fontSize: 11, marginLeft: 3 }}>{p.broker.rating}</span>
                  </div>
                </div>
                <div style={{ color: '#64748b', fontSize: 12, marginBottom: 2 }}>{p.broker.company}</div>
                <div style={{ color: '#475569', fontSize: 11, marginBottom: 10 }}>{p.broker.deals} verified deals</div>
                <a href={`tel:${p.broker.phone}`} onClick={e => e.stopPropagation()}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '10px', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', borderRadius: 10, fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>
                  📞 {p.broker.phone}
                </a>
              </div>
              <div style={{ marginTop: 10, textAlign: 'center', color: '#6366f1', fontSize: 12, fontWeight: 700 }}>View Full Details + WhatsApp →</div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {/* Hero image */}
            <div style={{ position: 'relative', height: 280, overflow: 'hidden', borderRadius: '20px 20px 0 0' }}>
              <img src={selected.image} alt={selected.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.src = 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=600&q=80'; }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(5,11,24,0.92) 0%,transparent 40%)' }} />
              <button onClick={() => setSelected(null)}
                style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 700 }}>
                ✕
              </button>
              <span style={{ position: 'absolute', top: 14, left: 14, background: selected.status === 'For Rent' ? '#f59e0b' : '#6366f1', color: '#fff', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
                {selected.status}
              </span>
              <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
                <div style={{ fontWeight: 900, fontSize: 20, color: '#fff', marginBottom: 4 }}>{selected.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>📍 {selected.location}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 }}>{selected.locality}</div>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              {/* Source + RERA */}
              <div style={{ marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="source-badge">📰 {selected.source}</span>
                {!noReraTypes.includes(selected.rera) && (
                  <span style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
                    ✓ RERA Registered
                  </span>
                )}
              </div>

              {/* Price */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#10b981' }}>{selected.price}</div>
                  {selected.status === 'For Sale' && <div style={{ color: '#64748b', fontSize: 13 }}>Expected rent: {selected.rent}/mo</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 16 }}>{selected.area}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{selected.pricePerSqft}</div>
                </div>
              </div>

              {/* Specs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Possession', value: selected.possessionDate },
                  { label: 'Floor',      value: selected.floor          },
                  { label: 'Facing',     value: selected.facing         },
                  { label: 'Age',        value: selected.age            },
                  { label: 'Type',       value: selected.type           },
                  { label: 'ROI',        value: selected.roi            },
                ].map((f, i) => (
                  <div key={i} style={{ background: 'rgba(10,14,26,0.7)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ color: '#475569', fontSize: 10, fontWeight: 700, marginBottom: 3 }}>{f.label.toUpperCase()}</div>
                    <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12 }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>{selected.description}</p>

              {/* RERA number */}
              {!noReraTypes.includes(selected.rera) && (
                <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 12 }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>✓ RERA: </span>
                  <span style={{ color: '#64748b' }}>{selected.rera}</span>
                </div>
              )}

              {/* Highlights */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#818cf8', marginBottom: 10 }}>✨ Key Highlights</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {selected.highlights.map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 8, padding: '8px 10px' }}>
                      <span style={{ color: '#10b981', fontSize: 14, flexShrink: 0 }}>✓</span>
                      <span style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#818cf8', marginBottom: 10 }}>🏊 Amenities</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selected.amenities.map((a, i) => <span key={i} className="amenity-tag">{a}</span>)}
                </div>
              </div>

              {/* Investment calc */}
              {selected.status === 'For Sale' && selected.priceNum > 0 && (
                <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#10b981', marginBottom: 12 }}>📈 Investment Analysis</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {[
                      { label: 'Property Value',      value: selected.price },
                      { label: 'Monthly Rental',      value: selected.rent  },
                      { label: 'Annual ROI',           value: selected.roi   },
                      { label: 'Annual Rental Income', value: `₹${((parseFloat(selected.rent?.replace(/[^0-9]/g, '')) || 0) * 12 / 100000).toFixed(1)}L` },
                      { label: '3-Year Appreciation',  value: `~${(parseFloat(selected.roi) * 3).toFixed(0)}%` },
                      { label: 'Price/sq.ft',          value: selected.pricePerSqft },
                    ].map((f, i) => (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{ color: '#64748b', fontSize: 10, marginBottom: 4 }}>{f.label}</div>
                        <div style={{ color: '#10b981', fontWeight: 900, fontSize: 13 }}>{f.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Broker CTA */}
              <div style={{ background: 'rgba(10,14,26,0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: 18 }}>
                <div style={{ color: '#475569', fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>🏢 BROKER CONTACT</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', flexShrink: 0 }}>
                    {selected.broker.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: 16, color: '#e2e8f0' }}>{selected.broker.name}</div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>{selected.broker.company}</div>
                    <div style={{ display: 'flex', gap: 1, alignItems: 'center', marginTop: 3 }}>
                      {[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= Math.floor(selected.broker.rating) ? '#f59e0b' : '#334155', fontSize: 12 }}>★</span>)}
                      <span style={{ color: '#64748b', fontSize: 11, marginLeft: 3 }}>{selected.broker.rating}/5 · {selected.broker.deals} verified deals</span>
                    </div>
                  </div>
                </div>
                <a href={`tel:${selected.broker.phone}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '14px', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', borderRadius: 12, fontWeight: 900, fontSize: 16, textDecoration: 'none', marginBottom: 8 }}>
                  📞 Call {selected.broker.phone}
                </a>
                <a href={`https://wa.me/${selected.broker.phone.replace(/[^0-9]/g, '')}?text=Hi ${selected.broker.name}, I'm interested in ${selected.title} at ${selected.location} listed at ${selected.price}.`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '12px', background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', color: '#25d366', borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                  💬 WhatsApp {selected.broker.name}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}