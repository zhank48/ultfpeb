import db from '../config/database.js';
import { AvatarGenerator } from '../utils/avatarGenerator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateAvatarsForUsers() {
  try {
    console.log('🎨 Starting avatar generation for users without photos...');

    // Get all users without avatar_url
    const [users] = await db.execute(
      'SELECT id, name, email, role FROM users WHERE avatar_url IS NULL OR avatar_url = ""'
    );

    console.log(`Found ${users.length} users without profile photos`);

    const uploadsDir = path.join(__dirname, '../../uploads/profiles');
    
    for (const user of users) {
      try {
        console.log(`Generating avatar for: ${user.name} (ID: ${user.id})`);
        
        // Generate unique avatar based on user name
        const fileName = await AvatarGenerator.generateUserAvatar(user, uploadsDir);
        const avatarPath = `uploads/profiles/${fileName}`;
        
        // Update user record with new avatar path
        await db.execute(
          'UPDATE users SET avatar_url = ? WHERE id = ?',
          [avatarPath, user.id]
        );
        
        console.log(`✅ Generated avatar for ${user.name}: ${fileName}`);
      } catch (error) {
        console.error(`❌ Failed to generate avatar for ${user.name}:`, error.message);
      }
    }

    console.log('🎉 Avatar generation completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error generating avatars:', error);
    process.exit(1);
  }
}

generateAvatarsForUsers();