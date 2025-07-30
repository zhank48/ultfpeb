// Test script untuk memverifikasi checkout dengan feedback modal
// Usage: node test-checkout-feedback.js

const API_BASE = 'http://localhost:3001/api';

async function testCheckoutFeedbackFlow() {
  try {
    console.log('🧪 Testing Checkout with Feedback Flow');
    console.log('=======================================\n');
    
    // Step 1: Login
    console.log('1️⃣ Logging in...');
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
    console.log('✅ Login successful\n');
    
    // Step 2: Create a test visitor for checkout
    console.log('2️⃣ Creating test visitor...');
    const visitorResponse = await fetch(`${API_BASE}/visitors/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Test Checkout User',
        phone: '081234567890',
        email: 'checkout@test.com',
        institution: 'Test Institution',
        purpose: 'Checkout Test',
        unit: 'Test Unit',
        person_to_meet: 'Test Person'
      })
    });
    
    if (!visitorResponse.ok) {
      throw new Error('Failed to create visitor');
    }
    
    const visitorResult = await visitorResponse.json();
    const visitorId = visitorResult.data.visitor.id;
    console.log(`✅ Test visitor created with ID: ${visitorId}\n`);
    
    // Step 3: Test checkout
    console.log('3️⃣ Testing checkout...');
    const checkoutResponse = await fetch(`${API_BASE}/visitors/${visitorId}/checkout`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        visitor_id: visitorId
      })
    });
    
    if (!checkoutResponse.ok) {
      throw new Error('Checkout failed');
    }
    
    const checkoutResult = await checkoutResponse.json();
    console.log('✅ Checkout successful');
    console.log('Visitor checkout data:', {
      id: checkoutResult.data.visitor.id,
      name: checkoutResult.data.visitor.name || checkoutResult.data.visitor.full_name,
      check_out_time: checkoutResult.data.visitor.check_out_time
    });
    console.log('\n');
    
    // Step 4: Test feedback submission
    console.log('4️⃣ Testing feedback submission...');
    const feedbackResponse = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        visitor_id: visitorId,
        visitor_name: checkoutResult.data.visitor.name || checkoutResult.data.visitor.full_name,
        rating: 5,
        category: 1, // ID for 'Pelayanan Umum'
        feedback: 'Test feedback for checkout flow - excellent service!',
        overall_satisfaction_rating: 5
      })
    });
    
    if (!feedbackResponse.ok) {
      console.log('❌ Feedback submission failed:', feedbackResponse.status, feedbackResponse.statusText);
      const errorText = await feedbackResponse.text();
      console.log('Error details:', errorText);
    } else {
      const feedbackResult = await feedbackResponse.json();
      console.log('✅ Feedback submitted successfully');
      console.log('Feedback ID:', feedbackResult.data?.id || 'N/A');
    }
    
    console.log('\n🎉 Checkout with Feedback Flow Test Completed!');
    console.log('\nWhat should happen in the UI:');
    console.log('1. User clicks checkout on visitor');
    console.log('2. Success message appears');
    console.log('3. After 1.5 seconds, feedback modal pops up automatically');
    console.log('4. User can rate and provide feedback');
    console.log('5. Modal closes after successful submission');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCheckoutFeedbackFlow();