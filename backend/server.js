// backend/server.js

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// ✅ Only this one
const authRoutes = require('./routes/auth'); // Use 'auth' if your file is auth.js
const projectRoutes = require('./routes/projects'); // Confirm it's named projects.js

const db = require('./db'); // or './models/db' if that's where it is

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// Test DB
db.query('SELECT 1')
  .then(() => console.log('✅ Database connected!'))
  .catch((err) => console.error('❌ DB connection failed:', err));

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server started on http://localhost:${PORT}`);
});
