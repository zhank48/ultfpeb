import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function createMissingTables() {
    console.log('🔧 Creating Missing Database Tables...');
    
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'ult-fpeb-dev'
        });

        console.log(`✅ Connected to database: ${process.env.DB_NAME || 'ult-fpeb-dev'}`);

        // Create configurations table
        console.log('\n📋 Creating configurations table...');
        const createConfigurationsTable = `
            CREATE TABLE IF NOT EXISTS configurations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                config_key VARCHAR(255) UNIQUE NOT NULL,
                config_value TEXT,
                config_type ENUM('string', 'number', 'boolean', 'json', 'array') DEFAULT 'string',
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await connection.execute(createConfigurationsTable);
        console.log('✅ configurations table created');

        // Insert default configurations
        const defaultConfigs = [
            ['organization_name', 'Unit Layanan Terpadu FPEB UPI', 'string', 'Organization name'],
            ['visit_purposes', '["Konsultasi", "Pertemuan", "Pengambilan Dokumen", "Lainnya"]', 'json', 'Available visit purposes'],
            ['max_visit_duration', '480', 'number', 'Maximum visit duration in minutes'],
            ['require_photo', 'true', 'boolean', 'Require visitor photo'],
            ['require_signature', 'true', 'boolean', 'Require visitor signature']
        ];

        for (const [key, value, type, description] of defaultConfigs) {
            await connection.execute(
                'INSERT IGNORE INTO configurations (config_key, config_value, config_type, description) VALUES (?, ?, ?, ?)',
                [key, value, type, description]
            );
        }
        console.log('✅ Default configurations inserted');

        // Create feedback table (rename feedbacks to feedback for consistency)
        console.log('\n📋 Creating feedback table...');
        const createFeedbackTable = `
            CREATE TABLE IF NOT EXISTS feedback (
                id INT AUTO_INCREMENT PRIMARY KEY,
                visitor_name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(20),
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                service_type VARCHAR(255),
                feedback_text TEXT,
                suggestions TEXT,
                status ENUM('new', 'reviewed', 'responded') DEFAULT 'new',
                response_text TEXT,
                responded_by INT NULL,
                responded_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await connection.execute(createFeedbackTable);
        console.log('✅ feedback table created');

        // Create complaints table
        console.log('\n📋 Creating complaints table...');
        const createComplaintsTable = `
            CREATE TABLE IF NOT EXISTS complaints (
                id INT AUTO_INCREMENT PRIMARY KEY,
                complainant_name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(20),
                complaint_type VARCHAR(255),
                category VARCHAR(255),
                subject VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
                status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
                photos JSON,
                assigned_to INT NULL,
                resolution_notes TEXT,
                resolved_by INT NULL,
                resolved_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await connection.execute(createComplaintsTable);
        console.log('✅ complaints table created');

        // Create lost_item_handovers table
        console.log('\n📋 Creating lost_item_handovers table...');
        const createHandoversTable = `
            CREATE TABLE IF NOT EXISTS lost_item_handovers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lost_item_id INT NOT NULL,
                handover_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                handover_location VARCHAR(255),
                finder_name VARCHAR(255) NOT NULL,
                finder_contact VARCHAR(255),
                item_condition VARCHAR(255),
                photos JSON,
                additional_notes TEXT,
                received_by INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await connection.execute(createHandoversTable);
        console.log('✅ lost_item_handovers table created');

        // Create lost_item_returns table
        console.log('\n📋 Creating lost_item_returns table...');
        const createReturnsTable = `
            CREATE TABLE IF NOT EXISTS lost_item_returns (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lost_item_id INT NOT NULL,
                return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                owner_name VARCHAR(255) NOT NULL,
                owner_contact VARCHAR(255),
                identification_proof VARCHAR(255),
                verification_notes TEXT,
                return_photos JSON,
                returned_by INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await connection.execute(createReturnsTable);
        console.log('✅ lost_item_returns table created');

        // Update lost_items table structure if needed
        console.log('\n📋 Updating lost_items table structure...');
        try {
            await connection.execute(`
                ALTER TABLE lost_items 
                ADD COLUMN IF NOT EXISTS status ENUM('reported', 'found', 'returned') DEFAULT 'found',
                ADD COLUMN IF NOT EXISTS location_found VARCHAR(255),
                ADD COLUMN IF NOT EXISTS description TEXT,
                ADD COLUMN IF NOT EXISTS category VARCHAR(255)
            `);
            console.log('✅ lost_items table updated');
        } catch (error) {
            console.log('ℹ️ lost_items table already up to date');
        }

        // Check final table count
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`\n🎉 Database now has ${tables.length} tables:`);
        tables.forEach((table, index) => {
            const tableName = Object.values(table)[0];
            console.log(`   ${index + 1}. ${tableName}`);
        });

        console.log('\n✅ All missing tables created successfully!');

    } catch (error) {
        console.error('❌ Failed to create tables:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run table creation
createMissingTables()
    .then(() => {
        console.log('\n🎯 Ready to test the application!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Table creation failed:', error);
        process.exit(1);
    });