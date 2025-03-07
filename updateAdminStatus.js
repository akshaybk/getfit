require('dotenv').config();
const mongoose = require('mongoose');
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

async function listAllUsers() {
  try {
    const users = await User.find({}, 'name email isAdmin');
    console.log('\nCurrent Users:');
    console.log('-------------------------------------');
    users.forEach(user => {
      console.log(`${user.name} (${user.email}) - Admin: ${user.isAdmin ? 'Yes' : 'No'}`);
    });
    console.log('-------------------------------------\n');
  } catch (error) {
    console.error('Error listing users:', error);
  }
}

async function updateAdminStatus(email, setAdmin) {
  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`\nNo user found with email: ${email}`);
      process.exit(1);
    }
    
    user.isAdmin = setAdmin;
    await user.save();
    
    console.log(`\nUser ${email} admin status updated to: ${setAdmin ? 'Admin' : 'Regular User'}`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating user:', error);
    process.exit(1);
  }
}

// Start the process
(async function() {
  await listAllUsers();
  
  rl.question('Enter user email to update: ', (email) => {
    rl.question('Make admin? (yes/no): ', (response) => {
      const setAdmin = response.toLowerCase() === 'yes';
      updateAdminStatus(email, setAdmin);
      rl.close();
    });
  });
})();

// Handle readline close
rl.on('close', () => {
  console.log('\nExiting admin update script.');
}); 