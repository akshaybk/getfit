require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const User = require('./models/User');

// Configure readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/bodyweight_tracker')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

// Function to create admin user
async function createAdminUser(name, email, password) {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      if (existingUser.isAdmin) {
        console.log(`\nUser ${email} is already an admin.`);
        process.exit(0);
      } else {
        // Update existing user to admin
        existingUser.isAdmin = true;
        await existingUser.save();
        console.log(`\nUser ${email} has been upgraded to admin.`);
        process.exit(0);
      }
    } else {
      // Create new admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const adminUser = new User({
        name,
        email,
        password: hashedPassword,
        isAdmin: true
      });
      
      await adminUser.save();
      console.log(`\nAdmin user ${email} created successfully!`);
      process.exit(0);
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

// Prompt for admin user details
console.log('\n==== Create Admin User ====\n');

rl.question('Enter admin name: ', (name) => {
  rl.question('Enter admin email: ', (email) => {
    rl.question('Enter admin password: ', async (password) => {
      // Validate inputs
      if (!name || !email || !password) {
        console.error('All fields are required!');
        process.exit(1);
      }
      
      // Create admin user
      await createAdminUser(name, email, password);
      rl.close();
    });
  });
});

// Handle readline close
rl.on('close', () => {
  console.log('\nExiting admin creation script.');
}); 