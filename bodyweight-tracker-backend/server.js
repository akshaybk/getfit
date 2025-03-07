require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./middleware/authMiddleware');
const adminMiddleware = require('./middleware/adminMiddleware');
const multer = require('multer');
const path = require('path');
const TransformationPhoto = require('./models/TransformationPhoto');
const fs = require('fs');

// Import models
const User = require('./models/User');
const Weight = require('./models/Weight');
const Goal = require('./models/Goal');
const HealthMetrics = require('./models/HealthMetrics');
const AdvancedHealthMetrics = require('./models/AdvancedHealthMetrics');

const app = express();

// Configure CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bodyweight_tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully');
  console.log('Connection URL:', process.env.MONGO_URI || 'mongodb://localhost:27017/bodyweight_tracker');
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err);
  process.exit(1); // Exit if MongoDB connection fails
});

// Add connection error handler
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads', 'transformations');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  }
});

// API Routes
// Photo upload route
app.post('/transformation/upload', authMiddleware, (req, res, next) => {
  console.log('Auth middleware passed');
  console.log('User:', req.user);
  next();
}, upload.single('photo'), async (req, res) => {
  console.log('Upload request received');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', req.body);
  
  if (!req.file) {
    console.error('No file received');
    return res.status(400).json({ message: 'No file uploaded' });
  }

  console.log('File details:', JSON.stringify(req.file, null, 2));
  
  try {
    const photoUrl = `/uploads/transformations/${req.file.filename}`;
    console.log('Generated photo URL:', photoUrl);
    
    // Store photo information in MongoDB without using a model
    const db = mongoose.connection.db;
    const photos = db.collection('transformation_photos');
    
    const photoDoc = {
      userId: new mongoose.Types.ObjectId(req.user.id),
      photoUrl: photoUrl,
      uploadDate: new Date()
    };
    console.log('Attempting to save photo document:', JSON.stringify(photoDoc, null, 2));
    
    const photo = await photos.insertOne(photoDoc);
    console.log('Photo saved to database:', JSON.stringify(photo, null, 2));
    
    const response = {
      message: 'Photo uploaded successfully',
      photoUrl: photoUrl,
      photoId: photo.insertedId
    };
    console.log('Sending response:', JSON.stringify(response, null, 2));
    
    res.json(response);
  } catch (err) {
    console.error('Error saving photo:', err);
    return res.status(500).json({ message: 'Error saving photo to database', error: err.message });
  }
});

// Get transformation photos
app.get('/transformation/photos', authMiddleware, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const photos = db.collection('transformation_photos');
    
    const userPhotos = await photos.find({
      userId: new mongoose.Types.ObjectId(req.user.id)
    }).sort({ uploadDate: -1 }).toArray();
    
    res.json(userPhotos.map(photo => ({
      id: photo._id,
      photoUrl: photo.photoUrl,
      uploadDate: photo.uploadDate
    })));
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ message: 'Error fetching photos' });
  }
});

// Serve static files with CORS headers - THIS MUST COME AFTER API ROUTES
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// ✅ Register User
app.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(400).json({ error: 'User already exists' });
  }
});

