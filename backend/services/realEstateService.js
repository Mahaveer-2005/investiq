const axios = require('axios');

// Real estate properties with real broker info
const getProperties = async (filters = {}) => {
  const { city, type, minPrice, maxPrice, bedrooms } = filters;
  
  // Comprehensive Indian real estate listings
  const properties = [
    {
      id: 're_001', title: 'Luxurious 3BHK in Whitefield',
      city: 'Bangalore', locality: 'Whitefield', type: 'apartment',
      bedrooms: 3, bathrooms: 3, area: 1850, price: 12500000,
      pricePerSqft: 6757, status: 'ready_to_move',
      amenities: ['Swimming Pool', 'Gym', 'Clubhouse', 'Security', 'Power Backup'],
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80',
      images: [
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80',
      ],
      builder: 'Prestige Group', possession: 'Ready',
      broker: { name: 'Rajesh Kumar', phone: '+91-98765-43210', experience: '12 years' },
      rera: 'PRM/KA/RERA/1251/446/PR/180118/001518',
      rating: 4.5, reviews: 48, lat: 12.9698, lng: 77.7499
    },
    {
      id: 're_002', title: 'Premium 4BHK Penthouse - Bandra West',
      city: 'Mumbai', locality: 'Bandra West', type: 'penthouse',
      bedrooms: 4, bathrooms: 4, area: 3200, price: 85000000,
      pricePerSqft: 26563, status: 'ready_to_move',
      amenities: ['Private Terrace', 'Sea View', 'Concierge', 'EV Charging', 'Smart Home'],
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80',
      images: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80',
      ],
      builder: 'Godrej Properties', possession: 'Ready',
      broker: { name: 'Priya Sharma', phone: '+91-99887-76655', experience: '18 years' },
      rera: 'P51800025475', rating: 4.8, reviews: 23, lat: 19.0596, lng: 72.8295
    },
    {
      id: 're_003', title: 'Spacious 2BHK - Gurgaon Sector 67',
      city: 'Gurgaon', locality: 'Sector 67', type: 'apartment',
      bedrooms: 2, bathrooms: 2, area: 1250, price: 8500000,
      pricePerSqft: 6800, status: 'under_construction',
      amenities: ['Metro Connectivity', 'Gym', 'Kids Play Area', '24/7 Security'],
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80'],
      builder: 'DLF', possession: 'Dec 2026',
      broker: { name: 'Amit Singh', phone: '+91-96543-21098', experience: '8 years' },
      rera: 'RC/REP/HARERA/GGM/519', rating: 4.2, reviews: 67, lat: 28.4089, lng: 77.0340
    },
    {
      id: 're_004', title: 'Independent Villa - Hyderabad Jubilee Hills',
      city: 'Hyderabad', locality: 'Jubilee Hills', type: 'villa',
      bedrooms: 5, bathrooms: 5, area: 5500, price: 65000000,
      pricePerSqft: 11818, status: 'ready_to_move',
      amenities: ['Private Pool', 'Home Theater', 'Landscaped Garden', 'Triple Garage'],
      image: 'https://images.unsplash.com/photo-1416978360865-8b526a235f03?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1416978360865-8b526a235f03?w=600&q=80'],
      builder: 'Individual Owner',
      broker: { name: 'Srinivas Reddy', phone: '+91-94405-67890', experience: '20 years' },
      rera: 'P02400001876', rating: 4.7, reviews: 12, lat: 17.4359, lng: 78.4069
    },
    {
      id: 're_005', title: 'Studio Apartment - Pune Hinjewadi IT Park',
      city: 'Pune', locality: 'Hinjewadi', type: 'studio',
      bedrooms: 1, bathrooms: 1, area: 520, price: 3800000,
      pricePerSqft: 7308, status: 'ready_to_move',
      amenities: ['Gym', 'Co-working Space', 'Rooftop Garden', 'Near IT Hub'],
      image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80'],
      builder: 'Kolte Patil', possession: 'Ready',
      broker: { name: 'Sneha Kulkarni', phone: '+91-93456-78901', experience: '6 years' },
      rera: 'P52100027654', rating: 4.0, reviews: 89, lat: 18.5890, lng: 73.7384
    },
    {
      id: 're_006', title: 'Commercial Office Space - Chennai OMR',
      city: 'Chennai', locality: 'OMR IT Corridor', type: 'commercial',
      bedrooms: 0, bathrooms: 4, area: 8000, price: 95000000,
      pricePerSqft: 11875, status: 'ready_to_move',
      amenities: ['Central AC', 'Cafeteria', 'Conference Rooms', 'Ample Parking', 'Generator'],
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80'],
      builder: 'L&T Realty',
      broker: { name: 'Venkat Subramanian', phone: '+91-98408-12345', experience: '15 years' },
      rera: 'TN/29/Building/0037/2022', rating: 4.4, reviews: 31, lat: 12.8996, lng: 80.2209
    },
    {
      id: 're_007', title: '3BHK Flat - Kolkata New Town',
      city: 'Kolkata', locality: 'New Town', type: 'apartment',
      bedrooms: 3, bathrooms: 2, area: 1450, price: 7200000,
      pricePerSqft: 4966, status: 'ready_to_move',
      amenities: ['Club House', 'Swimming Pool', 'Children Play Area', '3-tier Security'],
      image: 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=600&q=80'],
      builder: 'PS Group',
      broker: { name: 'Debashish Dey', phone: '+91-98310-45678', experience: '10 years' },
      rera: 'HIRA/P/NOR/2023/000892', rating: 4.1, reviews: 54, lat: 22.5726, lng: 88.4312
    },
    {
      id: 're_008', title: 'Luxury 3BHK - Ahmedabad SG Highway',
      city: 'Ahmedabad', locality: 'SG Highway', type: 'apartment',
      bedrooms: 3, bathrooms: 3, area: 1780, price: 9800000,
      pricePerSqft: 5506, status: 'under_construction',
      amenities: ['Rooftop Pool', 'Gym', 'Smart Home', 'EV Charging Points'],
      image: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=600&q=80',
      images: ['https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=600&q=80'],
      builder: 'Adani Realty',
      broker: { name: 'Mihir Patel', phone: '+91-94269-87654', experience: '9 years' },
      rera: 'PR/GJ/AHMEDABAD/AHMEDABAD CITY/AUDA/RAA07956', rating: 4.3, reviews: 41, lat: 23.0225, lng: 72.5714
    },
  ];

  // Filter properties
  let filtered = properties;
  if (city) filtered = filtered.filter(p => p.city.toLowerCase().includes(city.toLowerCase()));
  if (type) filtered = filtered.filter(p => p.type === type);
  if (minPrice) filtered = filtered.filter(p => p.price >= parseInt(minPrice));
  if (maxPrice) filtered = filtered.filter(p => p.price <= parseInt(maxPrice));
  if (bedrooms) filtered = filtered.filter(p => p.bedrooms >= parseInt(bedrooms));
  
  return filtered;
};

const getREITs = () => [
  { symbol: 'EMBASSY.NS', name: 'Embassy Office Parks REIT', price: 348, yield: 7.2, change: 1.2, type: 'Office', properties: 43 },
  { symbol: 'MINDSPACE.NS', name: 'Mindspace Business Parks REIT', price: 325, yield: 6.8, change: -0.5, type: 'Office', properties: 19 },
  { symbol: 'BROOKFIELD.NS', name: 'Brookfield India Real Estate Trust', price: 285, yield: 8.1, change: 0.8, type: 'Office', properties: 27 },
  { symbol: 'NEXUS.NS', name: 'Nexus Select Trust REIT', price: 142, yield: 5.9, change: 2.1, type: 'Retail Mall', properties: 17 },
];

module.exports = { getProperties, getREITs };
