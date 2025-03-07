require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Admin credentials to create
const adminUser = {
  name: 'Admin',
  email: 'admin@example.com',
  password: 'admin123',
  isAdmin: true
};

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bodyweight_tracker');
    console.log('MongoDB Connected');

    // Check if admin already exists
    const existingUser = await User.findOne({ email: adminUser.email });
    
    if (existingUser) {
      // Update existing user to be admin
      existingUser.isAdmin = true;
      await existingUser.save();
      console.log(`User ${adminUser.email} updated to admin status`);
    } else {
      // Create new admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminUser.password, salt);
      
      const newAdmin = new User({
        name: adminUser.name,
        email: adminUser.email,
        password: hashedPassword,
        isAdmin: true
      });
      
      await newAdmin.save();
      console.log(`New admin user created: ${adminUser.email}`);
    }
    
    console.log('\nAdmin credentials:');
    console.log('--------------------------');
    console.log(`Email: ${adminUser.email}`);
    console.log(`Password: ${adminUser.password}`);
    console.log('--------------------------');
    
    mongoose.disconnect();
    console.log('MongoDB Disconnected');
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

createAdmin(); 