// ✅ Login User
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt for email: ${email}`);
  console.log(`Request body:`, JSON.stringify(req.body, null, 2));
  
  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`User not found: ${email}`);
      return res.status(400).json({ message: 'User not found' });
    }
    
    console.log(`User found: ${user.email}, Admin: ${user.isAdmin}, Super Admin: ${user.isSuperAdmin}, Banned: ${user.isBanned}`);
    
    if (user.isBanned) {
      console.log(`Banned user attempted login: ${email}`);
      return res.status(403).json({ message: 'Account has been banned. Please contact an administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`Password match: ${isMatch}`);
    
    if (!isMatch) {
      console.log(`Invalid password for user: ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log(`Successful login for: ${email}, Admin: ${user.isAdmin}, Super Admin: ${user.isSuperAdmin}`);
    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin, isSuperAdmin: user.isSuperAdmin }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    // Make sure to include isAdmin and isSuperAdmin in the response
    const responseData = { 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email,
        isAdmin: Boolean(user.isAdmin), // Ensure isAdmin is a boolean value
        isSuperAdmin: Boolean(user.isSuperAdmin) // Ensure isSuperAdmin is a boolean value
      } 
    };
    
    console.log(`Sending response for ${email}:`, JSON.stringify(responseData, null, 2));
    return res.json(responseData);
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Add or Update Weight (Protected Route)
app.post('/weight', authMiddleware, async (req, res) => {
  const { date, morningWeight, nightWeight } = req.body;
  const userId = req.user.id;

  try {
    let existingEntry = await Weight.findOne({ userId, date });
    console.log('Existing weight entry:', existingEntry);

    if (existingEntry) {
      if (morningWeight !== undefined) existingEntry.morningWeight = morningWeight;
      if (nightWeight !== undefined) existingEntry.nightWeight = nightWeight;
      await existingEntry.save();
    } else {
      existingEntry = new Weight({ userId, date, morningWeight, nightWeight });
      await existingEntry.save();
    }

    // Update BMI if height exists
    const metrics = await HealthMetrics.findOne({ userId });
    console.log('Current health metrics:', metrics);

    if (metrics && metrics.height) {
      const heightInMeters = metrics.height / 100;
      const currentWeight = morningWeight || nightWeight || existingEntry.morningWeight || existingEntry.nightWeight;
      console.log('Height (m):', heightInMeters);
      console.log('Current weight:', currentWeight);
      
      if (currentWeight) {
        const bmi = (currentWeight / (heightInMeters * heightInMeters)).toFixed(2);
        console.log('Calculated BMI:', bmi);
        metrics.bmi = bmi;
        metrics.updatedAt = new Date();
        await metrics.save();
        console.log('Updated metrics:', metrics);
      }
    }

    // Return both the weight entry and updated metrics
    res.json({
      weight: existingEntry,
      metrics: metrics
    });
  } catch (error) {
    console.error("Error saving weight:", error);
    res.status(500).json({ error: 'Error saving weight' });
  }
});

