import fs from 'fs-extra';
import path from 'path';

export class FileStructureManager {
  
  /**
   * Create organized folder structure for lost items
   * Structure:
   * uploads/
   *   lost-items/
   *     handover/
   *       photos/
   *       signatures/
   *     return/
   *       photos/
   *       signatures/
   */
  static async createLostItemFolders() {
    try {
      const baseDir = path.join(process.cwd(), 'uploads', 'lost-items');
      
      const folders = [
        path.join(baseDir, 'handover', 'photos'),
        path.join(baseDir, 'handover', 'signatures'),
        path.join(baseDir, 'return', 'photos'),
        path.join(baseDir, 'return', 'signatures'),
        path.join(baseDir, 'reports')
      ];
      
      for (const folder of folders) {
        await fs.ensureDir(folder);
      }
      
      console.log('✅ Lost item folder structure created successfully');
      return baseDir;
    } catch (error) {
      console.error('❌ Error creating folder structure:', error);
      throw error;
    }
  }
  
  /**
   * Get the appropriate file path based on type
   */
  static getFilePath(type, subType, filename) {
    const baseDir = path.join(process.cwd(), 'uploads', 'lost-items');
    
    switch (type) {
      case 'handover':
        return path.join(baseDir, 'handover', subType, filename);
      case 'return':
        return path.join(baseDir, 'return', subType, filename);
      case 'reports':
        return path.join(baseDir, 'reports', filename);
      default:
        return path.join(baseDir, filename);
    }
  }
  
  /**
   * Get relative path for database storage
   */
  static getRelativePath(type, subType, filename) {
    return path.join('uploads', 'lost-items', type, subType, filename).replace(/\\/g, '/');
  }
  
  /**
   * Save handover photo
   */
  static async saveHandoverPhoto(itemId, photoData, extension = 'jpg') {
    const filename = `handover_photo_${itemId}_${Date.now()}.${extension}`;
    const filePath = this.getFilePath('handover', 'photos', filename);
    
    await fs.ensureDir(path.dirname(filePath));
    
    // Save base64 data if it's a data URL
    if (typeof photoData === 'string' && photoData.startsWith('data:')) {
      const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
      await fs.writeFile(filePath, base64Data, 'base64');
    } else {
      await fs.writeFile(filePath, photoData);
    }
    
    return {
      filename,
      filePath,
      relativePath: this.getRelativePath('handover', 'photos', filename)
    };
  }
  
  /**
   * Save handover signature
   */
  static async saveHandoverSignature(itemId, signatureData) {
    const filename = `handover_signature_${itemId}_${Date.now()}.png`;
    const filePath = this.getFilePath('handover', 'signatures', filename);
    
    await fs.ensureDir(path.dirname(filePath));
    
    // Save base64 signature data
    if (typeof signatureData === 'string' && signatureData.startsWith('data:')) {
      const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, '');
      await fs.writeFile(filePath, base64Data, 'base64');
    } else {
      await fs.writeFile(filePath, signatureData);
    }
    
    return {
      filename,
      filePath,
      relativePath: this.getRelativePath('handover', 'signatures', filename)
    };
  }
  
  /**
   * Save return photo
   */
  static async saveReturnPhoto(itemId, photoData, extension = 'jpg') {
    const filename = `return_photo_${itemId}_${Date.now()}.${extension}`;
    const filePath = this.getFilePath('return', 'photos', filename);
    
    await fs.ensureDir(path.dirname(filePath));
    
    if (typeof photoData === 'string' && photoData.startsWith('data:')) {
      const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
      await fs.writeFile(filePath, base64Data, 'base64');
    } else {
      await fs.writeFile(filePath, photoData);
    }
    
    return {
      filename,
      filePath,
      relativePath: this.getRelativePath('return', 'photos', filename)
    };
  }
  
  /**
   * Save return signature
   */
  static async saveReturnSignature(itemId, signatureData) {
    const filename = `return_signature_${itemId}_${Date.now()}.png`;
    const filePath = this.getFilePath('return', 'signatures', filename);
    
    await fs.ensureDir(path.dirname(filePath));
    
    if (typeof signatureData === 'string' && signatureData.startsWith('data:')) {
      const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, '');
      await fs.writeFile(filePath, base64Data, 'base64');
    } else {
      await fs.writeFile(filePath, signatureData);
    }
    
    return {
      filename,
      filePath,
      relativePath: this.getRelativePath('return', 'signatures', filename)
    };
  }
  
  /**
   * Migrate existing files to new structure
   */
  static async migrateExistingFiles() {
    try {
      console.log('🔄 Starting file migration...');
      
      // Create new folder structure
      await this.createLostItemFolders();
      
      const oldUploadsDir = path.join(process.cwd(), 'uploads');
      const oldFiles = await fs.readdir(oldUploadsDir).catch(() => []);
      
      for (const file of oldFiles) {
        const oldPath = path.join(oldUploadsDir, file);
        const stat = await fs.stat(oldPath).catch(() => null);
        
        if (stat && stat.isFile()) {
          // Determine file type and move to appropriate folder
          if (file.includes('photo') || file.includes('image')) {
            if (file.includes('return')) {
              const newPath = this.getFilePath('return', 'photos', file);
              await fs.move(oldPath, newPath).catch(() => {});
            } else {
              const newPath = this.getFilePath('handover', 'photos', file);
              await fs.move(oldPath, newPath).catch(() => {});
            }
          } else if (file.includes('signature')) {
            if (file.includes('return')) {
              const newPath = this.getFilePath('return', 'signatures', file);
              await fs.move(oldPath, newPath).catch(() => {});
            } else {
              const newPath = this.getFilePath('handover', 'signatures', file);
              await fs.move(oldPath, newPath).catch(() => {});
            }
          }
        }
      }
      
      console.log('✅ File migration completed');
    } catch (error) {
      console.error('❌ Error during file migration:', error);
    }
  }
}
