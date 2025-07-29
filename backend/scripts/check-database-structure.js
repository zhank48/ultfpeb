import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkDatabaseStructure() {
    console.log('🔍 Checking Database Structure in ult-fpeb-dev...');
    
    let connection;
    
    try {
        // Connect to database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'ult-fpeb-dev'
        });

        console.log(`✅ Connected to database: ${process.env.DB_NAME || 'ult-fpeb-dev'}`);

        // Check if database exists and show all tables
        console.log('\n📋 CHECKING ALL TABLES:');
        const [tables] = await connection.execute('SHOW TABLES');
        
        if (tables.length === 0) {
            console.log('❌ No tables found in database!');
            return;
        }

        console.log(`✅ Found ${tables.length} tables:`);
        tables.forEach((table, index) => {
            const tableName = Object.values(table)[0];
            console.log(`   ${index + 1}. ${tableName}`);
        });

        // Check users table structure
        console.log('\n🔍 USERS TABLE STRUCTURE:');
        try {
            const [userCols] = await connection.execute('DESCRIBE users');
            userCols.forEach(col => {
                console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.Key ? `[${col.Key}]` : ''}`);
            });

            // Check user count
            const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
            console.log(`   📊 Total users: ${userCount[0].count}`);

            // Show sample users
            const [users] = await connection.execute('SELECT id, name, email, role FROM users LIMIT 3');
            console.log('   👥 Sample users:');
            users.forEach(user => {
                console.log(`      - ${user.name} (${user.email}) [${user.role}]`);
            });
        } catch (error) {
            console.log('❌ Users table error:', error.message);
        }

        // Check configurations table
        console.log('\n🔍 CONFIGURATIONS TABLE:');
        try {
            const [configTables] = await connection.execute("SHOW TABLES LIKE 'configurations'");
            if (configTables.length === 0) {
                console.log('❌ configurations table does NOT exist');
            } else {
                const [configCols] = await connection.execute('DESCRIBE configurations');
                configCols.forEach(col => {
                    console.log(`   ${col.Field}: ${col.Type}`);
                });
                const [configCount] = await connection.execute('SELECT COUNT(*) as count FROM configurations');
                console.log(`   📊 Total configurations: ${configCount[0].count}`);
            }
        } catch (error) {
            console.log('❌ Configurations table error:', error.message);
        }

        // Check feedback table
        console.log('\n🔍 FEEDBACK TABLE:');
        try {
            const [feedbackTables] = await connection.execute("SHOW TABLES LIKE 'feedback'");
            if (feedbackTables.length === 0) {
                console.log('❌ feedback table does NOT exist');
            } else {
                const [feedbackCols] = await connection.execute('DESCRIBE feedback');
                feedbackCols.forEach(col => {
                    console.log(`   ${col.Field}: ${col.Type}`);
                });
                const [feedbackCount] = await connection.execute('SELECT COUNT(*) as count FROM feedback');
                console.log(`   📊 Total feedback: ${feedbackCount[0].count}`);
            }
        } catch (error) {
            console.log('❌ Feedback table error:', error.message);
        }

        // Check complaints table
        console.log('\n🔍 COMPLAINTS TABLE:');
        try {
            const [complaintTables] = await connection.execute("SHOW TABLES LIKE 'complaints'");
            if (complaintTables.length === 0) {
                console.log('❌ complaints table does NOT exist');
            } else {
                const [complaintCols] = await connection.execute('DESCRIBE complaints');
                complaintCols.forEach(col => {
                    console.log(`   ${col.Field}: ${col.Type}`);
                });
                const [complaintCount] = await connection.execute('SELECT COUNT(*) as count FROM complaints');
                console.log(`   📊 Total complaints: ${complaintCount[0].count}`);
            }
        } catch (error) {
            console.log('❌ Complaints table error:', error.message);
        }

        // Check visitors table
        console.log('\n🔍 VISITORS TABLE:');
        try {
            const [visitorCols] = await connection.execute('DESCRIBE visitors');
            visitorCols.forEach(col => {
                console.log(`   ${col.Field}: ${col.Type}`);
            });
            const [visitorCount] = await connection.execute('SELECT COUNT(*) as count FROM visitors');
            console.log(`   📊 Total visitors: ${visitorCount[0].count}`);
        } catch (error) {
            console.log('❌ Visitors table error:', error.message);
        }

        // Check lost_items tables
        console.log('\n🔍 LOST ITEMS TABLES:');
        const lostItemsTables = ['lost_items', 'lost_item_handovers', 'lost_item_returns'];
        for (const tableName of lostItemsTables) {
            try {
                const [tableExists] = await connection.execute(`SHOW TABLES LIKE '${tableName}'`);
                if (tableExists.length === 0) {
                    console.log(`❌ ${tableName} table does NOT exist`);
                } else {
                    const [count] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
                    console.log(`✅ ${tableName}: ${count[0].count} records`);
                }
            } catch (error) {
                console.log(`❌ ${tableName} error:`, error.message);
            }
        }

        console.log('\n🎯 SUMMARY:');
        console.log('- Basic tables (users, visitors) seem to exist');
        console.log('- Need to check if configurations, feedback, complaints tables are missing');
        console.log('- Need to verify all required columns exist');

    } catch (error) {
        console.error('❌ Database check failed:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run check
checkDatabaseStructure()
    .then(() => {
        console.log('\n✅ Database structure check completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Database check failed:', error);
        process.exit(1);
    });