require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. MONGODB CONNECTION
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/image_printers';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch((err) => console.error('MongoDB connection error:', err));

// 2. MONGOOSE SCHEMA & MODEL
const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  company: String,
  service: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  size: String,
  material: String,
  finishing: String,
  notes: String,
  fileName: String,
  status: { type: String, default: 'Received' },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// 3. UPLOAD DIRECTORY SETUP
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 4. MULTER STORAGE CONFIGURATION
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB Limit
});

// 5. MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

// 6. API ROUTES

// Get Printing Services List
app.get('/api/services', (req, res) => {
  res.json([
    { id: 'visiting-cards', name: 'Premium Business Cards', unitPrice: 2.5 },
    { id: 'pamphlets', name: 'Flyers & Pamphlets', unitPrice: 1.5 },
    { id: 'banners', name: 'Vinyl Banners & Standees', unitPrice: 18 },
    { id: 'doctor-pads', name: 'Doctor Prescription Pads', unitPrice: 3.5 },
    { id: 'stamps', name: 'Self-Inking Rubber Stamps', unitPrice: 250 }
  ]);
});

// Create New Printing Order
app.post('/api/orders', upload.single('designFile'), async (req, res) => {
  try {
    const { customerName, phone, email, company, service, quantity, size, material, finishing, notes } = req.body;

    const newOrder = new Order({
      id: `SBIP-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName,
      phone,
      email,
      company,
      service,
      quantity: parseInt(quantity) || 1,
      size,
      material,
      finishing,
      notes,
      fileName: req.file ? req.file.filename : null,
      status: 'Received'
    });

    await newOrder.save();
    res.status(201).json({ success: true, message: 'Order submitted successfully!', order: newOrder });
  } catch (error) {
    console.error('Error saving order:', error);
    res.status(500).json({ success: false, message: 'Failed to submit order.' });
  }
});

// Track Order Status by ID
app.get('/api/orders/track/:id', async (req, res) => {
  try {
    const order = await Order.findOne({ id: req.params.id.toUpperCase() });
    if (order) {
      res.json({ success: true, order });
    } else {
      res.status(404).json({ success: false, message: 'Order ID not found.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error tracking order.' });
  }
});

// Admin Route to Get All Orders
app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching orders.' });
  }
});

// Serve Admin Dashboard HTML
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// 7. START SERVER
const server = app.listen(PORT, () => {
  console.log(`Image Printers server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} in use, trying ${PORT + 1}...`);
    app.listen(PORT + 1);
  } else {
    console.error(err);
  }
});