// ✅ GET Weight Data (Fixed Route)
app.get('/weight/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;

  try {
    const weights = await Weight.find({ userId }).sort({ date: 1 });

    if (!weights || weights.length === 0) {
      return res.status(404).json({ error: 'No weight data found' });
    }

    res.json(weights);
  } catch (error) {
    console.error("Error fetching weight data:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update or Create Health Metrics
app.post('/health-metrics', authMiddleware, async (req, res) => {
  const { height, weight } = req.body;
  const userId = req.user.id;
  console.log('Updating health metrics:', { height, weight, userId });

  try {
    // First, get the latest weight if not provided
    let currentWeight = weight;
    if (!currentWeight) {
      const latestWeight = await Weight.findOne({ userId }).sort({ date: -1 });
      if (latestWeight) {
        currentWeight = latestWeight.nightWeight || latestWeight.morningWeight;
      }
    }
    console.log('Current weight for BMI calculation:', currentWeight);

    let metrics = await HealthMetrics.findOne({ userId });
    console.log('Existing metrics:', metrics);
    
    if (metrics) {
      // Only update height if it's provided and valid
      if (height && height > 0) {
        metrics.height = height;
        
        // Calculate BMI if we have both height and weight
        if (currentWeight) {
          const heightInMeters = height / 100;
          console.log('Height (m):', heightInMeters);
          console.log('Weight for BMI:', currentWeight);
          const bmi = (currentWeight / (heightInMeters * heightInMeters)).toFixed(2);
          console.log('Calculated BMI:', bmi);
          metrics.bmi = bmi;
        } else {
          // If no weight is available, set BMI to null
          metrics.bmi = null;
        }
      }
      
      metrics.updatedAt = new Date();
      await metrics.save();
      console.log('Updated metrics:', metrics);
    } else {
      // Create new metrics
      let bmiValue = null;
      if (height > 0 && currentWeight) {
        const heightInMeters = height / 100;
        bmiValue = (currentWeight / (heightInMeters * heightInMeters)).toFixed(2);
      }
      console.log('New BMI value:', bmiValue);
      
      metrics = new HealthMetrics({ 
        userId, 
        height,
        bmi: bmiValue
      });
      await metrics.save();
      console.log('Created new metrics:', metrics);
    }

    res.json(metrics);
  } catch (error) {
    console.error('Error updating health metrics:', error);
    res.status(500).json({ error: 'Error updating health metrics' });
  }
});

// Get Health Metrics
app.get('/health-metrics', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const metrics = await HealthMetrics.findOne({ userId });
    res.json(metrics || { height: null, bmi: null });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching health metrics' });
  }
});

// Update Goal Weight (Updated to include BMI calculation)
app.post('/goal', authMiddleware, async (req, res) => {
  const { goalWeight } = req.body;
  const userId = req.user.id;
  console.log('Setting goal weight:', { userId, goalWeight });

  try {
    // Update or create goal
    let goal = await Goal.findOne({ userId });
    if (goal) {
      goal.targetWeight = goalWeight;
      await goal.save();
    } else {
      goal = new Goal({ userId, targetWeight: goalWeight });
      await goal.save();
    }
    console.log('Goal updated:', goal);

    // Get current metrics
    let metrics = await HealthMetrics.findOne({ userId });
    console.log('Current metrics:', metrics);

    // If we have height, calculate and update BMI
    if (metrics && metrics.height) {
      const heightInMeters = metrics.height / 100;
      // Get the latest weight for BMI calculation
      const latestWeight = await Weight.findOne({ userId }).sort({ date: -1 });
      const currentWeight = latestWeight ? (latestWeight.nightWeight || latestWeight.morningWeight) : goalWeight;
      
      console.log('Calculating BMI with:', { heightInMeters, currentWeight });
      const bmi = (currentWeight / (heightInMeters * heightInMeters)).toFixed(2);
      metrics.bmi = bmi;
      metrics.updatedAt = new Date();
      await metrics.save();
      console.log('Updated metrics with new BMI:', metrics);
    }

    res.json({
      targetWeight: goal.targetWeight,
      metrics: metrics
    });
  } catch (error) {
    console.error('Error setting goal weight:', error);
    res.status(500).json({ error: 'Error setting goal weight' });
  }
});

// ✅ GET Goal (Protected Route)
app.get('/goal', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const goal = await Goal.findOne({ userId });
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching goal' });
  }
});

// Admin Routes
// Get all users with their data
app.get('/admin/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    const usersWithData = await Promise.all(users.map(async (user) => {
      const weights = await Weight.find({ userId: user._id }).sort({ date: -1 });
      const goal = await Goal.findOne({ userId: user._id });
      const metrics = await HealthMetrics.findOne({ userId: user._id });
      
      let latestWeight = null;
      let bmi = null;
      
      if (weights.length > 0) {
        const latest = weights[0];
        latestWeight = latest.morningWeight || latest.nightWeight;
        
        if (metrics && metrics.height && latestWeight) {
          const heightInMeters = metrics.height / 100;
          bmi = (latestWeight / (heightInMeters * heightInMeters)).toFixed(2);
        }
      }
      
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isBanned: user.isBanned,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        weights: weights,
        latestWeight: latestWeight,
        goalWeight: goal ? goal.targetWeight : null,
        height: metrics ? metrics.height : null,
        bmi: bmi
      };
    }));
    
    // Log the first user's data for debugging
    if (usersWithData.length > 0) {
      console.log('First user data being sent to admin:', JSON.stringify({
        id: usersWithData[0].id,
        name: usersWithData[0].name,
        email: usersWithData[0].email,
        height: usersWithData[0].height,
        bmi: usersWithData[0].bmi,
        goalWeight: usersWithData[0].goalWeight,
        latestWeight: usersWithData[0].latestWeight
      }, null, 2));
    }
    
    res.json(usersWithData);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Ban/unban a user
