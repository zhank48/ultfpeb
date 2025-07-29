import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

async function setupDatabase() {
    console.log('🔧 Setting up ULT FPEB Visitor Management Database...');
    console.log('📊 Using Laragon MySQL configuration');
    
    let connection;
    
    try {
        // Connect to MySQL server (without specifying database)
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        console.log('✅ Connected to MySQL server');

        // Create database if not exists
        const dbName = process.env.DB_NAME || 'ult_fpeb_dev';
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ Database '${dbName}' created/verified`);

        // Use the database
        await connection.query(`USE \`${dbName}\``);

        // Create users table
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('Admin', 'Receptionist', 'Manager') NOT NULL DEFAULT 'Receptionist',
                photo VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await connection.execute(createUsersTable);
        console.log('✅ Users table created/verified');

        // Create visitors table (updated schema)
        const createVisitorsTable = `
            CREATE TABLE IF NOT EXISTS visitors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                name VARCHAR(255) GENERATED ALWAYS AS (full_name) VIRTUAL,
                email VARCHAR(255) DEFAULT NULL,
                phone_number VARCHAR(20) DEFAULT NULL,
                phone VARCHAR(20) GENERATED ALWAYS AS (phone_number) VIRTUAL,
                address TEXT DEFAULT NULL,
                institution VARCHAR(255) DEFAULT NULL,
                organization VARCHAR(255) GENERATED ALWAYS AS (institution) VIRTUAL,
                purpose TEXT DEFAULT NULL,
                person_to_meet VARCHAR(255) DEFAULT NULL,
                unit VARCHAR(255) DEFAULT NULL,
                location VARCHAR(255) GENERATED ALWAYS AS (unit) VIRTUAL,
                id_number VARCHAR(50) DEFAULT NULL,
                id_type VARCHAR(50) DEFAULT NULL COMMENT 'Type of identity document (KTP, SIM, Passport, etc.)',
                ktm_number VARCHAR(50) GENERATED ALWAYS AS (id_number) VIRTUAL,
                document_type VARCHAR(50) DEFAULT NULL,
                photo_url VARCHAR(255) DEFAULT NULL,
                photo VARCHAR(255) GENERATED ALWAYS AS (photo_url) VIRTUAL,
                avatar_url VARCHAR(255) DEFAULT NULL,
                signature_url VARCHAR(255) DEFAULT NULL,
                signature VARCHAR(255) GENERATED ALWAYS AS (signature_url) VIRTUAL,
                check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                check_out_time TIMESTAMP NULL DEFAULT NULL,
                input_by_user_id INT DEFAULT NULL,
                input_by_name VARCHAR(255) DEFAULT NULL,
                operator_name VARCHAR(255) GENERATED ALWAYS AS (input_by_name) VIRTUAL,
                input_by_avatar VARCHAR(255) DEFAULT NULL,
                operator_avatar VARCHAR(255) GENERATED ALWAYS AS (input_by_avatar) VIRTUAL,
                checkout_by_user_id INT DEFAULT NULL,
                checkout_by_name VARCHAR(255) DEFAULT NULL,
                checkout_operator_name VARCHAR(255) GENERATED ALWAYS AS (checkout_by_name) VIRTUAL,
                checkout_by_avatar VARCHAR(255) DEFAULT NULL,
                check_out_operator VARCHAR(255) GENERATED ALWAYS AS (checkout_by_name) VIRTUAL,
                status ENUM('checked_in', 'checked_out') DEFAULT 'checked_in',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL DEFAULT NULL,
                deleted_by INT DEFAULT NULL,
                
                INDEX idx_full_name (full_name),
                INDEX idx_phone_number (phone_number),
                INDEX idx_institution (institution),
                INDEX idx_check_in_time (check_in_time),
                INDEX idx_status (status),
                INDEX idx_deleted_at (deleted_at),
                
                FOREIGN KEY (input_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (checkout_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await connection.execute(createVisitorsTable);
        console.log('✅ Visitors table created/verified');

        // Create visitor_actions table for edit/delete requests
        const createVisitorActionsTable = `
            CREATE TABLE IF NOT EXISTS visitor_actions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                visitor_id INT NOT NULL,
                action_type ENUM('edit', 'delete') NOT NULL,
                reason TEXT NOT NULL,
                original_data JSON NULL,
                proposed_data JSON NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                requested_by INT NOT NULL,
                requested_by_name VARCHAR(255) NOT NULL,
                requested_by_role VARCHAR(50) NOT NULL,
                processed_by INT NULL,
                processed_by_name VARCHAR(255) NULL,
                processed_at TIMESTAMP NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX idx_visitor_id (visitor_id),
                INDEX idx_action_type (action_type),
                INDEX idx_status (status),
                INDEX idx_requested_by (requested_by),
                INDEX idx_created_at (created_at),
                
                FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
                FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await connection.execute(createVisitorActionsTable);
        console.log('✅ Visitor actions table created/verified');

        // Create deletion_requests table
        const createDeletionRequestsTable = `
            CREATE TABLE IF NOT EXISTS deletion_requests (
                id INT PRIMARY KEY AUTO_INCREMENT,
                visitor_id INT NOT NULL,
                requested_by INT NOT NULL,
                reason TEXT NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                approved_by INT NULL,
                approved_at TIMESTAMP NULL,
                rejected_by INT NULL,
                rejected_at TIMESTAMP NULL,
                rejection_reason TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL DEFAULT NULL,
                
                INDEX idx_visitor_id (visitor_id),
                INDEX idx_status (status),
                INDEX idx_requested_by (requested_by),
                INDEX idx_created_at (created_at),
                INDEX idx_deleted_at (deleted_at),
                
                FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
                FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (rejected_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await connection.execute(createDeletionRequestsTable);
        console.log('✅ Deletion requests table created/verified');

        // Create deletion_audit_logs table
        const createDeletionAuditLogsTable = `
            CREATE TABLE IF NOT EXISTS deletion_audit_logs (
                id INT PRIMARY KEY AUTO_INCREMENT,
                deletion_request_id INT NULL,
                visitor_id INT NULL,
                action VARCHAR(50) NOT NULL,
                performed_by INT NOT NULL,
                reason TEXT NULL,
                action_details JSON NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                INDEX idx_deletion_request_id (deletion_request_id),
                INDEX idx_visitor_id (visitor_id),
                INDEX idx_performed_by (performed_by),
                INDEX idx_created_at (created_at),
                
                FOREIGN KEY (deletion_request_id) REFERENCES deletion_requests(id) ON DELETE CASCADE,
                FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
                FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await connection.execute(createDeletionAuditLogsTable);
        console.log('✅ Deletion audit logs table created/verified');

        // Create configurations table for dropdown options
        const createConfigurationsTable = `
            CREATE TABLE IF NOT EXISTS configurations (
                id INT PRIMARY KEY AUTO_INCREMENT,
                type ENUM('purpose', 'unit', 'person_to_meet') NOT NULL,
                name VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX idx_type (type),
                INDEX idx_is_active (is_active),
                INDEX idx_sort_order (sort_order)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await connection.execute(createConfigurationsTable);
        console.log('✅ Configurations table created/verified');

        // Insert default configuration data
        try {
            const defaultConfigs = [
                // Purposes
                ['purpose', 'Konsultasi Akademik', 1, 1],
                ['purpose', 'Pengajuan Berkas', 1, 2],
                ['purpose', 'Informasi Program Studi', 1, 3],
                ['purpose', 'Konsultasi Skripsi', 1, 4],
                ['purpose', 'Konsultasi Tesis', 1, 5],
                ['purpose', 'Meeting/Rapat', 1, 6],
                ['purpose', 'Kunjungan Resmi', 1, 7],
                ['purpose', 'Lainnya', 1, 8],
                
                // Units
                ['unit', 'Dekan FPEB', 1, 1],
                ['unit', 'Wakil Dekan I', 1, 2],
                ['unit', 'Wakil Dekan II', 1, 3],
                ['unit', 'Wakil Dekan III', 1, 4],
                ['unit', 'Prodi S1 Pendidikan Ekonomi', 1, 5],
                ['unit', 'Prodi S1 Pendidikan Bisnis', 1, 6],
                ['unit', 'Prodi S1 Pendidikan Akuntansi', 1, 7],
                ['unit', 'Prodi S1 Pendidikan Manajemen Perkantoran', 1, 8],
                ['unit', 'Prodi S1 Ilmu Ekonomi dan Keuangan Islam', 1, 9],
                ['unit', 'Prodi S2 Pendidikan Ekonomi', 1, 10],
                ['unit', 'Unit Layanan Terpadu (ULT)', 1, 11],
                
                // Person to meet
                ['person_to_meet', 'Prof. Dr. Hj. Nani Sutarni, M.Pd. (Dekan)', 1, 1],
                ['person_to_meet', 'Dr. Hj. Kurjono, M.Pd. (Wakil Dekan I)', 1, 2],
                ['person_to_meet', 'Dr. Rasto, M.Pd. (Wakil Dekan II)', 1, 3],
                ['person_to_meet', 'Dr. Hj. Lisan Sulastri, M.M. (Wakil Dekan III)', 1, 4],
                ['person_to_meet', 'Staff ULT FPEB', 1, 5],
                ['person_to_meet', 'Dosen Program Studi', 1, 6],
                ['person_to_meet', 'Staff Administrasi', 1, 7]
            ];

            for (const [type, name, is_active, sort_order] of defaultConfigs) {
                try {
                    const [existing] = await connection.execute(
                        'SELECT id FROM configurations WHERE type = ? AND name = ?',
                        [type, name]
                    );
                    
                    if (existing.length === 0) {
                        await connection.execute(
                            'INSERT INTO configurations (type, name, is_active, sort_order) VALUES (?, ?, ?, ?)',
                            [type, name, is_active, sort_order]
                        );
                    }
                } catch (configError) {
                    console.log(`⚠️  Skipping config insert for ${type}: ${name} - ${configError.message}`);
                }
            }
            console.log('✅ Default configuration data inserted/verified');
        } catch (configError) {
            console.log(`⚠️  Configuration data setup skipped: ${configError.message}`);
        }

        // Create default admin user
        const adminEmail = 'admin@ultfpeb.upi.edu';
        const adminPassword = await bcrypt.hash('admin123', 10);
        
        const [existingAdmin] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [adminEmail]
        );

        if (existingAdmin.length === 0) {
            await connection.execute(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Administrator', adminEmail, adminPassword, 'Admin']
            );
            console.log('✅ Default admin user created');
            console.log(`   📧 Email: ${adminEmail}`);
            console.log('   🔑 Password: admin123');
        } else {
            console.log('ℹ️  Admin user already exists');
        }

        // Create default receptionist user
        const receptionistEmail = 'receptionist@ultfpeb.upi.edu';
        const receptionistPassword = await bcrypt.hash('receptionist123', 10);
        
        const [existingReceptionist] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [receptionistEmail]
        );

        if (existingReceptionist.length === 0) {
            await connection.execute(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Receptionist', receptionistEmail, receptionistPassword, 'Receptionist']
            );
            console.log('✅ Default receptionist user created');
            console.log(`   📧 Email: ${receptionistEmail}`);
            console.log('   🔑 Password: receptionist123');
        } else {
            console.log('ℹ️  Receptionist user already exists');
        }

        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n📋 Default Login Credentials:');
        console.log('   👨‍💼 Admin: admin@ultfpeb.upi.edu / admin123');
        console.log('   👩‍💻 Receptionist: receptionist@ultfpeb.upi.edu / receptionist123');

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run setup
setupDatabase()
    .then(() => {
        console.log('✅ Setup completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    });