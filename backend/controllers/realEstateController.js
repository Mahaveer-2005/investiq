const RealEstate = require('../models/RealEstate');

const SAMPLE_PROPERTIES = [
  {
    title: '3 BHK Luxury Apartment in Whitefield', type: 'apartment', status: 'buy',
    price: 9500000, pricePerSqft: 7500, area: 1267, bedrooms: 3, bathrooms: 3,
    city: 'Bengaluru', locality: 'Whitefield', address: 'Prestige Tech Park Road, Whitefield, Bengaluru - 560066',
    pincode: '560066', images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800'],
    amenities: ['Swimming Pool', 'Gym', 'Clubhouse', 'Security', 'Power Backup', 'Parking'],
    builder: 'Prestige Group', brokerName: 'Rajesh Kumar', brokerPhone: '+91-9876543210',
    brokerEmail: 'rajesh@investiqrealty.com', possessionDate: 'Ready to Move',
    reraId: 'PRM/KA/RERA/1251/308/PR/171017/001668', isFeatured: true,
    description: 'Premium 3 BHK apartment in the heart of Whitefield IT corridor. Close to all major tech parks.'
  },
  {
    title: '4 BHK Villa in Sarjapur Road', type: 'villa', status: 'buy',
    price: 25000000, pricePerSqft: 8200, area: 3048, bedrooms: 4, bathrooms: 4,
    city: 'Bengaluru', locality: 'Sarjapur Road', address: 'Sarjapur Main Road, near Wipro SEZ, Bengaluru - 560034',
    pincode: '560034', images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800'],
    amenities: ['Private Pool', 'Home Theater', 'Terrace Garden', 'Smart Home', '4 Car Parking', 'Modular Kitchen'],
    builder: 'Sobha Developers', brokerName: 'Priya Sharma', brokerPhone: '+91-9845067234',
    brokerEmail: 'priya@investiqrealty.com', possessionDate: 'Ready to Move',
    reraId: 'PRM/KA/RERA/1251/309/PR/180118/002541', isFeatured: true,
    description: 'Spacious 4 BHK independent villa with private pool in Bengaluru\'s premium villa township.'
  },
  {
    title: '2 BHK Apartment in Powai', type: 'apartment', status: 'buy',
    price: 18500000, pricePerSqft: 22500, area: 823, bedrooms: 2, bathrooms: 2,
    city: 'Mumbai', locality: 'Powai', address: 'Hiranandani Gardens, Powai, Mumbai - 400076',
    pincode: '400076', images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'],
    amenities: ['Lake View', 'Gymnasium', 'Swimming Pool', 'Garden', 'Concierge', '24/7 Security'],
    builder: 'Hiranandani Developers', brokerName: 'Amit Desai', brokerPhone: '+91-9022345678',
    brokerEmail: 'amit@investiqrealty.com', possessionDate: 'Ready to Move',
    reraId: 'P51800026230', isFeatured: true,
    description: 'Elegant 2 BHK in iconic Hiranandani Gardens with stunning lake views.'
  },
  {
    title: 'Commercial Office Space in Cyber City', type: 'commercial', status: 'buy',
    price: 45000000, pricePerSqft: 12000, area: 3750, bedrooms: 0, bathrooms: 8,
    city: 'Gurugram', locality: 'Cyber City', address: 'DLF Cyber City, Phase II, Gurugram - 122002',
    pincode: '122002', images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800'],
    amenities: ['24/7 Security', 'Power Backup', 'Cafeteria', 'Conference Rooms', 'CCTV', 'Fiber Internet'],
    builder: 'DLF', brokerName: 'Suresh Mehta', brokerPhone: '+91-9999012345',
    brokerEmail: 'suresh@investiqrealty.com', possessionDate: 'Immediate',
    reraId: 'RC/REP/HARERA/GGM/2022/01', isFeatured: false,
    description: 'Premium Grade A office space in DLF Cyber City, the most premium commercial district of NCR.'
  },
  {
    title: '1 BHK Studio Apartment in Baner', type: 'apartment', status: 'rent',
    price: 25000, pricePerSqft: 42, area: 600, bedrooms: 1, bathrooms: 1,
    city: 'Pune', locality: 'Baner', address: 'Baner Road, Near Balewadi High Street, Pune - 411045',
    pincode: '411045', images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800'],
    amenities: ['Gym', 'Swimming Pool', 'Security', 'Wi-Fi', 'Furnished'],
    builder: 'Kolte-Patil', brokerName: 'Neha Joshi', brokerPhone: '+91-9823456789',
    brokerEmail: 'neha@investiqrealty.com', possessionDate: 'Immediate',
    reraId: 'P52100015543', isFeatured: false,
    description: 'Fully furnished 1 BHK studio ideal for IT professionals near Baner tech corridor.'
  },
  {
    title: '5 BHK Penthouse in Bandra West', type: 'apartment', status: 'buy',
    price: 120000000, pricePerSqft: 85000, area: 1412, bedrooms: 5, bathrooms: 5,
    city: 'Mumbai', locality: 'Bandra West', address: 'Linking Road, Bandra West, Mumbai - 400050',
    pincode: '400050', images: ['https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=800', 'https://images.unsplash.com/photo-1569152811536-fb47aced8409?w=800'],
    amenities: ['Terrace Pool', 'Sea View', 'Smart Home', 'Personal Lift', 'Wine Cellar', 'Staff Quarters'],
    builder: 'Rustomjee', brokerName: 'Farhan Khan', brokerPhone: '+91-9820123456',
    brokerEmail: 'farhan@investiqrealty.com', possessionDate: 'Ready to Move',
    reraId: 'P51800046120', isFeatured: true,
    description: 'Ultra-luxury sea-facing penthouse in Bandra with panoramic Arabian Sea views.'
  },
  {
    title: 'Residential Plot in Devanahalli', type: 'plot', status: 'buy',
    price: 8500000, pricePerSqft: 4200, area: 2024, bedrooms: 0, bathrooms: 0,
    city: 'Bengaluru', locality: 'Devanahalli', address: 'Near KIADB Aerospace Park, Devanahalli, Bengaluru - 562110',
    pincode: '562110', images: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800', 'https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=800'],
    amenities: ['Clear Title', 'BBMP Approved', 'Gated Community', 'Road Access', 'Water & Electricity'],
    builder: 'KIADB', brokerName: 'Ravi Shankar', brokerPhone: '+91-9741234567',
    brokerEmail: 'ravi@investiqrealty.com', possessionDate: 'Immediate',
    reraId: 'PRM/KA/RERA/1251/310/PR/200520/004512', isFeatured: false,
    description: 'BBMP approved residential plot near Bengaluru International Airport. High appreciation potential.'
  },
  {
    title: '3 BHK in Hitech City', type: 'apartment', status: 'buy',
    price: 14500000, pricePerSqft: 9800, area: 1479, bedrooms: 3, bathrooms: 3,
    city: 'Hyderabad', locality: 'Hitech City', address: 'Madhapur Main Road, Hitech City, Hyderabad - 500081',
    pincode: '500081', images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800'],
    amenities: ['Infinity Pool', 'Clubhouse', 'Kids Play Area', 'Jogging Track', 'Indoor Sports'],
    builder: 'My Home Constructions', brokerName: 'Venkat Reddy', brokerPhone: '+91-9849012345',
    brokerEmail: 'venkat@investiqrealty.com', possessionDate: 'Ready to Move',
    reraId: 'P02400000890', isFeatured: false,
    description: 'Premium 3 BHK in the tech hub of Hyderabad with world-class amenities.'
  }
];