app.post('/admin/ban/:userId', adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Toggle the banned status
    user.isBanned = !user.isBanned;
    await user.save();
    
    res.json({ message: `User ${user.isBanned ? 'banned' : 'unbanned'} successfully` });
  } catch (error) {
    console.error('Error toggling user ban status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a user
app.delete('/admin/users/:userId', adminMiddleware, async (req, res) => {
  try {
    // First find the user without deleting
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get the requesting admin user
    const adminUser = await User.findById(req.user.id);
    
    // Check if the user is trying to delete themselves
    if (req.params.userId === req.user.id) {
      return res.status(403).json({ message: 'You cannot delete your own account' });
    }
    
    // Check deletion permissions:
    // 1. If target user is admin and requesting user is not super admin, prevent deletion
    // 2. Otherwise, allow the deletion
    if (user.isAdmin && !adminUser.isSuperAdmin) {
      return res.status(403).json({ message: 'Only super admins can delete admin accounts' });
    }
    
    // If not an admin or requester is super admin, proceed with deletion
    await User.findByIdAndDelete(req.params.userId);
    
    // Delete all related weight and goal data
    await Weight.deleteMany({ userId: req.params.userId });
    await Goal.deleteMany({ userId: req.params.userId });
    
    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Advanced Health Metrics Routes
app.post('/advanced-metrics', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    let metrics = await AdvancedHealthMetrics.findOne({ 
      userId,
      date: {
        $gte: new Date().setHours(0, 0, 0, 0),
        $lt: new Date().setHours(23, 59, 59, 999)
      }
    });

    if (metrics) {
      // Update existing metrics for today
      Object.assign(metrics, req.body);
      metrics.updatedAt = new Date();
      await metrics.save();
    } else {
      // Create new metrics
      metrics = new AdvancedHealthMetrics({
        userId,
        ...req.body
      });
      await metrics.save();
    }

    res.json(metrics);
  } catch (error) {
    console.error('Error saving advanced metrics:', error);
    res.status(500).json({ error: 'Error saving advanced metrics' });
  }
});

app.get('/advanced-metrics', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const metrics = await AdvancedHealthMetrics.findOne({ 
      userId,
      date: {
        $gte: new Date().setHours(0, 0, 0, 0),
        $lt: new Date().setHours(23, 59, 59, 999)
      }
    });
    res.json(metrics || {});
  } catch (error) {
    res.status(500).json({ error: 'Error fetching advanced metrics' });
  }
});

app.get('/advanced-metrics/history', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;
  
  try {
    const query = { userId };
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const metrics = await AdvancedHealthMetrics.find(query).sort({ date: -1 });
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching metrics history' });
  }
});

// Get detailed information for a specific user (admin only)
app.get('/admin/user/:userId', adminMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(`Fetching detailed data for user ID: ${userId}`);
    
    // Get basic user info
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user's weights and ensure we're getting the complete ObjectId
    const weights = await Weight.find({ userId }).sort({ date: -1 });
    console.log('First weight record _id (if exists):', weights.length > 0 ? weights[0]._id.toString() : 'No weights');
    
    // Map the weights to ensure we have the complete ObjectId
    const mappedWeights = weights.map(weight => ({
      _id: weight._id.toString(), // Explicitly convert ObjectId to string
      date: weight.date,
      morningWeight: weight.morningWeight,
      nightWeight: weight.nightWeight,
      userId: weight.userId
    }));
    
    // Get user's goal weight
    const goal = await Goal.findOne({ userId });
    
    // Get user's health metrics
    const metrics = await HealthMetrics.findOne({ userId });
    console.log(`Health metrics for user ${userId}:`, metrics);
    
    // Calculate BMI if possible
    let latestWeight = null;
    let bmi = null;
    
    if (weights.length > 0) {
      const latest = weights[0];
      latestWeight = latest.nightWeight || latest.morningWeight;
      
      if (metrics && metrics.height && latestWeight) {
        const heightInMeters = metrics.height / 100;
        bmi = (latestWeight / (heightInMeters * heightInMeters)).toFixed(2);
        console.log(`Calculated BMI for user ${userId}: ${bmi} (height: ${metrics.height}cm, weight: ${latestWeight}kg)`);
      }
    }
    
    // Combine all the data
    const userData = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      weights: mappedWeights, // Use our mapped weights with string IDs
      latestWeight: latestWeight,
      goalWeight: goal ? goal.targetWeight : null,
      height: metrics ? metrics.height : null,
      bmi: bmi
    };
    
    console.log('Sending mapped weights with IDs:', mappedWeights.map(w => w._id));
    
    res.json(userData);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user data (for profile, including health metrics)
