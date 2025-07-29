import express from 'express';
import { Visitor } from '../models/Visitor.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { DocxService } from '../services/DocxService.js';
import ExcelJS from 'exceljs';

const router = express.Router();

// Generate and export reports
router.get('/export', authenticateToken, authorizeRole(['Admin', 'Receptionist']), async (req, res) => {
  try {
    const { startDate, endDate, unit, purpose, status, type = 'visitors', format = 'excel' } = req.query;
    
    // Build filters
    const filters = {};
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }
    if (unit && unit !== 'All Units') filters.location = unit;
    if (purpose && purpose !== 'All Purposes') filters.purpose = purpose;

    // Get visitors data
    const visitors = await Visitor.findAll(filters);
    
    // Filter by status if specified
    let filteredVisitors = visitors;
    if (status && status !== 'all') {
      if (status === 'active') {
        filteredVisitors = visitors.filter(v => !v.check_out_time);
      } else if (status === 'completed') {
        filteredVisitors = visitors.filter(v => v.check_out_time);
      }
    }

    // Generate different report types
    let reportData;
    switch (type) {
      case 'summary':
        reportData = generateSummaryReport(filteredVisitors);
        break;
      case 'units':
        reportData = generateUnitsReport(filteredVisitors);
        break;
      case 'daily':
        reportData = generateDailyReport(filteredVisitors);
        break;
      default:
        reportData = filteredVisitors;
    }    // Export in different formats
    if (format === 'excel') {
      const buffer = await generateExcelReport(reportData, type);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buffer);
    } else if (format === 'csv') {
      const csv = generateCSVReport(reportData, type);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_report_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else if (format === 'docx') {
      // For DOCX, we'll generate individual visitor reports
      if (reportData.length === 1) {
        // Single visitor report
        const result = await DocxService.generateVisitorReport(reportData[0]);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=${result.fileName}`);
        res.send(result.buffer);
      } else {
        // Multiple visitors - send first one as example or return error
        res.status(400).json({
          success: false,
          message: 'DOCX format is only available for individual visitor reports. Please select a single visitor.'
        });
      }
    } else {
      res.json({
        success: true,
        data: reportData,
        total: reportData.length
      });
    }
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting report'
    });
  }
});

// Get report statistics
router.get('/stats', authenticateToken, authorizeRole(['Admin', 'Receptionist']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filters = {};
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }

    const visitors = await Visitor.findAll(filters);
    
    const stats = {
      totalVisitors: visitors.length,
      activeVisitors: visitors.filter(v => !v.check_out_time).length,
      completedVisitors: visitors.filter(v => v.check_out_time).length,
      todayVisitors: visitors.filter(v => {
        const today = new Date().toISOString().split('T')[0];
        const visitDate = new Date(v.check_in_time).toISOString().split('T')[0];
        return visitDate === today;
      }).length,
      unitBreakdown: generateUnitBreakdown(visitors),
      purposeBreakdown: generatePurposeBreakdown(visitors),
      dailyTrend: generateDailyTrend(visitors)
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get report stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting report statistics'
    });
  }
});

// Generate DOCX report for individual visitor
router.get('/visitor/:id/docx', authenticateToken, authorizeRole(['Admin', 'Receptionist']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get visitor data
    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }
    
    // Generate DOCX report
    const result = await DocxService.generateVisitorReport(visitor);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=${result.fileName}`);
    res.send(result.buffer);
    
  } catch (error) {
    console.error('Generate visitor DOCX error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating visitor report'
    });
  }
});

// Helper functions
function generateSummaryReport(visitors) {
  const units = {};
  const purposes = {};
  const dailyStats = {};

  visitors.forEach(visitor => {
    // Unit stats
    const unit = visitor.location || 'Unknown';
    units[unit] = (units[unit] || 0) + 1;

    // Purpose stats
    const purpose = visitor.purpose || 'Unknown';
    purposes[purpose] = (purposes[purpose] || 0) + 1;

    // Daily stats
    const date = new Date(visitor.check_in_time).toISOString().split('T')[0];
    dailyStats[date] = (dailyStats[date] || 0) + 1;
  });

  return {
    totalVisitors: visitors.length,
    unitStats: Object.entries(units).map(([unit, count]) => ({ unit, count })),
    purposeStats: Object.entries(purposes).map(([purpose, count]) => ({ purpose, count })),
    dailyStats: Object.entries(dailyStats).map(([date, count]) => ({ date, count }))
  };
}

