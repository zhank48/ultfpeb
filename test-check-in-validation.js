// Test script untuk memverifikasi validasi check-in
// Usage: node test-check-in-validation.js

const API_BASE = 'http://localhost:3001/api';

// Test data tanpa foto dan signature
const testData = {
  name: 'Test User',
  phone: '081234567890',
  email: 'test@example.com',
  institution: 'Test University',
  purpose: 'Test Purpose',
  unit: 'Test Unit',
  person_to_meet: 'Test Person'
};

// Test data dengan foto dan signature kosong
const testDataWithEmpty = {
  ...testData,
  photo: '',
  signature: ''
};

// Test data dengan foto dan signature null
const testDataWithNull = {
  ...testData,
  photo: null,
  signature: null
};

async function testCheckIn(data, testName) {
  try {
    console.log(`\n=== Testing: ${testName} ===`);
    console.log('Data:', Object.keys(data).map(key => `${key}: ${typeof data[key]}`));
    
    // Get auth token first
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@ultfpeb.upi.edu',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }
    
    const loginResult = await loginResponse.json();
    const token = loginResult.data.token;
    
    // Test check-in
    const response = await fetch(`${API_BASE}/visitors/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ SUCCESS:', result.message);
      console.log('Visitor ID:', result.data?.visitor?.id);
    } else {
      console.log('❌ FAILED:', result.message);
      console.log('Errors:', result.errors);
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Testing Check-in Validation');
  console.log('===============================');
  
  // Test 1: Without photo and signature fields
  await testCheckIn(testData, 'No photo/signature fields');
  
  // Test 2: With empty photo and signature
  await testCheckIn(testDataWithEmpty, 'Empty photo/signature');
  
  // Test 3: With null photo and signature
  await testCheckIn(testDataWithNull, 'Null photo/signature');
  
  console.log('\n🏁 Testing completed');
}

// Run tests
runTests();