app.get('/user', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user info
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get health metrics to access height
    const metrics = await HealthMetrics.findOne({ userId });
    
    // Get the latest weight
    const latestWeight = await Weight.findOne({ userId }).sort({ date: -1 });
    
    // Get user's goal weight
    const goal = await Goal.findOne({ userId });
    
    // Prepare the response with all user data
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      height: metrics ? metrics.height : null,
      latestWeight: latestWeight ? (latestWeight.nightWeight || latestWeight.morningWeight) : null,
      goalWeight: goal ? goal.targetWeight : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    console.log(`Sending user data for ${userId}:`, {
      name: userData.name,
      height: userData.height,
      latestWeight: userData.latestWeight,
      goalWeight: userData.goalWeight
    });
    
    res.json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an uploaded image
app.delete('/transformation/photos/:id', async (req, res) => {
  try {
    const photoId = req.params.id;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Find the photo document
    const db = mongoose.connection.db;
    const photo = await db.collection('transformation_photos').findOne({ _id: new mongoose.Types.ObjectId(photoId), userId });
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Delete the photo document
    await db.collection('transformation_photos').deleteOne({ _id: new mongoose.Types.ObjectId(photoId) });

    // Delete the file from the file system
    const filePath = path.join(__dirname, 'uploads', 'transformations', photo.filename);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
      }
    });

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a weight record for the authenticated user
app.delete('/weight', authMiddleware, async (req, res) => {
  try {
    const { date, type } = req.query;
    const userId = req.user.id;
    
    console.log('Delete weight request:', { userId, date, type });

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: date'
      });
    }

    // Find the weight record
    const weight = await Weight.findOne({ 
      userId,
      date: new Date(date)
    });

    console.log('Found weight record:', weight);

    if (!weight) {
      return res.status(404).json({
        success: false,
        message: 'Weight record not found'
      });
    }

    // If type is specified (morning/night), only clear that value
    if (type === 'morning' || type === 'night') {
      const updateField = type === 'morning' ? 'morningWeight' : 'nightWeight';
      const oldValue = weight[updateField];
      weight[updateField] = null;
      
      console.log(`Updating ${type} weight from ${oldValue} to null`);
      
      // If both weights are null after update, delete the record
      if (!weight.morningWeight && !weight.nightWeight) {
        console.log('Both weights are null, deleting entire record');
        await Weight.findByIdAndDelete(weight._id);
      } else {
        console.log('Saving updated weight record');
        await weight.save();
      }
    } else {
      // If no type specified, delete the entire record
      console.log('Deleting entire weight record');
      await Weight.findByIdAndDelete(weight._id);
    }

    // Update BMI if height exists
    const metrics = await HealthMetrics.findOne({ userId });
    if (metrics && metrics.height) {
      const latestWeight = await Weight.findOne({ userId }).sort({ date: -1 });
      if (latestWeight) {
        const heightInMeters = metrics.height / 100;
        const currentWeight = latestWeight.nightWeight || latestWeight.morningWeight;
        const bmi = (currentWeight / (heightInMeters * heightInMeters)).toFixed(2);
        metrics.bmi = bmi;
        await metrics.save();
      } else {
        metrics.bmi = null;
        await metrics.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Weight record updated successfully',
      deletedWeight: {
        date: weight.date,
        morningWeight: weight.morningWeight,
        nightWeight: weight.nightWeight
      }
    });
  } catch (error) {
    console.error('Error in weight deletion:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
