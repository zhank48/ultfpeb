import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';

export class AvatarGenerator {
  static generateInitialsAvatar(name, size = 200, backgroundColor = null) {
    // Create canvas
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Get initials (first letters of first and last name)
    const initials = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');

    // Generate background color based on name if not provided
    if (!backgroundColor) {
      const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
      ];
      
      // Use name to generate consistent color
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      backgroundColor = colors[Math.abs(hash) % colors.length];
    }

    // Draw background circle
    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
    ctx.fill();

    // Draw initials
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${size * 0.4}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, size / 2, size / 2);

    return canvas;
  }

  static async saveAvatarToFile(name, filePath, size = 200) {
    try {
      const canvas = this.generateInitialsAvatar(name, size);
      const buffer = canvas.toBuffer('image/png');
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, buffer);
      return filePath;
    } catch (error) {
      console.error('Error generating avatar:', error);
      throw error;
    }
  }

  static async generateUserAvatar(user, outputPath) {
    const fileName = `avatar_${user.id}_${user.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    const filePath = path.join(outputPath, fileName);
    
    await this.saveAvatarToFile(user.name, filePath);
    return fileName;
  }
}