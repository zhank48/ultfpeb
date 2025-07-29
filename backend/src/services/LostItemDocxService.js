import fs from 'fs-extra';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';

export class LostItemDocxService {
  
  // Generate handover document for lost item registration
  static async generateHandoverDocument(lostItemData) {
    try {
      console.log('🔄 Generating handover document for lost item:', lostItemData.id);
      
      // Validate template first
      const templatePath = this.getHandoverTemplatePath();
      await this.validateTemplate(templatePath);
      
      // Read the template file
      const content = await fs.readFile(templatePath, 'binary');
      const zip = new PizZip(content);
      
      // Setup image module for embedding photos and signatures
      const imageOpts = {
        centered: false,
        getImage: function(tagValue, tagName) {
          try {
            let imagePath;
            
            if (path.isAbsolute(tagValue)) {
              imagePath = tagValue;
            } else {
              imagePath = path.join(process.cwd(), tagValue);
            }
            
            if (fs.existsSync(imagePath)) {
              console.log(`✅ Loading image for ${tagName}:`, imagePath);
              return fs.readFileSync(imagePath);
            } else {
              console.log(`❌ Image not found for ${tagName}:`, imagePath);
            }
          } catch (error) {
            console.log('Error loading image:', tagValue, error);
          }
          return null;
        },
        getSize: function(img, tagValue, tagName) {
          try {
            if (tagName === 'found_photo_image') {
              return [150, 200]; // Width x Height for found photo
            } else if (tagName === 'received_signature_image') {
              return [200, 100]; // Width x Height for signature
            }
          } catch (error) {
            console.log('Error getting image size:', error);
          }
          return [100, 100]; // Default size
        }
      };

      const imageModule = new ImageModule(imageOpts);
      
      // Create docxtemplater instance
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [imageModule],
        nullGetter: function(part) {
          if (part.module === 'rawxml') {
            return '';
          }
          return 'Tidak tersedia';
        }
      });
      
      // Prepare template data
      const templateData = {
        // Header info
        institution_name: 'ULT FPEB',
        institution_subtitle: 'UNIT LAYANAN TERPADU',
        institution_description: 'FAKULTAS PENDIDIKAN EKONOMI DAN BISNIS',
        
        // Item information
        item_id: lostItemData.id || 'Tidak tersedia',
        item_name: lostItemData.item_name || 'Tidak tersedia',
        category: lostItemData.category || 'Tidak tersedia',
        description: lostItemData.description || 'Tidak tersedia',
        condition_status: this.getConditionInIndonesian(lostItemData.condition_status),
        found_location: lostItemData.found_location || 'Tidak tersedia',
        found_date: this.formatDate(lostItemData.found_date),
        found_time: lostItemData.found_time || 'Tidak tersedia',
        
        // Finder information
        finder_name: lostItemData.finder_name || 'Tidak tersedia',
        finder_contact: lostItemData.finder_contact || 'Tidak tersedia',
        found_by: lostItemData.found_by || 'Tidak tersedia',
        
        // Operator information
        received_by_operator: lostItemData.received_by_operator || 'Tidak tersedia',
        received_by_operator_id: lostItemData.received_by_operator_id || 'Tidak tersedia',
        received_date: this.formatDate(lostItemData.created_at),
        
        // Status and notes
        status: this.getStatusInIndonesian(lostItemData.status),
        notes: lostItemData.notes || 'Tidak ada catatan',
        
        // Image placeholders
        found_photo_image: this.prepareImagePath(lostItemData.handover_photo_url),
        received_signature_image: this.prepareImagePath(lostItemData.handover_signature_data),
        
        // Image info
        found_photo_info: await this.getPhotoInfo(lostItemData.handover_photo_url),
        received_signature_info: await this.getSignatureInfo(lostItemData.handover_signature_data),
        
        // Timestamps
        handover_date: this.formatDate(new Date()),
        report_generated_date: this.formatDateTime(new Date())
      };
      
      // Render the document
      console.log('🔄 Rendering handover template with data...');
      doc.render(templateData);
      
      // Get the document buffer
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
      
      // Generate filename and save
      const timestamp = Date.now();
      const fileName = `lost_item_handover_${lostItemData.id}_${timestamp}.docx`;
      const outputDir = path.join(process.cwd(), 'uploads', 'reports');
      await fs.ensureDir(outputDir);
      