function generateUnitsReport(visitors) {
  const units = {};
  
  visitors.forEach(visitor => {
    const unit = visitor.location || 'Unknown';
    if (!units[unit]) {
      units[unit] = {
        unit,
        visitors: [],
        totalVisitors: 0,
        activeVisitors: 0,
        completedVisitors: 0
      };
    }
    
    units[unit].visitors.push(visitor);
    units[unit].totalVisitors++;
    
    if (visitor.check_out_time) {
      units[unit].completedVisitors++;
    } else {
      units[unit].activeVisitors++;
    }
  });

  return Object.values(units);
}

function generateDailyReport(visitors) {
  const daily = {};
  
  visitors.forEach(visitor => {
    const date = new Date(visitor.check_in_time).toISOString().split('T')[0];
    if (!daily[date]) {
      daily[date] = {
        date,
        visitors: [],
        totalVisitors: 0,
        activeVisitors: 0,
        completedVisitors: 0
      };
    }
    
    daily[date].visitors.push(visitor);
    daily[date].totalVisitors++;
    
    if (visitor.check_out_time) {
      daily[date].completedVisitors++;
    } else {
      daily[date].activeVisitors++;
    }
  });

  return Object.values(daily).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function generateUnitBreakdown(visitors) {
  const breakdown = {};
  visitors.forEach(visitor => {
    const unit = visitor.location || 'Unknown';
    breakdown[unit] = (breakdown[unit] || 0) + 1;
  });
  return Object.entries(breakdown).map(([unit, count]) => ({ unit, count }));
}

function generatePurposeBreakdown(visitors) {
  const breakdown = {};
  visitors.forEach(visitor => {
    const purpose = visitor.purpose || 'Unknown';
    breakdown[purpose] = (breakdown[purpose] || 0) + 1;
  });
  return Object.entries(breakdown).map(([purpose, count]) => ({ purpose, count }));
}

function generateDailyTrend(visitors) {
  const trend = {};
  visitors.forEach(visitor => {
    const date = new Date(visitor.check_in_time).toISOString().split('T')[0];
    trend[date] = (trend[date] || 0) + 1;
  });
  return Object.entries(trend).map(([date, count]) => ({ date, count }));
}

async function generateExcelReport(data, type) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  if (type === 'visitors') {
    // Visitor report headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'full_name', width: 25 },
      { header: 'Phone', key: 'phone_number', width: 15 },
      { header: 'Institution', key: 'institution', width: 25 },
      { header: 'Purpose', key: 'purpose', width: 25 },
      { header: 'Person to Meet', key: 'person_to_meet', width: 20 },
      { header: 'Unit', key: 'location', width: 20 },
      { header: 'Check In', key: 'check_in_time', width: 20 },
      { header: 'Check Out', key: 'check_out_time', width: 20 },
      { header: 'Operator', key: 'input_by_name', width: 20 }
    ];
    
    data.forEach(visitor => {
      worksheet.addRow({
        ...visitor,
        check_in_time: new Date(visitor.check_in_time).toLocaleString('id-ID'),
        check_out_time: visitor.check_out_time ? new Date(visitor.check_out_time).toLocaleString('id-ID') : '-'
      });
    });
  } else if (type === 'summary') {
    // Summary report
    worksheet.addRow(['VISITOR SUMMARY REPORT']);
    worksheet.addRow([]);
    worksheet.addRow(['Total Visitors:', data.totalVisitors]);
    worksheet.addRow([]);
    
    worksheet.addRow(['UNIT BREAKDOWN']);
    worksheet.addRow(['Unit', 'Count']);
    data.unitStats.forEach(stat => {
      worksheet.addRow([stat.unit, stat.count]);
    });
    
    worksheet.addRow([]);
    worksheet.addRow(['PURPOSE BREAKDOWN']);
    worksheet.addRow(['Purpose', 'Count']);
    data.purposeStats.forEach(stat => {
      worksheet.addRow([stat.purpose, stat.count]);
    });
  }

  return await workbook.xlsx.writeBuffer();
}

function generateCSVReport(data, type) {
  if (type === 'visitors') {
    const headers = ['ID', 'Name', 'Phone', 'Institution', 'Purpose', 'Person to Meet', 'Unit', 'Check In', 'Check Out', 'Operator'];
    const rows = data.map(visitor => [
      visitor.id,
      visitor.full_name,
      visitor.phone_number,
      visitor.institution,
      visitor.purpose,
      visitor.person_to_meet,
      visitor.location,
      new Date(visitor.check_in_time).toLocaleString('id-ID'),
      visitor.check_out_time ? new Date(visitor.check_out_time).toLocaleString('id-ID') : '-',
      visitor.input_by_name
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
  return '';
}

export default router;
