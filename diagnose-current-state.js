const mysql = require('mysql2/promise');

async function diagnoseCurrentState() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'ult_fpeb_dev'
    });

    console.log('🔍 CURRENT SYSTEM STATE DIAGNOSIS');
    console.log('==================================\n');

    // 1. Check visitors table
    console.log('1️⃣ VISITORS TABLE:');
    const [visitors] = await connection.execute(`
      SELECT id, nama, is_deleted, created_at 
      FROM visitors 
      ORDER BY id
    `);
    
    console.log(`   Total visitors: ${visitors.length}`);
    if (visitors.length > 0) {
      console.log('   Visitor details:');
      visitors.forEach(v => {
        const status = v.is_deleted ? '❌ DELETED' : '✅ ACTIVE';
        console.log(`     ID ${v.id}: ${v.nama} - ${status}`);
      });
    } else {
      console.log('   ⚠️  No visitors found in database!');
    }

    // 2. Check visitor_actions table
    console.log('\n2️⃣ VISITOR ACTIONS TABLE:');
    const [actions] = await connection.execute(`
      SELECT id, visitor_id, action_type, status, operator, reason, created_at
      FROM visitor_actions 
      ORDER BY id
    `);
    
    console.log(`   Total actions: ${actions.length}`);
    if (actions.length > 0) {
      console.log('   Action details:');
      actions.forEach(a => {
        console.log(`     Action ${a.id}: Visitor ${a.visitor_id} - ${a.action_type} (${a.status})`);
        console.log(`       Operator: ${a.operator}, Reason: ${a.reason}`);
      });
    } else {
      console.log('   No actions found in database');
    }

    // 3. Check for orphaned actions
    console.log('\n3️⃣ ORPHANED ACTIONS CHECK:');
    const [orphaned] = await connection.execute(`
      SELECT va.id, va.visitor_id, va.action_type, va.status 
      FROM visitor_actions va 
      LEFT JOIN visitors v ON va.visitor_id = v.id 
      WHERE v.id IS NULL
    `);
    
    if (orphaned.length > 0) {
      console.log(`   ⚠️  Found ${orphaned.length} orphaned actions:`);
      orphaned.forEach(a => {
        console.log(`     Action ${a.id}: References missing visitor ${a.visitor_id} (${a.action_type})`);
      });
    } else {
      console.log('   ✅ No orphaned actions found');
    }

    // 4. Check for specific problematic visitor IDs from error logs
    console.log('\n4️⃣ CHECKING PROBLEMATIC VISITOR IDs (30, 31):');
    const problematicIds = [30, 31];
    for (const id of problematicIds) {
      const [visitor] = await connection.execute('SELECT * FROM visitors WHERE id = ?', [id]);
      const [visitorActions] = await connection.execute('SELECT * FROM visitor_actions WHERE visitor_id = ?', [id]);
      
      console.log(`   Visitor ID ${id}:`);
      if (visitor.length > 0) {
        const v = visitor[0];
        const status = v.is_deleted ? 'DELETED' : 'ACTIVE';
        console.log(`     ✅ Exists in DB: ${v.nama} (${status})`);
      } else {
        console.log(`     ❌ NOT FOUND in visitors table`);
      }
      
      if (visitorActions.length > 0) {
        console.log(`     Actions for this visitor: ${visitorActions.length}`);
        visitorActions.forEach(a => {
          console.log(`       Action ${a.id}: ${a.action_type} (${a.status})`);
        });
      } else {
        console.log(`     No actions found for visitor ${id}`);
      }
    }

    // 5. Check users table for operators
    console.log('\n5️⃣ USERS/OPERATORS CHECK:');
    try {
      const [users] = await connection.execute('SELECT id, username, role FROM users ORDER BY id');
      console.log(`   Total users: ${users.length}`);
      users.forEach(u => {
        console.log(`     User ${u.id}: ${u.username} (${u.role})`);
      });
    } catch (error) {
      console.log('   ⚠️  Error checking users table:', error.message);
    }

    console.log('\n🏁 DIAGNOSIS COMPLETE');
    console.log('===================');

  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

diagnoseCurrentState();
