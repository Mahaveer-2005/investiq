const mongoose = require('mongoose');

const realEstateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['apartment', 'villa', 'plot', 'commercial', 'penthouse'], required: true },
  purpose: { type: String, enum: ['buy', 'rent', 'invest'], default: 'buy' },
  price: { type: Number, required: true },
  pricePerSqft: Number,
  area: Number,
  bedrooms: Number,
  bathrooms: Number,
  location: {
    city: String,
    state: String,
    area: String,
    pincode: String,
    landmark: String,
    coordinates: { lat: Number, lng: Number }
  },
  amenities: [String],
  images: [String],
  broker: {
    name: String,
    phone: String,
    email: String,
    agency: String,
    photo: String,
    rating: Number,
    verified: { type: Boolean, default: false }
  },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  views: { type: Number, default: 0 },
  postedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('RealEstate', realEstateSchema);
