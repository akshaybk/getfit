require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:5000';
const adminCredentials = {
  email: 'akku@admin',  // Changed to an admin user that exists in the database
  password: 'akshay'    // Using a common password we've been using
};

async function testAdminLogin() {
  try {
    console.log(`Login attempt with admin user ${adminCredentials.email}`);
    console.log(`Sending request to: ${API_URL}/auth/login`);
    console.log('Request payload:', JSON.stringify(adminCredentials, null, 2));
    
    const response = await axios.post(`${API_URL}/auth/login`, adminCredentials);
    
    console.log('Response received:', JSON.stringify(response.data, null, 2));
    
    // Check if isAdmin property exists
    if (response.data.user && response.data.user.isAdmin !== undefined) {
      console.log(`User admin status: ${response.data.user.isAdmin}`);
    } else {
      console.error('Error: isAdmin property is missing from the response');
    }
    
  } catch (error) {
    console.error('Error logging in:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    console.error('Error config:', error.config);
  }
}

testAdminLogin(); 