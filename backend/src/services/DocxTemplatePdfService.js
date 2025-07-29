import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import PDFDocument from 'pdfkit';
import { DocxService } from './DocxService.js';

export class DocxTemplatePdfService {
  static async generateVisitorReportPdf(visitor) {
    try {
      console.log('Starting PDF generation using DOCX template layout for visitor:', visitor.id);      // Create PDF file path
      const pdfFileName = `visitor_report_${visitor.id}_${Date.now()}.pdf`;
      const tempDir = path.join(process.cwd(), 'temp');
      const pdfFilePath = path.join(tempDir, pdfFileName);

      // Ensure temp directory exists
      try {
        await fs.mkdir(tempDir, { recursive: true });
      } catch (error) {
        // Directory might already exist, ignore error
      }// Create a new PDF document
      const doc = new PDFDocument({ margin: 50 });
      const stream = fsSync.createWriteStream(pdfFilePath);
      doc.pipe(stream);

      // Helper function to add text with formatting
      const addText = (text, x, y, options = {}) => {
        const defaults = { fontSize: 12, align: 'left' };
        const opts = { ...defaults, ...options };
        doc.fontSize(opts.fontSize);
        if (opts.align === 'center') {
          doc.text(text, x, y, { align: 'center', width: doc.page.width - 100 });
        } else {
          doc.text(text, x, y, opts);
        }
      };

      // Header
      let yPos = 50;
      addText('UNIVERSITAS SRIWIJAYA', 50, yPos, { fontSize: 16, align: 'center' });
      yPos += 25;
      addText('FAKULTAS PENDIDIKAN EKONOMI DAN BISNIS', 50, yPos, { fontSize: 14, align: 'center' });
      yPos += 20;
      addText('UNIT LAYANAN TERPADU (ULT)', 50, yPos, { fontSize: 12, align: 'center' });
      yPos += 15;
      addText('Jl. Raya Palembang-Prabumulih KM. 32 Indralaya Ogan Ilir 30662', 50, yPos, { fontSize: 10, align: 'center' });
      yPos += 40;

      // Title
      doc.font('Helvetica-Bold');
      addText('TANDA KUNJUNGAN', 50, yPos, { fontSize: 18, align: 'center' });
      doc.font('Helvetica');
      yPos += 50;

      // Format visitor data
      const formatDate = (dateString) => {
        if (!dateString) return 'Belum keluar';
        return new Date(dateString).toLocaleString('id-ID', {
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      // Format address with line breaks
      const formatAddress = (address) => {
        if (!address) return '';
        if (address.length <= 45) return address;
        
        const words = address.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
          if ((currentLine + ' ' + word).length <= 45) {
            currentLine = currentLine ? currentLine + ' ' + word : word;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine);
        
        return lines.join('\n');
      };

      // Visitor information table
      const visitorData = [
        ['Nama', visitor.full_name || ''],
        ['Nomor Identitas', visitor.id_number || ''],
        ['No. Telepon', visitor.phone_number || ''],
        ['Email', visitor.email || ''],
        ['Alamat', formatAddress(visitor.address || '')],
        ['Asal Instansi', visitor.institution || ''],
        ['Keperluan', visitor.purpose || ''],
        ['Unit yang Dituju', visitor.location || ''],
        ['Pihak yang Ditemui', visitor.person_to_meet || ''],
        ['Waktu Masuk', formatDate(visitor.check_in_time)],
        ['Waktu Keluar', formatDate(visitor.check_out_time)]
      ];

      // Draw table
      for (const [label, value] of visitorData) {
        addText(label, 50, yPos, { fontSize: 11 });
        addText(':', 200, yPos, { fontSize: 11 });
        
        // Handle multi-line values (like address)
        if (value.includes('\n')) {
          const lines = value.split('\n');
          for (let i = 0; i < lines.length; i++) {
            addText(lines[i], 220, yPos + (i * 15), { fontSize: 11 });
          }
          yPos += (lines.length * 15) + 10;
        } else {
          addText(value, 220, yPos, { fontSize: 11 });
          yPos += 25;
        }
      }

      yPos += 30;

      // Photo section
      addText('Foto Pengunjung:', 50, yPos, { fontSize: 12 });
      yPos += 20;

      // Try to add photo if available
      if (visitor.photo_url) {
        try {
          const photoPath = path.join(process.cwd(), 'uploads', 'photos', path.basename(visitor.photo_url));
          const photoExists = await fs.access(photoPath).then(() => true).catch(() => false);
          
          if (photoExists) {
            doc.image(photoPath, 50, yPos, { width: 120, height: 150 });
            yPos += 160;
          } else {
            addText('[Foto tidak tersedia]', 50, yPos, { fontSize: 10 });
            yPos += 20;
          }
        } catch (error) {
          console.warn('Could not add photo:', error.message);
          addText('[Foto tidak dapat dimuat]', 50, yPos, { fontSize: 10 });
          yPos += 20;
        }
      } else {
        addText('[Tidak ada foto]', 50, yPos, { fontSize: 10 });
        yPos += 20;
      }

      yPos += 30;

      // Date and signature section
      const currentDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      addText(`Indralaya, ${currentDate}`, 50, yPos, { fontSize: 11 });
      yPos += 40;

      // Signature table
      addText('Yang Melayani', 100, yPos, { fontSize: 11, align: 'center' });
      addText('Pengunjung', 400, yPos, { fontSize: 11, align: 'center' });
      yPos += 80;

      // Signature line for staff
      doc.moveTo(50, yPos)
         .lineTo(200, yPos)
         .stroke();

      // Try to add visitor signature if available
      if (visitor.signature_url) {
        try {
          const signaturePath = path.join(process.cwd(), 'uploads', 'signatures', path.basename(visitor.signature_url));
          const signatureExists = await fs.access(signaturePath).then(() => true).catch(() => false);
          
          if (signatureExists) {
            doc.image(signaturePath, 370, yPos - 60, { width: 120, height: 60 });
          } else {
            addText('[Tanda tangan tidak tersedia]', 350, yPos - 20, { fontSize: 8 });
          }
        } catch (error) {
          console.warn('Could not add signature:', error.message);
          addText('[Tanda tangan tidak dapat dimuat]', 350, yPos - 20, { fontSize: 8 });
        }
      } else {
        addText('[Tidak ada tanda tangan]', 350, yPos - 20, { fontSize: 8 });
      }

      yPos += 20;
      
      // Visitor name under signature
      addText(visitor.full_name || '', 350, yPos, { fontSize: 11, align: 'center' });

      // Finalize PDF
      doc.end();

      // Wait for PDF generation to complete
      await new Promise((resolve) => {
        stream.on('finish', resolve);
      });

      console.log('PDF file written to:', pdfFilePath);

      return {
        filePath: pdfFilePath,
        fileName: pdfFileName,
        success: true
      };

    } catch (error) {
      console.error('Error in PDF generation:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  static async cleanupTempFiles() {
    try {
      const tempDir = path.join(process.cwd(), 'temp');
      const files = await fs.readdir(tempDir);
      
      // Clean up files older than 1 hour
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      for (const file of files) {
        if (file.startsWith('visitor_report_') && file.endsWith('.pdf')) {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < oneHourAgo) {
            await fs.unlink(filePath);
            console.log('Cleaned up old temp file:', file);
          }
        }
      }
    } catch (error) {
      console.warn('Error cleaning up temp files:', error.message);
    }
  }
}
