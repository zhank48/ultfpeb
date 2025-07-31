import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

class AdminSeeder {
  constructor() {
    this.connection = null;
    this.dbName = process.env.DB_NAME || 'ult_fpeb_dev';
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: this.dbName
      });
      console.log('✅ Connected to database');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async seedAdminUsers() {
    console.log('🌱 Seeding admin users...');

    const adminUsers = [
      {
        name: 'Administrator ULT FPEB',
        email: 'admin@ultfpeb.upi.edu', 
        password: 'admin123',
        role: 'Admin'
      },
    ];

    for (const userData of adminUsers) {
      try {
        // Check if user already exists
        const [existingUser] = await this.connection.execute(
          'SELECT id, email, role FROM users WHERE email = ?',
          [userData.email]
        );

        if (existingUser.length > 0) {
          console.log(`ℹ️  User ${userData.email} already exists with role: ${existingUser[0].role}`);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // Insert new user
        const [result] = await this.connection.execute(
          'INSERT INTO users (name, email, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
          [userData.name, userData.email, hashedPassword, userData.role]
        );

        console.log(`✅ Created ${userData.role}: ${userData.email}`);
        console.log(`   👤 Name: ${userData.name}`);
        console.log(`   🔑 Password: ${userData.password}`);
        console.log(`   🆔 User ID: ${result.insertId}`);
        console.log('');

      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }
  }

  async seedMenuItems() {
    console.log('🌱 Seeding menu items...');

    const menuItems = [
      {
        name: 'Dashboard',
        href: '/app/dashboard',
        icon: 'cilSpeedometer',
        roles: ['Admin', 'Manager', 'Receptionist', 'Operator'],
        sort_order: 1
      },
      {
        name: 'Visitor Management',
        href: '/app/visitors',
        icon: 'cilPeople',
        roles: ['Admin', 'Manager', 'Receptionist', 'Operator'],
        sort_order: 2
      },
      {
        name: 'Check In',
        href: '/app/checkin',
        icon: 'cilUserPlus',
        roles: ['Admin', 'Receptionist', 'Operator'],
        sort_order: 3
      },
      {
        name: 'Lost & Found',
        href: '/app/lost-items',  
        icon: 'cilLocationPin',
        roles: ['Admin', 'Manager', 'Receptionist'],
        sort_order: 4
      },
      {
        name: 'Complaints',
        href: '/app/complaints',
        icon: 'cilCommentBubble',
        roles: ['Admin', 'Manager'],
        sort_order: 5
      },
      {
        name: 'Feedback',
        href: '/app/feedback',
        icon: 'cilStar',
        roles: ['Admin', 'Manager', 'Receptionist'],
        sort_order: 6
      },
      {
        name: 'System Settings',
        href: '/app/settings',
        icon: 'cilSettings',
        roles: ['Admin'],
        sort_order: 7
      }
    ];

    for (const menuItem of menuItems) {
      try {
        const [existing] = await this.connection.execute(
          'SELECT id FROM menu_items WHERE href = ?',
          [menuItem.href]
        );

        if (existing.length > 0) {
          console.log(`ℹ️  Menu item ${menuItem.name} already exists`);
          continue;
        }

        await this.connection.execute(
          'INSERT INTO menu_items (name, href, icon, roles, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())',
          [menuItem.name, menuItem.href, menuItem.icon, JSON.stringify(menuItem.roles), menuItem.sort_order]
        );

        console.log(`✅ Created menu item: ${menuItem.name}`);

      } catch (error) {
        console.error(`❌ Error creating menu item ${menuItem.name}:`, error.message);
      }
    }
  }

  async seedInitialConfigurations() {
    console.log('🌱 Seeding initial configurations...');

    const configurations = [
      {
        config_key: 'app.name',
        config_value: 'ULT FPEB Visitor Management',
        config_type: 'string',
        description: 'Application name'
      },
      {
        config_key: 'app.version',
        config_value: '1.0.4',
        config_type: 'string', 
        description: 'Application version'
      },
      {
        config_key: 'visitor.auto_checkout_hours',
        config_value: '24',
        config_type: 'number',
        description: 'Auto checkout visitors after X hours'
      },
      {
        config_key: 'system.maintenance_mode',
        config_value: 'false',
        config_type: 'boolean',
        description: 'Enable/disable maintenance mode'
      },
      {
        config_key: 'upload.max_file_size',
        config_value: '5242880',
        config_type: 'number',
        description: 'Maximum file upload size in bytes (5MB)'
      }
    ];

    for (const config of configurations) {
      try {
        const [existing] = await this.connection.execute(
          'SELECT id FROM configurations WHERE config_key = ?',
          [config.config_key]
        );

        if (existing.length > 0) {
          console.log(`ℹ️  Configuration ${config.config_key} already exists`);
          continue;
        }

        await this.connection.execute(
          'INSERT INTO configurations (config_key, config_value, config_type, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, NOW(), NOW())',
          [config.config_key, config.config_value, config.config_type, config.description]
        );

        console.log(`✅ Created configuration: ${config.config_key}`);

      } catch (error) {
        console.error(`❌ Error creating configuration ${config.config_key}:`, error.message);
      }
    }
  }

  async displayUserSummary() {
    console.log('\n📊 USER SUMMARY');
    console.log('=' .repeat(50));

    try {
      const [users] = await this.connection.execute(
        'SELECT id, name, email, role, created_at FROM users ORDER BY role, name'
      );

      if (users.length === 0) {
        console.log('❌ No users found in database');
        return;
      }

      const roleGroups = {};
      users.forEach(user => {
        if (!roleGroups[user.role]) {
          roleGroups[user.role] = [];
        }
        roleGroups[user.role].push(user);
      });

      Object.keys(roleGroups).forEach(role => {
        console.log(`\n👥 ${role.toUpperCase()}S:`);
        roleGroups[role].forEach(user => {
          console.log(`   ${user.id}. ${user.name} (${user.email})`);
        });
      });

      console.log(`\n📈 Total Users: ${users.length}`);

    } catch (error) {
      console.error('❌ Error fetching user summary:', error.message);
    }
  }

  async close() {
    if (this.connection) {
      await this.connection.end();
      console.log('✅ Database connection closed');
    }
  }

  async seed() {
    try {
      console.log('🚀 Starting admin user seeding...');
      console.log('=' .repeat(50));
      
      await this.connect();
      await this.seedAdminUsers();
      await this.seedMenuItems();
      await this.seedInitialConfigurations();
      await this.displayUserSummary();
      
      console.log('\n' + '=' .repeat(50));
      console.log('🎉 Admin seeding completed successfully!');
      console.log('\n📋 Login Credentials:');
      console.log('   🔐 Super Admin: superadmin@ultfpeb.upi.edu / superadmin123');
      console.log('   👨‍💼 Admin: admin@ultfpeb.upi.edu / admin123');
      console.log('   👔 Manager: manager@ultfpeb.upi.edu / manager123');
      console.log('   👩‍💻 Receptionist: receptionist@ultfpeb.upi.edu / receptionist123');
      console.log('   ⚙️  Operator: operator@ultfpeb.upi.edu / operator123');
      
    } catch (error) {
      console.error('❌ Seeding failed:', error.message);
      throw error;
    } finally {
      await this.close();
    }
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const seeder = new AdminSeeder();
  seeder.seed()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export default AdminSeeder;