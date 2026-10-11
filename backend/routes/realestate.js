const router = require('express').Router();

const PROPERTIES = [
  { id: 1, title: '3BHK Luxury Apartment', location: 'Whitefield, Bangalore', price: 8500000, rentPerMonth: 45000, area: 1850, type: 'Apartment', status: 'For Sale', broker: { name: 'Ravi Kumar', phone: '+91-9876543210', agency: 'Prestige Realty' }, amenities: ['Gym', 'Pool', 'Parking', 'Security'], image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400', roi: 8.5 },
  { id: 2, title: '2BHK Apartment', location: 'Koramangala, Bangalore', price: 6200000, rentPerMonth: 35000, area: 1200, type: 'Apartment', status: 'For Sale', broker: { name: 'Priya Sharma', phone: '+91-9765432109', agency: 'Brigade Group' }, amenities: ['Parking', 'Security', 'Lift'], image: 'https://images.unsplash.com/photo-1600607687939-ce8a6f349469?w=400', roi: 7.2 },
  { id: 3, title: 'Commercial Office Space', location: 'HSR Layout, Bangalore', price: 15000000, rentPerMonth: 120000, area: 3200, type: 'Commercial', status: 'For Sale', broker: { name: 'Suresh Nair', phone: '+91-9654321098', agency: 'CBRE India' }, amenities: ['Power Backup', 'AC', 'Parking', 'Cafeteria'], image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400', roi: 9.6 },
  { id: 4, title: '4BHK Villa', location: 'Electronic City, Bangalore', price: 18000000, rentPerMonth: 85000, area: 3800, type: 'Villa', status: 'For Sale', broker: { name: 'Anita Reddy', phone: '+91-9543210987', agency: 'Sobha Realty' }, amenities: ['Garden', 'Pool', 'Gym', 'Parking', 'Smart Home'], image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400', roi: 6.8 },
  { id: 5, title: 'Studio Apartment', location: 'Indiranagar, Bangalore', price: 3500000, rentPerMonth: 22000, area: 650, type: 'Apartment', status: 'For Rent', broker: { name: 'Kiran Patel', phone: '+91-9432109876', agency: 'NoBroker' }, amenities: ['Furnished', 'AC', 'WiFi'], image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400', roi: 7.5 },
  { id: 6, title: 'Plot - Residential', location: 'Devanahalli, Bangalore', price: 4800000, area: 2400, type: 'Plot', status: 'For Sale', broker: { name: 'Mohan Das', phone: '+91-9321098765', agency: 'DLF Properties' }, amenities: ['Gated Community', 'Water', 'Electricity'], image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400', roi: 12.0 }
];

router.get('/', (req, res) => {
  const { type, minPrice, maxPrice, location } = req.query;
  let filtered = PROPERTIES;
  if (type) filtered = filtered.filter(p => p.type === type);
  if (minPrice) filtered = filtered.filter(p => p.price >= parseInt(minPrice));
  if (maxPrice) filtered = filtered.filter(p => p.price <= parseInt(maxPrice));
  if (location) filtered = filtered.filter(p => p.location.toLowerCase().includes(location.toLowerCase()));
  res.json(filtered);
});

router.get('/:id', (req, res) => {
  const prop = PROPERTIES.find(p => p.id === parseInt(req.params.id));
  if (!prop) return res.status(404).json({ message: 'Property not found' });
  res.json(prop);
});

module.exports = router;