exports.seedRealEstate = async () => {
  try {
    const count = await RealEstate.countDocuments();
    if (count === 0) {
      await RealEstate.insertMany(SAMPLE_PROPERTIES);
      console.log('✅ Real Estate data seeded');
    }
  } catch (e) {
    console.error('Real estate seed error:', e.message);
  }
};

exports.getAllProperties = async (req, res) => {
  try {
    const { city, type, status, minPrice, maxPrice, bedrooms, search, page = 1, limit = 12 } = req.query;
    const query = {};
    
    if (city) query.city = new RegExp(city, 'i');
    if (type) query.type = type;
    if (status) query.status = status;
    if (bedrooms) query.bedrooms = parseInt(bedrooms);
    if (search) query.$or = [{ title: new RegExp(search, 'i') }, { locality: new RegExp(search, 'i') }, { city: new RegExp(search, 'i') }];
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }

    const skip = (page - 1) * limit;
    const [properties, total] = await Promise.all([
      RealEstate.find(query).skip(skip).limit(parseInt(limit)).sort({ isFeatured: -1, createdAt: -1 }),
      RealEstate.countDocuments(query)
    ]);

    res.json({
      success: true, data: properties,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPropertyDetail = async (req, res) => {
  try {
    const property = await RealEstate.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    await RealEstate.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true, data: property });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFeaturedProperties = async (req, res) => {
  try {
    const properties = await RealEstate.find({ isFeatured: true }).limit(6);
    res.json({ success: true, data: properties });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