      const outputPath = path.join(outputDir, fileName);
      await fs.writeFile(outputPath, buffer);
      
      console.log('✅ Handover document generated successfully:', fileName);
      
      return {
        fileName,
        filePath: outputPath,
        relativePath: `uploads/reports/${fileName}`,
        buffer
      };
      
    } catch (error) {
      console.error('Error generating handover document:', error);
      throw new Error(`Failed to generate handover document: ${error.message}`);
    }
  }
  
  // Generate return document for lost item return
  static async generateReturnDocument(lostItemData, returnData) {
    try {
      console.log('🔄 Generating return document for lost item:', lostItemData.id);
      
      // Validate template first
      const templatePath = this.getReturnTemplatePath();
      await this.validateTemplate(templatePath);
      
      // Read the template file
      const content = await fs.readFile(templatePath, 'binary');
      const zip = new PizZip(content);
      
      // Setup image module
      const imageOpts = {
        centered: false,
        getImage: function(tagValue, tagName) {
          try {
            let imagePath;
            
            if (path.isAbsolute(tagValue)) {
              imagePath = tagValue;
            } else {
              imagePath = path.join(process.cwd(), tagValue);
            }
            
            if (fs.existsSync(imagePath)) {
              console.log(`✅ Loading image for ${tagName}:`, imagePath);
              return fs.readFileSync(imagePath);
            } else {
              console.log(`❌ Image not found for ${tagName}:`, imagePath);
            }
          } catch (error) {
            console.log('Error loading image:', tagValue, error);
          }
          return null;
        },
        getSize: function(img, tagValue, tagName) {
          try {
            if (tagName === 'return_photo_image') {
              return [150, 200]; // Width x Height for return photo
            } else if (tagName === 'return_signature_image') {
              return [200, 100]; // Width x Height for signature
            }
          } catch (error) {
            console.log('Error getting image size:', error);
          }
          return [100, 100]; // Default size
        }
      };

      const imageModule = new ImageModule(imageOpts);
      
      // Create docxtemplater instance
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [imageModule],
        nullGetter: function(part) {
          if (part.module === 'rawxml') {
            return '';
          }
          return 'Tidak tersedia';
        }
      });
      
      // Prepare template data
      const templateData = {
        // Header info
        institution_name: 'ULT FPEB',
        institution_subtitle: 'UNIT LAYANAN TERPADU',
        institution_description: 'FAKULTAS PENDIDIKAN EKONOMI DAN BISNIS',
        
        // Item information
        item_id: lostItemData.id || 'Tidak tersedia',
        item_name: lostItemData.item_name || 'Tidak tersedia',
        category: lostItemData.category || 'Tidak tersedia',
        description: lostItemData.description || 'Tidak tersedia',
        condition_status: this.getConditionInIndonesian(lostItemData.condition_status),
        found_location: lostItemData.found_location || 'Tidak tersedia',
        found_date: this.formatDate(lostItemData.found_date),
        
        // Claimer information
        claimer_name: returnData.claimer_name || 'Tidak tersedia',
        claimer_contact: returnData.claimer_contact || 'Tidak tersedia',
        claimer_id_number: returnData.claimer_id_number || 'Tidak tersedia',
        relationship_to_owner: this.getRelationshipInIndonesian(returnData.relationship_to_owner),
        proof_of_ownership: returnData.proof_of_ownership || 'Tidak ada bukti kepemilikan',
        
        // Return information
        return_date: this.formatDate(returnData.return_date),
        return_time: returnData.return_time || 'Tidak tersedia',
        return_operator: returnData.return_operator || 'Tidak tersedia',
        return_operator_id: returnData.return_operator_id || 'Tidak tersedia',
        return_notes: returnData.notes || 'Tidak ada catatan pengembalian',
        
        // History information
        finder_name: lostItemData.finder_name || 'Tidak tersedia',
        received_by_operator: lostItemData.received_by_operator || 'Tidak tersedia',
        
        // Image placeholders
        return_photo_image: this.prepareImagePath(returnData.return_photo_url),
        return_signature_image: this.prepareImagePath(returnData.return_signature_data),
        
        // Image info
        return_photo_info: await this.getPhotoInfo(returnData.return_photo_url),
        return_signature_info: await this.getSignatureInfo(returnData.return_signature_data),
        
        // Timestamps
        report_generated_date: this.formatDateTime(new Date())
      };
      
      // Render the document
      console.log('🔄 Rendering return template with data...');
      doc.render(templateData);
      
      // Get the document buffer
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
      
      // Generate filename and save
      const timestamp = Date.now();
      const fileName = `lost_item_return_${lostItemData.id}_${timestamp}.docx`;
      const outputDir = path.join(process.cwd(), 'uploads', 'reports');
      await fs.ensureDir(outputDir);
      
      const outputPath = path.join(outputDir, fileName);
      await fs.writeFile(outputPath, buffer);
      
      console.log('✅ Return document generated successfully:', fileName);
      
      return {
        fileName,
        filePath: outputPath,
        relativePath: `uploads/reports/${fileName}`,
        buffer
      };
      
    } catch (error) {
      console.error('Error generating return document:', error);
      throw new Error(`Failed to generate return document: ${error.message}`);
    }
  }
  
  // Template path helpers
  static getHandoverTemplatePath() {
    return path.join(process.cwd(), 'templates', 'lost_item_handover_template.docx');
  }
  
  static getReturnTemplatePath() {
    return path.join(process.cwd(), 'templates', 'lost_item_return_template.docx');
  }
  
  // Validate template exists
  static async validateTemplate(templatePath) {
    try {
      if (!await fs.pathExists(templatePath)) {
        throw new Error(`Template file not found at: ${templatePath}`);
      }
      
      const stats = await fs.stat(templatePath);
      if (stats.size === 0) {
        throw new Error(`Template file is empty: ${templatePath}`);
      }
      
      console.log(`✅ Template validation successful: ${templatePath}`);
      return true;
    } catch (error) {
      console.error('❌ Template validation failed:', error.message);
      throw error;
    }
  }
  
  // Helper method to prepare image paths
  static prepareImagePath(relativePath) {
    if (!relativePath) return null;
    
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    
    return path.join(process.cwd(), relativePath);
  }
  
  // Date formatting helpers
  static formatDate(date) {
    if (!date) return 'Tidak tersedia';
    
    try {
      const d = new Date(date);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return 'Format tanggal tidak valid';
    }
  }
  
  static formatDateTime(date) {
    if (!date) return 'Tidak tersedia';
    
    try {
      const d = new Date(date);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Format tanggal tidak valid';
    }
  }
  
  // Status translation helpers
  static getStatusInIndonesian(status) {
    const statusMap = {
      'found': 'Ditemukan',
      'returned': 'Dikembalikan',
      'disposed': 'Dibuang',
      'lost': 'Hilang'
    };
    return statusMap[status] || 'Status tidak diketahui';
  }
  
  static getConditionInIndonesian(condition) {
    const conditionMap = {
      'excellent': 'Sangat Baik',
      'good': 'Baik',
      'fair': 'Cukup',
      'poor': 'Buruk'
    };
    return conditionMap[condition] || 'Kondisi tidak diketahui';
  }
  
  static getRelationshipInIndonesian(relationship) {
    const relationshipMap = {
      'owner': 'Pemilik',
      'family': 'Keluarga',
      'friend': 'Teman',
      'colleague': 'Rekan Kerja',
      'representative': 'Perwakilan'
    };
    return relationshipMap[relationship] || 'Hubungan tidak diketahui';
  }
  
  // Image info helpers
  static async getPhotoInfo(photoUrl) {
    if (!photoUrl) {
      return 'Tidak ada foto';
    }
    
    try {
      const fullPath = this.prepareImagePath(photoUrl);
      if (fs.existsSync(fullPath)) {
        const stats = await fs.stat(fullPath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        const fileName = path.basename(fullPath);
        return `File: ${fileName} (${sizeKB} KB)`;
      } else {
        return 'Foto tidak ditemukan';
      }
    } catch (error) {
      return 'Error mengambil info foto';
    }
  }
  
  static async getSignatureInfo(signatureData) {
    if (!signatureData) {
      return 'Tidak ada tanda tangan';
    }
    
    try {
      const fullPath = this.prepareImagePath(signatureData);
      if (fs.existsSync(fullPath)) {
        const stats = await fs.stat(fullPath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        const fileName = path.basename(fullPath);
        return `File: ${fileName} (${sizeKB} KB)`;
      } else {
        return 'Tanda tangan tidak ditemukan';
      }
    } catch (error) {
      return 'Error mengambil info tanda tangan';
    }
  }
}
