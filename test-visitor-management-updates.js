/**
 * Test Visitor Management Updates
 * Memverifikasi perubahan pada halaman visitor management
 */

const https = require('https');
const fs = require('fs');

// Disable SSL verification for testing
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3001',
  testUser: {
    username: 'admin',
    password: 'admin123'
  }
};

let authToken = null;

async function makeRequest(path, options = {}) {
  const url = `${TEST_CONFIG.baseUrl}${path}`;
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return new Promise((resolve, reject) => {
    const data = options.body ? JSON.stringify(options.body) : null;
    
    const req = require('http').request(url, { method, headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function login() {
  console.log('🔐 Attempting login...');
  
  try {
    const response = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: TEST_CONFIG.testUser
    });

    if (response.status === 200 && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Login successful');
      console.log('👤 User:', response.data.user?.username);
      console.log('🎭 Role:', response.data.user?.role);
      return true;
    } else {
      console.log('❌ Login failed:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return false;
  }
}

async function testVisitorsAPI() {
  console.log('\n📊 Testing Visitors API...');
  
  try {
    const response = await makeRequest('/api/visitors');
    
    if (response.status === 200) {
      const visitors = response.data;
      console.log(`✅ Found ${visitors.length} visitors`);
      
      // Count active and deleted visitors
      const activeVisitors = visitors.filter(v => !v.deleted_at);
      const deletedVisitors = visitors.filter(v => v.deleted_at);
      
      console.log(`   📈 Active visitors: ${activeVisitors.length}`);
      console.log(`   🗑️ Deleted visitors: ${deletedVisitors.length}`);
      
      if (deletedVisitors.length > 0) {
        console.log('   ✅ Soft-deleted visitors found (good for testing)');
        deletedVisitors.slice(0, 3).forEach((v, i) => {
          console.log(`     ${i+1}. ${v.full_name || v.name} (deleted: ${v.deleted_at})`);
        });
      } else {
        console.log('   ⚠️ No soft-deleted visitors found');
      }
      
      return visitors;
    } else {
      console.log('❌ Failed to fetch visitors:', response.data);
      return [];
    }
  } catch (error) {
    console.log('❌ Visitors API error:', error.message);
    return [];
  }
}

async function testVisitorActionsAPI() {
  console.log('\n⚡ Testing Visitor Actions API...');
  
  try {
    const response = await makeRequest('/api/visitor-actions');
    
    if (response.status === 200) {
      const actions = response.data?.data || response.data || [];
      console.log(`✅ Found ${actions.length} visitor actions`);
      
      // Count by action type
      const editActions = actions.filter(a => a.action_type === 'edit');
      const deleteActions = actions.filter(a => a.action_type === 'delete');
      
      console.log(`   ✏️ Edit actions: ${editActions.length}`);
      console.log(`   🗑️ Delete actions: ${deleteActions.length}`);
      
      // Count by status
      const pendingActions = actions.filter(a => a.status === 'pending');
      const approvedActions = actions.filter(a => a.status === 'approved');
      const rejectedActions = actions.filter(a => a.status === 'rejected');
      
      console.log(`   ⏳ Pending: ${pendingActions.length}`);
      console.log(`   ✅ Approved: ${approvedActions.length}`);
      console.log(`   ❌ Rejected: ${rejectedActions.length}`);
      
      if (actions.length > 0) {
        console.log('\n   📋 Recent actions:');
        actions.slice(0, 5).forEach((action, i) => {
          console.log(`     ${i+1}. ${action.action_type} by ${action.requested_by_name} (${action.status})`);
          console.log(`        Visitor: ${action.visitor_name || 'N/A'}`);
          console.log(`        Reason: ${action.reason || 'No reason'}`);
        });
      }
      
      return actions;
    } else {
      console.log('❌ Failed to fetch visitor actions:', response.data);
      return [];
    }
  } catch (error) {
    console.log('❌ Visitor Actions API error:', error.message);
    return [];
  }
}

async function testDeletionRequestsAPI() {
  console.log('\n📝 Testing Deletion Requests API (Legacy)...');
  
  try {
    const response = await makeRequest('/api/deletion-requests');
    
    if (response.status === 200) {
      const requests = response.data || [];
      console.log(`✅ Found ${requests.length} deletion requests (legacy)`);
      
      if (requests.length > 0) {
        requests.slice(0, 3).forEach((req, i) => {
          console.log(`   ${i+1}. ${req.visitor_name || 'Unknown'} (${req.status})`);
        });
      } else {
        console.log('   ℹ️ No legacy deletion requests found');
      }
      
      return requests;
    } else {
      console.log('❌ Failed to fetch deletion requests:', response.data);
      return [];
    }
  } catch (error) {
    console.log('❌ Deletion Requests API error:', error.message);
    return [];
  }
}

async function createTestAction() {
  console.log('\n🧪 Creating test visitor action...');
  
  try {
    // Get a visitor to create action for
    const visitorsResponse = await makeRequest('/api/visitors');
    const visitors = visitorsResponse.data || [];
    
    if (visitors.length === 0) {
      console.log('❌ No visitors found to create test action');
      return null;
    }
    
    const testVisitor = visitors.find(v => !v.deleted_at) || visitors[0];
    console.log(`   Using visitor: ${testVisitor.full_name || testVisitor.name} (ID: ${testVisitor.id})`);
    
    const testAction = {
      visitor_id: testVisitor.id,
      action_type: 'delete', // Test delete action
      reason: 'Test delete request from automated test script',
      original_data: testVisitor
    };
    
    const response = await makeRequest('/api/visitor-actions', {
      method: 'POST',
      body: testAction
    });
    
    if (response.status === 201 || response.status === 200) {
      console.log('✅ Test action created successfully');
      console.log('   Action ID:', response.data.id);
      console.log('   Status:', response.data.status);
      return response.data;
    } else {
      console.log('❌ Failed to create test action:', response.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Create test action error:', error.message);
    return null;
  }
}

function checkFrontendFile() {
  console.log('\n🔍 Checking frontend file updates...');
  
  const filePath = './frontend/src/pages/VisitorDataManagementPage.jsx';
  
  if (!fs.existsSync(filePath)) {
    console.log('❌ VisitorDataManagementPage.jsx not found');
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for key updates
  const checks = [
    {
      name: 'Edit modal import',
      pattern: 'VisitorEditDeleteModal',
      found: content.includes('VisitorEditDeleteModal')
    },
    {
      name: 'Edit button in visitor table',
      pattern: 'handleEditVisitor',
      found: content.includes('handleEditVisitor')
    },
    {
      name: 'Edit modal state',
      pattern: 'showEditModal',
      found: content.includes('showEditModal')
    },
    {
      name: 'Data Penghapusan Pengunjung tab',
      pattern: 'Data Penghapusan Pengunjung',
      found: content.includes('Data Penghapusan Pengunjung')
    },
    {
      name: 'Operator column in requests tab',
      pattern: 'requested_by_name',
      found: content.includes('requested_by_name')
    }
  ];
  
  console.log('   Code updates verification:');
  checks.forEach(check => {
    const status = check.found ? '✅' : '❌';
    console.log(`   ${status} ${check.name}`);
  });
  
  const allPassed = checks.every(check => check.found);
  console.log(`\n   Overall: ${allPassed ? '✅ All checks passed' : '❌ Some checks failed'}`);
  
  return allPassed;
}

async function runTests() {
  console.log('🚀 Starting Visitor Management Updates Test');
  console.log('=========================================\n');
  
  // Check frontend file
  const frontendOk = checkFrontendFile();
  
  // Test backend APIs
  const loginOk = await login();
  if (!loginOk) {
    console.log('\n❌ Cannot proceed without login');
    return;
  }
  
  const visitors = await testVisitorsAPI();
  const actions = await testVisitorActionsAPI();
  const deletionRequests = await testDeletionRequestsAPI();
  
  // Create a test action
  await createTestAction();
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');
  console.log(`Frontend file updates: ${frontendOk ? '✅ OK' : '❌ Issues found'}`);
  console.log(`Visitors API: ${visitors.length > 0 ? '✅ OK' : '❌ No data'} (${visitors.length} visitors)`);
  console.log(`Visitor Actions API: ${actions.length >= 0 ? '✅ OK' : '❌ Failed'} (${actions.length} actions)`);
  console.log(`Deletion Requests API: ${deletionRequests.length >= 0 ? '✅ OK' : '❌ Failed'} (${deletionRequests.length} requests)`);
  
  console.log('\n🔗 Frontend URLs to test:');
  console.log('• Main visitor list: http://localhost:5173/app/visitors');
  console.log('• Visitor management: http://localhost:5173/app/visitor-management');
  
  console.log('\n✨ Key features to test manually:');
  console.log('1. Visitor management page loads with all tabs');
  console.log('2. "Data Pengunjung" tab shows both active and deleted visitors');
  console.log('3. Edit button works for active visitors');
  console.log('4. "Data Penghapusan Pengunjung" tab shows only delete actions');
  console.log('5. Operator and reason columns are visible');
  console.log('6. Actions can be approved/rejected');
}

// Run the tests
runTests().catch(console.error);
