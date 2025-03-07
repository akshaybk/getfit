require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createSimpleAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bodyweight_tracker');
    console.log('MongoDB Connected');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'test@admin.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log(`Email: test@admin.com`);
      console.log(`Password: password123`);
      console.log(`Admin: ${existingAdmin.isAdmin}`);
      mongoose.disconnect();
      return;
    }
    
    // Create admin user with hardcoded values
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    const adminUser = new User({
      name: 'Test Admin',
      email: 'test@admin.com',
      password: hashedPassword,
      isAdmin: true
    });
    
    await adminUser.save();
    
    console.log('Admin user created successfully');
    console.log(`Email: test@admin.com`);
    console.log(`Password: password123`);
    
    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    mongoose.disconnect();
  }
}

createSimpleAdmin(); 