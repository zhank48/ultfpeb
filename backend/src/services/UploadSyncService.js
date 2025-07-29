import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';

export class UploadSyncService {
  static async syncFile(filePath) {
    try {
      // Extract relative path from backend/uploads/
      const relativePath = filePath.replace(/^.*backend\/uploads\//, '');
      const targetPath = path.join(process.cwd(), '..', 'uploads', relativePath);
      
      // Ensure target directory exists
      await fs.ensureDir(path.dirname(targetPath));
      
      // Copy file to target directory
      await fs.copy(path.join(process.cwd(), 'uploads', relativePath), targetPath);
      
      console.log(`✅ File synced: ${relativePath}`);
      return true;
    } catch (error) {
      console.error('Failed to sync file:', error);
      return false;
    }
  }
  
  static async syncAllUploads() {
    try {
      execSync('/var/www/ult-fpeb-visitor-management/sync-uploads.sh', { 
        stdio: 'inherit' 
      });
      return true;
    } catch (error) {
      console.error('Failed to sync uploads:', error);
      return false;
    }
  }
}
