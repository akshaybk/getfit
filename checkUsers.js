require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bodyweight_tracker');
    console.log('MongoDB Connected');
    
    const users = await User.find({});
    console.log(`Found ${users.length} users in the database:`);
    
    users.forEach(user => {
      console.log(`- ${user.email} (Name: ${user.name}, Admin: ${user.isAdmin}, Banned: ${user.isBanned})`);
    });
    
    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkUsers(); 