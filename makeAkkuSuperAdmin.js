require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function makeAkkuSuperAdmin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bodyweight_tracker');
    console.log('MongoDB Connected');

    // Find the akku@admin user
    const superAdmin = await User.findOne({ email: 'akshay@admin' });
    
    if (!superAdmin) {
      console.log('Super admin user (akshay@admin) not found!');
      process.exit(1);
    }
    
    // Make akku@admin a super admin
    superAdmin.isAdmin = true;
    superAdmin.isSuperAdmin = true;
    await superAdmin.save();
    console.log(`Made ${superAdmin.email} a super admin!`);
    
    // Remove admin privileges from all other admin accounts
    const result = await User.updateMany(
      { email: { $ne: 'akshay@admin' }, isAdmin: true },
      { $set: { isAdmin: false, isSuperAdmin: false } }
    );
    
    console.log(`Removed admin privileges from ${result.modifiedCount} other accounts`);
    
    console.log('Operation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the function
makeAkkuSuperAdmin(); 