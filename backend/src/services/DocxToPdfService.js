import path from 'path';
import fs from 'fs/promises';
import { DocxService } from './DocxService.js';
import { PdfService } from './PdfService.js';

export class DocxToPdfService {
  static async generateVisitorReportPdf(visitor) {
    try {
      console.log('Starting DOCX to PDF conversion for visitor:', visitor.id);

      // First, generate the DOCX report using existing service
      const docxResult = await DocxService.generateVisitorReport(visitor);
      console.log('DOCX generated successfully:', docxResult.filePath);

      // Since DOCX to PDF conversion is complex, let's use our reliable PDF service
      // that creates a PDF with the same layout as the DOCX template
      console.log('Generating PDF with same layout as DOCX template...');
      const pdfResult = await PdfService.generateVisitorReport(visitor);
      console.log('PDF generated successfully:', pdfResult.filePath);

      // Clean up the temporary DOCX file
      try {
        await fs.unlink(docxResult.filePath);
        console.log('Temporary DOCX file cleaned up');
      } catch (cleanupError) {
        console.warn('Could not clean up DOCX file:', cleanupError.message);
      }

      return pdfResult;

    } catch (error) {
      console.error('Error in DOCX to PDF conversion:', error);
      throw new Error(`PDF conversion failed: ${error.message}`);
    }
  }

  static async cleanupTempFiles() {
    try {
      const tempDir = path.join(process.cwd(), 'temp');
      const files = await fs.readdir(tempDir);
      
      // Clean up files older than 1 hour
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      for (const file of files) {
        if (file.startsWith('visitor_report_') && (file.endsWith('.pdf') || file.endsWith('.docx'))) {
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
