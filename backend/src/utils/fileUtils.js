import fs from 'fs-extra';
import path from 'path';

export class FileUtils {
  static async saveBase64Image(base64Data, fileName, directory = 'uploads') {
    try {
      // Remove data URL prefix (data:image/png;base64,)
      const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Create directory path - use the project uploads directory
      const currentDir = process.cwd();
      const backendDir = currentDir.includes('backend') ? currentDir : path.join(currentDir, 'backend');
      const uploadDir = path.join(backendDir, directory);
      await fs.ensureDir(uploadDir);
      
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${fileName}`;
      const filePath = path.join(uploadDir, uniqueFileName);
      
      // Save base64 to file
      await fs.writeFile(filePath, base64Image, 'base64');
      
      // Verify file was created successfully
      if (!(await fs.pathExists(filePath))) {
        throw new Error('File was not created successfully');
      }
      
      console.log(`✅ Image saved successfully: ${uniqueFileName}`);
      
      return {
        fileName: uniqueFileName,
        filePath: filePath,
        relativePath: `${directory}/${uniqueFileName}`
      };
    } catch (error) {
      console.error(`❌ Failed to save image ${fileName}:`, error.message);
      throw new Error(`Failed to save image: ${error.message}`);
    }
  }

  static async deleteFile(filePath) {
    try {
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  static getImageUrl(relativePath, baseUrl = 'http://localhost:3001') {
    if (!relativePath) return null;
    return `${baseUrl}/${relativePath}`;
  }
}
