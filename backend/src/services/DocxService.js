import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import ImageModule from 'docxtemplater-image-module-free';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DocxService {  static async generateVisitorReport(visitorData) {
    try {
      // Validate template first
      await this.validateTemplate();
      
      // Read the template file - Fixed path to use absolute path
      const templatePath = this.getTemplatePath();
      
      const content = await fs.readFile(templatePath, 'binary');
        // Create a new zip instance
      const zip = new PizZip(content);
        // Setup image module for embedding photos and signatures in DOCX
      const imageOpts = {
        centered: false,
        getImage: function(tagValue, tagName) {
          // tagValue should be the full path to the image
          try {
            let imagePath;
            
            // Handle absolute paths or relative paths
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
          // Get image dimensions for proper sizing in DOCX
          try {
            if (tagName === 'visitor_photo_image') {
              return [150, 200]; // Width x Height in pixels for visitor photo
            } else if (tagName === 'visitor_signature_image') {
              return [200, 100]; // Width x Height in pixels for signature
            }
          } catch (error) {
            console.log('Error getting image size:', error);
          }
          return [100, 100]; // Default size
        }
      };

      const imageModule = new ImageModule(imageOpts);
        // Create docxtemplater instance with image module for DOCX processing
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [imageModule],
        nullGetter: function(part) {
          // Handle null/undefined values gracefully
          if (part.module === 'rawxml') {
            return '';
          }
          return 'Tidak tersedia';
        }
      });
      
      // Format dates
      const checkInDate = visitorData.check_in_time ? new Date(visitorData.check_in_time) : new Date();
      const checkOutDate = visitorData.check_out_time ? new Date(visitorData.check_out_time) : null;
        // Prepare photo info
      const photoInfo = await this.getPhotoInfo(visitorData.photo_url);
      const signatureInfo = await this.getSignatureInfo(visitorData.signature_url);
      
      // Current date for report download
      const downloadDate = new Date();
        // Prepare template data
      const templateData = {
        // Header info
        institution_name: 'ULT FPEB',
        institution_subtitle: 'UNIT LAYANAN TERPADU',
        institution_description: 'FAKULTAS PENDIDIKAN EKONOMI DAN BISNIS',        // Visitor data - sesuai dengan placeholder template
        full_name: visitorData.full_name || 'Tidak tersedia',
        phone_number: visitorData.phone_number || 'Tidak tersedia',
        email: visitorData.email || 'Tidak tersedia',
        id_number: visitorData.id_number || 'Tidak tersedia',
        address: this.formatAddressWithLineBreaks(visitorData.address, 45), // Format dengan line breaks setiap 45 karakter
        address_formatted: this.formatAddressAdvanced(visitorData.address, { maxCharsPerLine: 45 }), // Alternative formatted version
        institution: visitorData.institution || 'Tidak tersedia',
          // Visit data - sesuai dengan placeholder template
        purpose: visitorData.purpose || 'Tidak tersedia',
        person_to_meet: visitorData.person_to_meet || 'Tidak tersedia',
        location: visitorData.location || 'Tidak tersedia',
        unit: visitorData.location || 'Tidak tersedia', // Alternative placeholder name
        check_in_date: this.formatDate(checkInDate),
        check_in_time: this.formatTime(checkInDate),
        check_out_date: checkOutDate ? this.formatDate(checkOutDate) : 'Belum check-out',
        check_out_time: checkOutDate ? this.formatTime(checkOutDate) : '',
          // Timestamps
        report_date: this.formatDate(new Date()),
        report_download: this.formatDateTime(downloadDate),
        timestamp: new Date().toISOString(),
          // Photo placeholder - fetch dan tampilkan info foto
        visitor_photo: await this.generatePhotoDisplay(visitorData.photo_url),
        
        // Signature placeholder - fetch dan tampilkan info tanda tangan
        visitor_signature: await this.generateSignatureDisplay(visitorData.signature_url, visitorData.full_name),        // Image placeholders for actual image embedding (using prepared paths)
        visitor_photo_image: this.prepareImagePath(visitorData.photo_url),
        visitor_signature_image: this.prepareImagePath(visitorData.signature_url),
        
        // Additional photo/signature info
        visitor_photo_info: photoInfo || 'Foto tidak tersedia',
        visitor_signature_info: signatureInfo || 'Tanda tangan tidak tersedia',
        visitor_photo_available: photoInfo && photoInfo !== 'Foto tidak tersedia' ? 'Ya' : 'Tidak',
        visitor_signature_available: signatureInfo && signatureInfo !== 'Tanda tangan tidak tersedia' ? 'Ya' : 'Tidak',
        visitor_photo_path: visitorData.photo_url || 'Tidak ada foto',
        visitor_signature_path: visitorData.signature_url || 'Tidak ada tanda tangan',
        visitor_name_signature: visitorData.full_name || 'Nama tidak tersedia',
        
        // Additional data
        visitor_id: visitorData.id || 'ID tidak tersedia',
        status: this.getStatusInIndonesian(visitorData.status || 'active')
      };
        // Render the document with template data
      console.log('🔄 Rendering DOCX template with visitor data...');
      console.log('📋 Template data keys:', Object.keys(templateData));
      doc.render(templateData);
      
      // Get the zip document and generate it as a buffer
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
        // Generate unique filename for DOCX report
      const timestamp = Date.now();
      const fileName = `visitor_report_${visitorData.id}_${timestamp}.docx`;
      const outputDir = path.join(process.cwd(), 'uploads', 'reports');
      await fs.ensureDir(outputDir);
      
      const outputPath = path.join(outputDir, fileName);
      
      // Write the buffer to file
      await fs.writeFile(outputPath, buffer);
      
      console.log('✅ DOCX report generated successfully:', fileName);
      console.log('📁 File location:', outputPath);
      
      return {
        fileName,
        filePath: outputPath,
        relativePath: `uploads/reports/${fileName}`,
        buffer
      };
        } catch (error) {
      console.error('Error generating DOCX visitor report:', error);
      throw new Error(`Failed to generate visitor DOCX report: ${error.message}`);
    }
  }
  static async generateDocumentRequest(visitorData) {
    try {
      // Validate template first
      await this.validateDocumentRequestTemplate();
      
      // Read the document request template file
      const templatePath = this.getDocumentRequestTemplatePath();
      
      const content = await fs.readFile(templatePath, 'binary');
      // Create a new zip instance
      const zip = new PizZip(content);
      
      // Setup image module for embedding photos and signatures in DOCX
      const imageOpts = {
        centered: false,
        getImage: function(tagValue, tagName) {
          // tagValue should be the full path to the image
          try {
            let imagePath;
            
            // Handle absolute paths or relative paths
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
          // Get image dimensions for proper sizing in DOCX
          try {
            if (tagName === 'visitor_photo_image') {
              return [120, 160]; // Width x Height in pixels for visitor photo in document request
            } else if (tagName === 'visitor_signature_image') {
              return [150, 75]; // Width x Height in pixels for signature
            }
          } catch (error) {
            console.log('Error getting image size:', error);
          }
          return [100, 100]; // Default size
        }
      };

      const imageModule = new ImageModule(imageOpts);
      
      // Create docxtemplater instance with image module for DOCX processing
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [imageModule],
        nullGetter: function(part) {
          // Handle null/undefined values gracefully
          if (part.module === 'rawxml') {
            return '';
          }
          return 'Tidak tersedia';
        }
      });
      
      // Format dates
      const requestDate = new Date();
      const checkInDate = visitorData.check_in_time ? new Date(visitorData.check_in_time) : new Date();
      
      // Prepare photo info
      const photoInfo = await this.getPhotoInfo(visitorData.photo_url);
      const signatureInfo = await this.getSignatureInfo(visitorData.signature_url);
      
      // Prepare template data for document request
      const templateData = {
        // Header info
        institution_name: 'ULT FPEB',
        institution_subtitle: 'UNIT LAYANAN TERPADU',
        institution_description: 'FAKULTAS PENDIDIKAN EKONOMI DAN BISNIS',
        
        // Visitor data
        full_name: visitorData.full_name || 'Tidak tersedia',
        phone_number: visitorData.phone_number || 'Tidak tersedia',
        email: visitorData.email || 'Tidak tersedia',
        id_type: visitorData.id_type || 'Tidak tersedia',
        id_number: visitorData.id_number || 'Tidak tersedia',
        address: this.formatAddressWithLineBreaks(visitorData.address, 45),
        institution: visitorData.institution || 'Tidak tersedia',
        
        // Visit data
        purpose: visitorData.purpose || 'Tidak tersedia',
        person_to_meet: visitorData.person_to_meet || 'Tidak tersedia',
        location: visitorData.location || 'Tidak tersedia',
        unit: visitorData.location || 'Tidak tersedia',
        visit_date: this.formatDate(checkInDate),
        visit_time: this.formatTime(checkInDate),
        
        // Document request data
        document_type: visitorData.document_type || 'Tidak tersedia',
        document_name: visitorData.document_name || 'Tidak tersedia',
        document_number: visitorData.document_number || 'Tidak tersedia',
        document_details: visitorData.document_details || 'Tidak tersedia',
        
        // Request info
        request_date: this.formatDate(requestDate),
        request_time: this.formatTime(requestDate),
        request_datetime: this.formatDateTime(requestDate),
        
        // Image placeholders for actual image embedding
        visitor_photo_image: this.prepareImagePath(visitorData.photo_url),
        visitor_signature_image: this.prepareImagePath(visitorData.signature_url),
        
        // Additional photo/signature info
        visitor_photo_info: photoInfo || 'Foto tidak tersedia',
        visitor_signature_info: signatureInfo || 'Tanda tangan tidak tersedia',
        
        // Additional data
        visitor_id: visitorData.id || 'ID tidak tersedia'
      };
      
      // Render the document with template data
      console.log('🔄 Rendering document request DOCX template...');
      console.log('📋 Template data keys:', Object.keys(templateData));
      doc.render(templateData);
      
      // Get the zip document and generate it as a buffer
      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
      
      // Generate unique filename for document request
      const timestamp = Date.now();
      const fileName = `document_request_${visitorData.id}_${timestamp}.docx`;
      const outputDir = path.join(process.cwd(), 'uploads', 'document_requests');
      await fs.ensureDir(outputDir);
      
      const outputPath = path.join(outputDir, fileName);
      
      // Write the buffer to file
      await fs.writeFile(outputPath, buffer);
      
      console.log('✅ Document request DOCX generated successfully:', fileName);
      console.log('📁 File location:', outputPath);
      
      return {
        fileName,
        filePath: outputPath,
        relativePath: `uploads/document_requests/${fileName}`,
        buffer
      };
      
    } catch (error) {
      console.error('Error generating document request DOCX:', error);
      throw new Error(`Failed to generate document request DOCX: ${error.message}`);
    }
  }

  // Get document request template path
  static getDocumentRequestTemplatePath() {
    // Try multiple possible paths to find the document request template
    const possiblePaths = [
      path.join(process.cwd(), 'templates', 'document_request_template.docx'),
      path.join(process.cwd(), 'backend', 'templates', 'document_request_template.docx'),
      path.resolve('templates', 'document_request_template.docx'),
      path.resolve('backend', 'templates', 'document_request_template.docx'),
      path.join(__dirname, '..', '..', 'templates', 'document_request_template.docx')
    ];
    
    console.log(`🔍 Checking for document request template...`);
    
    for (const templatePath of possiblePaths) {
      console.log(`🔍 Checking template path: ${templatePath}`);
      if (fs.existsSync(templatePath)) {
        console.log(`✅ Found document request template at: ${templatePath}`);
        return templatePath;
      }
    }
    
    // If no template found, return the default path for error reporting
    const defaultPath = possiblePaths[0];
    console.error(`❌ Document request template not found in any of these locations:`, possiblePaths);
    return defaultPath;
  }

  // Validate document request template
  static async validateDocumentRequestTemplate() {
    const templatePath = this.getDocumentRequestTemplatePath();
    
    try {
      if (!await fs.pathExists(templatePath)) {
        throw new Error(`Document request template file not found at: ${templatePath}`);
      }
      
      const stats = await fs.stat(templatePath);
      if (stats.size === 0) {
        throw new Error(`Document request template file is empty: ${templatePath}`);
      }
      
      console.log(`✅ Document request template validation successful: ${templatePath}`);
      console.log(`📊 Template size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      return true;
    } catch (error) {
      console.error('❌ Document request template validation failed:', error.message);
      throw error;
    }
  }

  static async createDefaultTemplate(templatePath) {
    try {
      // Ensure templates directory exists
      await fs.ensureDir(path.dirname(templatePath));
      
      console.log('⚠️  Template file not found!');
      console.log('📁 Expected template location:', templatePath);
      console.log('📝 Please create a proper .docx template file with placeholders like:');
      console.log('   - {full_name} for visitor name');
      console.log('   - {phone_number} for phone');
      console.log('   - {email} for email');
      console.log('   - {institution} for institution');
      console.log('   - {purpose} for purpose of visit');
      console.log('   - {person_to_meet} for person to meet');
      console.log('   - {location} or {unit} for unit/location');
      console.log('   - {check_in_date} and {check_in_time} for check-in');
      console.log('   - {check_out_date} and {check_out_time} for check-out');
      console.log('   - {visitor_photo_image%} for photo embedding');
      console.log('   - {visitor_signature_image%} for signature embedding');
      
      throw new Error(`Template file must be created at: ${templatePath}`);
      
    } catch (error) {
      console.error('Error: Template file not found:', error);
      throw error;
    }
  }

  // Validate that the template file exists and is accessible
  static async validateTemplate() {
    const templatePath = this.getTemplatePath();
    
    try {
      if (!await fs.pathExists(templatePath)) {
        throw new Error(`Template file not found at: ${templatePath}`);
      }
      
      const stats = await fs.stat(templatePath);
      if (stats.size === 0) {
        throw new Error(`Template file is empty: ${templatePath}`);
      }
      
      console.log(`✅ Template validation successful: ${templatePath}`);
      console.log(`📊 Template size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      return true;
    } catch (error) {
      console.error('❌ Template validation failed:', error.message);
      throw error;
    }
  }

  // Get template path (centralized)
  static getTemplatePath() {
    // Try multiple possible paths to find the template
    const possiblePaths = [
      path.join(process.cwd(), 'templates', 'visitor_report_template.docx'),
      path.join(process.cwd(), 'backend', 'templates', 'visitor_report_template.docx'),
      path.resolve('templates', 'visitor_report_template.docx'),
      path.resolve('backend', 'templates', 'visitor_report_template.docx'),
      path.join(__dirname, '..', '..', 'templates', 'visitor_report_template.docx')
    ];
    
    console.log(`🔍 Current working directory: ${process.cwd()}`);
    console.log(`🔍 __dirname: ${__dirname}`);
    
    for (const templatePath of possiblePaths) {
      console.log(`🔍 Checking template path: ${templatePath}`);
      if (fs.existsSync(templatePath)) {
        console.log(`✅ Found template at: ${templatePath}`);
        return templatePath;
      }
    }
    
    // If no template found, return the default path for error reporting
    const defaultPath = possiblePaths[0];
    console.error(`❌ Template not found in any of these locations:`, possiblePaths);
    return defaultPath;
  }

  // Helper method to ensure photo and signature paths are correctly formatted
  static prepareImagePath(relativePath) {
    if (!relativePath) return null;
    
    // Convert to absolute path
    const absolutePath = path.isAbsolute(relativePath) 
      ? relativePath 
      : path.join(process.cwd(), relativePath);
      
    // Check if file exists
    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
    
    console.warn(`Image file not found: ${absolutePath}`);
    return null;
  }

  static formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  static formatTime(date) {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static formatDateTime(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  static getStatusInIndonesian(status) {
    const statusMap = {
      'active': 'Sedang Berkunjung',
      'completed': 'Selesai',
      'checked_in': 'Sudah Check-in',
      'checked_out': 'Sudah Check-out'
    };
    return statusMap[status] || 'Status tidak diketahui';
  }

  static getVisitorPhotoPath(photoUrl) {
    if (!photoUrl) return null;
    
    // Convert relative path to absolute path
    const fullPath = path.join(process.cwd(), photoUrl);
    
    // Check if file exists
    try {
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    } catch (error) {
      console.log('Photo file not found:', fullPath);
    }
    
    return null;
  }

  static getSignatureImagePath(signatureUrl) {
    if (!signatureUrl) return null;
    
    // Convert relative path to absolute path
    const fullPath = path.join(process.cwd(), signatureUrl);
    
    // Check if file exists
    try {
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    } catch (error) {
      console.log('Signature file not found:', fullPath);
    }
    
    return null;
  }
  static async getPhotoInfo(photoUrl) {
    if (!photoUrl) return null;
    
    try {
      const fullPath = path.join(process.cwd(), photoUrl);
      
      if (await fs.pathExists(fullPath)) {
        // Get file stats
        const stats = await fs.stat(fullPath);
        const fileSize = (stats.size / 1024).toFixed(2); // KB
        
        // Check if it's an SVG file
        const extension = path.extname(photoUrl).toLowerCase();
        if (extension === '.svg') {
          return `Foto tersedia (SVG, ${fileSize}KB)`;
        }
        
        // Get image dimensions using sharp for non-SVG files
        try {
          const metadata = await sharp(fullPath).metadata();
          return `Foto tersedia (${metadata.width}x${metadata.height}, ${fileSize}KB)`;
        } catch (sharpError) {
          // If sharp fails, just return file size
          return `Foto tersedia (${fileSize}KB)`;
        }
      }
    } catch (error) {
      console.log('Error getting photo info:', error);
    }
    
    return null;
  }

  static async getSignatureInfo(signatureUrl) {
    if (!signatureUrl) return null;
    
    try {
      const fullPath = path.join(process.cwd(), signatureUrl);
      
      if (await fs.pathExists(fullPath)) {
        // Get file stats
        const stats = await fs.stat(fullPath);
        const fileSize = (stats.size / 1024).toFixed(2); // KB
        
        // Check if it's an image file
        const extension = path.extname(signatureUrl).toLowerCase();
        if (extension === '.svg') {
          return `Tanda tangan digital tersedia (SVG, ${fileSize}KB)`;
        } else if (['.png', '.jpg', '.jpeg'].includes(extension)) {
          try {
            const metadata = await sharp(fullPath).metadata();
            return `Tanda tangan digital tersedia (${metadata.width}x${metadata.height}, ${fileSize}KB)`;
          } catch (sharpError) {
            return `Tanda tangan digital tersedia (${fileSize}KB)`;
          }
        }
        
        return `Tanda tangan digital tersedia (${fileSize}KB)`;
      }
    } catch (error) {
      console.log('Error getting signature info:', error);
    }
    
    return null;
  }

  static async generatePhotoDisplay(photoUrl) {
    if (!photoUrl) {
      return '[FOTO TIDAK TERSEDIA]\nTidak ada foto yang diupload untuk visitor ini.';
    }
    
    try {
      const fullPath = path.join(process.cwd(), photoUrl);
      
      if (await fs.pathExists(fullPath)) {
        // Get file stats
        const stats = await fs.stat(fullPath);
        const fileSize = (stats.size / 1024).toFixed(2); // KB
        const uploadDate = stats.birthtime.toLocaleDateString('id-ID');
        
        // Get file extension
        const extension = path.extname(photoUrl).toLowerCase();
        
        let dimensionInfo = '';
        if (extension === '.svg') {
          dimensionInfo = 'Format: SVG (Vector)';
        } else if (['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(extension)) {
          try {
            const metadata = await sharp(fullPath).metadata();
            dimensionInfo = `Dimensi: ${metadata.width} x ${metadata.height} pixels`;
          } catch (sharpError) {
            dimensionInfo = `Format: ${extension.toUpperCase()}`;
          }
        } else {
          dimensionInfo = `Format: ${extension.toUpperCase()}`;
        }
        
        return `[FOTO VISITOR TERSEDIA]
${dimensionInfo}
Ukuran File: ${fileSize} KB
Tanggal Upload: ${uploadDate}
Path: ${photoUrl}`;
      } else {
        return `[FOTO TIDAK DITEMUKAN]
File path: ${photoUrl}
Status: File tidak ditemukan di server`;
      }
    } catch (error) {
      console.log('Error generating photo display:', error);
      return `[ERROR FOTO]
Path: ${photoUrl}
Error: ${error.message}`;
    }
  }
  static async generateSignatureDisplay(signatureUrl, visitorName = null) {
    if (!signatureUrl) {
      return '[TANDA TANGAN TIDAK TERSEDIA]\nVisitor belum memberikan tanda tangan digital.';
    }
    
    try {
      const fullPath = path.join(process.cwd(), signatureUrl);
      
      if (await fs.pathExists(fullPath)) {
        // Get file stats
        const stats = await fs.stat(fullPath);
        const fileSize = (stats.size / 1024).toFixed(2); // KB
        const signDate = stats.birthtime.toLocaleDateString('id-ID');
        const signTime = stats.birthtime.toLocaleTimeString('id-ID');
        
        // Get file extension
        const extension = path.extname(signatureUrl).toLowerCase();
        
        let formatInfo = '';
        if (extension === '.svg') {
          formatInfo = 'Format: SVG (Digital Signature)';
        } else if (['.png', '.jpg', '.jpeg'].includes(extension)) {
          try {
            const metadata = await sharp(fullPath).metadata();
            formatInfo = `Format: ${extension.toUpperCase()} (${metadata.width}x${metadata.height})`;
          } catch (sharpError) {
            formatInfo = `Format: ${extension.toUpperCase()}`;
          }
        } else {
          formatInfo = `Format: ${extension.toUpperCase()}`;
        }
        
        let signatureText = `[TANDA TANGAN DIGITAL TERSEDIA]
${formatInfo}
Ukuran: ${fileSize} KB
Ditandatangani: ${signDate} pukul ${signTime}
Path: ${signatureUrl}

--- TANDA TANGAN DIGITAL ---`;

        // Add visitor name if provided
        if (visitorName) {
          signatureText += `\n\n     ${visitorName}`;
        }
        
        return signatureText;
      } else {
        return `[TANDA TANGAN TIDAK DITEMUKAN]
File path: ${signatureUrl}
Status: File tidak ditemukan di server`;
      }
    } catch (error) {
      console.log('Error generating signature display:', error);
      return `[ERROR TANDA TANGAN]
Path: ${signatureUrl}
Error: ${error.message}`;
    }
  }
  static async fetchVisitorPhotoData(visitorId) {
    try {
      // Note: This method is kept for backward compatibility
      // but generateVisitorReport now handles photo data directly
      const { Visitor } = await import('../models/Visitor.js');
      const visitor = await Visitor.findById(visitorId);
      
      if (!visitor || !visitor.photo_url) {
        return null;
      }
      
      return await this.generatePhotoDisplay(visitor.photo_url);
    } catch (error) {
      console.log('Error fetching visitor photo data:', error);
      return '[ERROR] Tidak dapat mengambil data foto visitor';
    }
  }

  static async fetchVisitorSignatureData(visitorId) {
    try {
      // Note: This method is kept for backward compatibility  
      // but generateVisitorReport now handles signature data directly
      const { Visitor } = await import('../models/Visitor.js');
      const visitor = await Visitor.findById(visitorId);
      
      if (!visitor || !visitor.signature_url) {
        return null;
      }
      
      return await this.generateSignatureDisplay(visitor.signature_url);
    } catch (error) {
      console.log('Error fetching visitor signature data:', error);
      return '[ERROR] Tidak dapat mengambil data tanda tangan visitor';
    }
  }
  static formatAddressWithLineBreaks(address, maxCharsPerLine = 45) {
    if (!address || typeof address !== 'string') {
      return 'Tidak tersedia';
    }
    
    // Trim whitespace dan remove extra spaces
    const cleanAddress = address.trim().replace(/\s+/g, ' ');
    
    // Split by existing line breaks first
    const lines = cleanAddress.split(/\r?\n/);
    const formattedLines = [];
    
    lines.forEach(line => {
      // Skip empty lines
      if (!line.trim()) {
        return;
      }
      
      if (line.length <= maxCharsPerLine) {
        formattedLines.push(line);
      } else {
        // Split long lines into chunks by words
        const words = line.split(' ');
        let currentLine = '';
        
        words.forEach(word => {
          // Check if adding this word would exceed the limit
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          
          if (testLine.length <= maxCharsPerLine) {
            currentLine = testLine;
          } else {
            // Current line is full, push it and start new line
            if (currentLine) {
              formattedLines.push(currentLine);
            }
            
            // Handle very long words that exceed maxCharsPerLine
            if (word.length > maxCharsPerLine) {
              // Force break long words
              let remainingWord = word;
              while (remainingWord.length > maxCharsPerLine) {
                formattedLines.push(remainingWord.substring(0, maxCharsPerLine));
                remainingWord = remainingWord.substring(maxCharsPerLine);
              }
              currentLine = remainingWord;
            } else {
              currentLine = word;
            }
          }
        });
        
        // Add the last line if it has content
        if (currentLine) {
          formattedLines.push(currentLine);
        }
      }
    });
    
    // Join with newline characters for DOCX template
    const result = formattedLines.join('\n');
    
    // Debug logging untuk memastikan formatting bekerja
    console.log('📍 Address formatting:');
    console.log('   Original:', address);
    console.log('   Formatted lines:', formattedLines.length);
    console.log('   Max chars per line:', maxCharsPerLine);
    formattedLines.forEach((line, index) => {
      console.log(`   Line ${index + 1} (${line.length} chars): ${line}`);
    });
    
    return result;
  }

  // Helper method untuk test address formatting
  static testAddressFormatting(sampleAddress) {
    console.log('\n🧪 Testing Address Formatting:');
    console.log('=====================================');
    
    const testCases = [
      sampleAddress || 'Jl. Raya Setiabudhi No. 123, Kelurahan Isola, Kecamatan Sukasari, Kota Bandung, Jawa Barat 40154, Indonesia',
      'Jl. Dr. Setiabudi No. 229 Bandung',
      'Komplek Perumahan Griya Bandung Asri Blok C No. 15 RT 02 RW 08 Kelurahan Sukabungah Kecamatan Sukajadi Kota Bandung Jawa Barat',
      'Jl. Dipatiukur No. 35'
    ];
    
    testCases.forEach((address, index) => {
      console.log(`\nTest Case ${index + 1}:`);
      console.log('Input:', address);
      const formatted = this.formatAddressWithLineBreaks(address);
      console.log('Output:');
      formatted.split('\n').forEach((line, lineIndex) => {
        console.log(`  ${lineIndex + 1}. ${line} (${line.length} chars)`);
      });
    });
  }

  // Method untuk memformat alamat dengan opsi berbeda
  static formatAddressAdvanced(address, options = {}) {
    const defaults = {
      maxCharsPerLine: 45,
      preserveLineBreaks: true,
      trimSpaces: true,
      removeEmptyLines: true
    };
    
    const opts = { ...defaults, ...options };
    
    if (!address || typeof address !== 'string') {
      return 'Tidak tersedia';
    }
    
    let processedAddress = address;
    
    // Trim spaces if enabled
    if (opts.trimSpaces) {
      processedAddress = processedAddress.trim().replace(/\s+/g, ' ');
    }
    
    // Handle existing line breaks
    const lines = opts.preserveLineBreaks 
      ? processedAddress.split(/\r?\n/) 
      : [processedAddress];
    
    const formattedLines = [];
    
    lines.forEach(line => {
      // Skip empty lines if option is enabled
      if (opts.removeEmptyLines && !line.trim()) {
        return;
      }
      
      if (line.length <= opts.maxCharsPerLine) {
        formattedLines.push(line);
      } else {
        // Process long lines
        const words = line.split(' ');
        let currentLine = '';
        
        words.forEach(word => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          
          if (testLine.length <= opts.maxCharsPerLine) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              formattedLines.push(currentLine);
            }
            
            // Handle extremely long words
            if (word.length > opts.maxCharsPerLine) {
              let remainingWord = word;
              while (remainingWord.length > opts.maxCharsPerLine) {
                formattedLines.push(remainingWord.substring(0, opts.maxCharsPerLine));
                remainingWord = remainingWord.substring(opts.maxCharsPerLine);
              }
              currentLine = remainingWord;
            } else {
              currentLine = word;
            }
          }
        });
        
        if (currentLine) {
          formattedLines.push(currentLine);
        }
      }
    });
    
    return formattedLines.join('\n');
  }
}
