import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Modern color palette
const COLORS = {
  primary: '#0074c1',
  secondary: '#6c757d',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
  info: '#17a2b8',
  light: '#f8f9fa',
  dark: '#343a40',
  white: '#ffffff',
  black: '#000000',
  gray: {
    100: '#f8f9fa',
    200: '#e9ecef',
    300: '#dee2e6',
    400: '#ced4da',
    500: '#adb5bd',
    600: '#6c757d',
    700: '#495057',
    800: '#343a40',
    900: '#212529'
  }
};

function drawRoundedRect(doc, x, y, width, height, radius, fillColor = null, strokeColor = null) {
  doc.save();
  if (fillColor) doc.fillColor(fillColor);
  if (strokeColor) doc.strokeColor(strokeColor);
  doc.moveTo(x + radius, y);
  doc.lineTo(x + width - radius, y);
  doc.quadraticCurveTo(x + width, y, x + width, y + radius);
  doc.lineTo(x + width, y + height - radius);
  doc.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  doc.lineTo(x + radius, y + height);
  doc.quadraticCurveTo(x, y + height, x, y + height - radius);
  doc.lineTo(x, y + radius);
  doc.quadraticCurveTo(x, y, x + radius, y);
  doc.closePath();
  if (fillColor) doc.fill();
  if (strokeColor) doc.stroke();
  doc.restore();
}

function drawModernHeader(doc, title, subtitle, logoPath = null) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const headerHeight = 80;
  const startY = doc.y;
  drawRoundedRect(doc, doc.x, startY, pageWidth, headerHeight, 8, COLORS.primary);
  if (logoPath && fs.existsSync(logoPath)) {
    doc.image(logoPath, doc.x + 20, startY + 15, { width: 50, height: 50 });
    doc.x = doc.x + 80;
  }
  doc.fillColor(COLORS.white)
    .fontSize(24)
    .font('Helvetica-Bold')
    .text(title, doc.x, startY + 20);
  doc.fontSize(14)
    .font('Helvetica')
    .text(subtitle, doc.x, startY + 50);
  doc.y = startY + headerHeight + 20;
  doc.x = doc.page.margins.left;
}

function drawModernCard(doc, x, y, width, height, title, content, color = COLORS.light) {
  const cardPadding = 15;
  const titleHeight = 30;
  drawRoundedRect(doc, x, y, width, height, 8, color, COLORS.gray[300]);
  drawRoundedRect(doc, x, y, width, titleHeight, 8, COLORS.primary);
  doc.fillColor(COLORS.white)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(title, x + cardPadding, y + 8);
  doc.fillColor(COLORS.dark)
    .fontSize(10)
    .font('Helvetica')
    .text(content, x + cardPadding, y + titleHeight + 8, {
      width: width - (cardPadding * 2),
      align: 'left'
    });
}

function drawModernTable(doc, headers, data, startY, tableWidth) {
  const rowHeight = 25;
  const headerHeight = 35;
  const cellPadding = 10;
  const columnWidth = tableWidth / headers.length;
  drawRoundedRect(doc, doc.x, startY, tableWidth, headerHeight, 8, COLORS.primary);
  headers.forEach((header, index) => {
    doc.fillColor(COLORS.white)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(header, doc.x + (index * columnWidth) + cellPadding, startY + 10, {
        width: columnWidth - (cellPadding * 2),
        align: 'left'
      });
  });
  data.forEach((row, rowIndex) => {
    const rowY = startY + headerHeight + (rowIndex * rowHeight);
    const rowColor = rowIndex % 2 === 0 ? COLORS.white : COLORS.gray[100];
    drawRoundedRect(doc, doc.x, rowY, tableWidth, rowHeight, 0, rowColor);
    headers.forEach((header, colIndex) => {
      const cellValue = row[header] || '';
      doc.fillColor(COLORS.dark)
        .fontSize(10)
        .font('Helvetica')
        .text(cellValue.toString(), doc.x + (colIndex * columnWidth) + cellPadding, rowY + 8, {
          width: columnWidth - (cellPadding * 2),
          align: 'left'
        });
    });
  });
  return startY + headerHeight + (data.length * rowHeight);
}

function drawModernChartPlaceholder(doc, x, y, width, height, title) {
  drawRoundedRect(doc, x, y, width, height, 8, COLORS.gray[100], COLORS.gray[300]);
  doc.fillColor(COLORS.dark)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(title, x + 15, y + 15);
  const barWidth = 20;
  const barSpacing = 30;
  const maxBarHeight = height - 60;
  const startX = x + 50;
  const startY = y + height - 30;
  const values = [75, 85, 60, 90, 70];
  const maxValue = Math.max(...values);
  values.forEach((value, index) => {
    const barHeight = (value / maxValue) * maxBarHeight;
    const barX = startX + (index * barSpacing);
    const barY = startY - barHeight;
    const color = value >= 80 ? COLORS.success : value >= 60 ? COLORS.warning : COLORS.danger;
    drawRoundedRect(doc, barX, barY, barWidth, barHeight, 2, color);
    doc.fillColor(COLORS.dark)
      .fontSize(8)
      .font('Helvetica')
      .text(value + '%', barX, barY - 15, { width: barWidth, align: 'center' });
  });
}

function drawModernFooter(doc, companyName = 'Atithi Paper LLP') {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const footerHeight = 40;
  const footerY = doc.page.height - doc.page.margins.bottom - footerHeight;
  drawRoundedRect(doc, doc.x, footerY, pageWidth, footerHeight, 8, COLORS.gray[800]);
  doc.fillColor(COLORS.white)
    .fontSize(10)
    .font('Helvetica')
    .text(`${companyName} - Report generated on ${new Date().toLocaleString()}`, doc.x + 20, footerY + 12);
  doc.text(`Page ${doc.bufferedPageRange().first} of ${doc.bufferedPageRange().last}`, doc.x + pageWidth - 100, footerY + 12);
}

function generateDailyAttendancePDF(data, res) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 30,
    bufferPages: true,
    info: {
      Title: 'Daily Attendance Report',
      Author: 'Atithi Paper LLP',
      Subject: 'Employee Attendance Report',
      Keywords: 'attendance, report, employees',
      CreationDate: new Date()
    }
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="daily-attendance-${data.date}.pdf"`);
  doc.pipe(res);

  // Title
  doc.fontSize(20)
    .font('Helvetica-Bold')
    .fillColor('#1f2937')
    .text('Attendance Records', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(12)
    .font('Helvetica')
    .fillColor('#6b7280')
    .text(`Showing ${data.employees.length} records for ${data.date}`, { align: 'center' });
  doc.moveDown(1.5);

  // Fixed pixel widths for columns
  const headers = [
    'Employee',
    'Department',
    'Check In',
    'Check Out',
    'Total Hours',
    'OT Hours',
    'Status',
    'Punch Image'
  ];
  const columnWidths = [
    110, // Employee
    100, // Department
    60,  // Check In
    60,  // Check Out
    60,  // Total Hours
    60,  // OT Hours
    60,  // Status
    60   // Punch Image
  ];
  const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
  const rowHeight = 36;
  const headerHeight = 36;
  const cellPadding = 6;

  // Draw header row
  let y = doc.y;
  let x = doc.x;
  doc.rect(x, y, tableWidth, headerHeight).fill('#f8fafc');
  let colX = x;
  headers.forEach((header, i) => {
    doc.fillColor('#374151')
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(header, colX + cellPadding, y + 14, {
        width: columnWidths[i] - 2 * cellPadding,
        align: 'left',
        lineBreak: false,
        ellipsis: true
      });
    colX += columnWidths[i];
  });
  y += headerHeight;

  // Draw data rows
  data.employees.forEach((emp, index) => {
    x = doc.x;
    let colX = x;
    const rowColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    doc.rect(x, y, tableWidth, rowHeight).fill(rowColor);

    // Employee (name + empId)
    doc.fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(emp.name || 'N/A', colX + cellPadding, y + 8, {
        width: columnWidths[0] - 2 * cellPadding,
        align: 'left',
        lineBreak: false,
        ellipsis: true
      });
    doc.fillColor('#6b7280')
      .font('Helvetica')
      .fontSize(9)
      .text(emp.empId || 'N/A', colX + cellPadding, y + 22, {
        width: columnWidths[0] - 2 * cellPadding,
        align: 'left',
        lineBreak: false,
        ellipsis: true
      });
    colX += columnWidths[0];

    // Department (department + designation)
    doc.fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(emp.department || 'N/A', colX + cellPadding, y + 8, {
        width: columnWidths[1] - 2 * cellPadding,
        align: 'left',
        lineBreak: false,
        ellipsis: true
      });
    doc.fillColor('#6b7280')
      .font('Helvetica')
      .fontSize(9)
      .text(emp.designation || 'N/A', colX + cellPadding, y + 22, {
        width: columnWidths[1] - 2 * cellPadding,
        align: 'left',
        lineBreak: false,
        ellipsis: true
      });
    colX += columnWidths[1];

    // Check In
    const checkInColor = emp.checkIn && emp.checkIn !== '—' ? '#059669' : '#6b7280';
    doc.fillColor(checkInColor)
      .font('Helvetica')
      .fontSize(10)
      .text(emp.checkIn || '—', colX + cellPadding, y + 14, {
        width: columnWidths[2] - 2 * cellPadding,
        align: 'left',
        lineBreak: false,
        ellipsis: true
      });
    colX += columnWidths[2];

    // Check Out
    const checkOutColor = emp.checkOut && emp.checkOut !== '—' ? '#2563eb' : '#6b7280';
    doc.fillColor(checkOutColor)
      .font('Helvetica')
      .fontSize(10)
      .text(emp.checkOut || '—', colX + cellPadding, y + 14, {
        width: columnWidths[3] - 2 * cellPadding,
        align: 'left',
        lineBreak: false,
        ellipsis: true
      });
    colX += columnWidths[3];

    // Total Hours
    const totalHoursColor = emp.totalHours && emp.totalHours !== '—' ? '#7c3aed' : '#6b7280';
    doc.fillColor(totalHoursColor)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(emp.totalHours && emp.totalHours !== '—' ? emp.totalHours + 'h' : '—', colX + cellPadding, y + 14, {
        width: columnWidths[4] - 2 * cellPadding,
        align: 'left',
        lineBreak: false,
        ellipsis: true
      });
    colX += columnWidths[4];

    // OT Hours
    const otHoursColor = emp.otHours && emp.otHours !== '—' && parseFloat(emp.otHours) > 0 ? '#ea580c' : '#6b7280';
    doc.fillColor(otHoursColor)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(emp.otHours && emp.otHours !== '—' ? emp.otHours + 'h' : '—', colX + cellPadding, y + 14, {
        width: columnWidths[5] - 2 * cellPadding,
        align: 'left',
        lineBreak: false,
        ellipsis: true
      });
    colX += columnWidths[5];

    // Status
    let statusColor;
    switch (emp.status) {
      case 'Present':
        statusColor = '#166534';
        break;
      case 'On Leave':
        statusColor = '#92400e';
        break;
      case 'IN Only':
        statusColor = '#1e40af';
        break;
      case 'OUT Only':
        statusColor = '#c2410c';
        break;
      default:
        statusColor = '#991b1b';
    }
    doc.fillColor(statusColor)
      .font('Helvetica')
      .fontSize(9)
      .text(emp.status || 'N/A', colX + cellPadding, y + 14, {
        width: columnWidths[6] - 2 * cellPadding,
        align: 'left',
        lineBreak: false,
        ellipsis: true
      });
    colX += columnWidths[6];

    // Punch Image
    doc.fillColor('#6b7280')
      .font('Helvetica')
      .fontSize(9)
      .text(emp.imageUrl && emp.imageUrl !== '' ? 'Yes' : '—', colX + cellPadding, y + 14, {
        width: columnWidths[7] - 2 * cellPadding,
        align: 'left',
        lineBreak: false,
        ellipsis: true
      });

    y += rowHeight;

    // Page break if needed
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 40) {
      doc.addPage();
      y = doc.y;
      colX = doc.x;
      doc.rect(colX, y, tableWidth, headerHeight).fill('#f8fafc');
      headers.forEach((header, i) => {
        doc.fillColor('#374151')
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(header, colX + cellPadding, y + 14, {
            width: columnWidths[i] - 2 * cellPadding,
            align: 'left',
            lineBreak: false,
            ellipsis: true
          });
        colX += columnWidths[i];
      });
      y += headerHeight;
    }
  });

  // Footer
  doc.moveDown(2);
  doc.fontSize(9)
    .font('Helvetica')
    .fillColor('#9ca3af')
    .text(`Report generated on ${new Date().toLocaleString()}`, { align: 'center' })
    .text('Atithi Paper LLP - Attendance Management System', { align: 'center' });
  doc.end();
}

function generateMonthlyAttendancePDF(data, res) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    bufferPages: true,
    info: {
      Title: 'Monthly Attendance Report',
      Author: 'Atithi Paper LLP',
      Subject: 'Monthly Employee Attendance Analysis',
      Keywords: 'monthly, attendance, analysis, trends',
      CreationDate: new Date()
    }
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="monthly-attendance-${data.month}.pdf"`);
  doc.pipe(res);
  drawModernHeader(doc, 'Monthly Attendance Report', `Atithi Paper LLP - ${data.month}`, null);
  doc.fillColor(COLORS.dark)
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('Monthly Summary', doc.x, doc.y);
  doc.y += 20;
  const cardWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 30) / 3;
  const cardHeight = 100;
  const cardY = doc.y;
  drawModernCard(doc, doc.x, cardY, cardWidth, cardHeight, 'Total Employees', `${data.totalEmployees}`, COLORS.primary);
  drawModernCard(doc, doc.x + cardWidth + 15, cardY, cardWidth, cardHeight, 'Avg. Attendance', `${data.averageAttendance}%`, COLORS.success);
  drawModernCard(doc, doc.x + (cardWidth + 15) * 2, cardY, cardWidth, cardHeight, 'Total Present Days', `${data.totalPresentDays}`, COLORS.info);
  doc.y = cardY + cardHeight + 30;
  const chartWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const chartHeight = 200;
  drawModernChartPlaceholder(doc, doc.x, doc.y, chartWidth, chartHeight, 'Monthly Attendance Trends');
  doc.y += chartHeight + 30;
  const tableHeaders = ['Employee', 'Department', 'Present Days', 'Absent Days', 'Attendance Rate', 'Status'];
  const tableData = data.employeeData.map(emp => ({
    'Employee': emp.name,
    'Department': emp.department,
    'Present Days': emp.present,
    'Absent Days': emp.absent,
    'Attendance Rate': `${emp.attendanceRate}%`,
    'Status': emp.attendanceRate >= 90 ? 'Excellent' : emp.attendanceRate >= 80 ? 'Good' : 'Needs Attention'
  }));
  const tableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  drawModernTable(doc, tableHeaders, tableData, doc.y, tableWidth);
  drawModernFooter(doc);
  doc.end();
}

function generateManualAttendancePDF(data, res) {
  try {
    // Config / theme
    const PAGE_WIDTH = 595.28; // A4 points width (72 DPI)
    const PAGE_HEIGHT = 841.89; // A4 points height
    const MARGIN = 40;
    const COLORS = {
      primary: '#0f172a', // dark slate
      accent: '#0ea5a4', // teal-ish accent
      muted: '#6b7280',
      lightGray: '#f3f4f6',
      tableHeaderBg: '#0ea5a4',
      tableHeaderText: '#ffffff',
      rowAlt: '#ffffff',
      rowAlt2: '#f8fafc',
      success: '#16a34a',
      danger: '#dc2626',
      warning: '#f59e0b',
      text: '#111827'
    };

    // Fonts - replace with your own paths if needed
    const FONT_REGULAR = typeof __dirname !== 'undefined' ? `${__dirname}/fonts/Inter-Regular.ttf` : null;
    const FONT_BOLD = typeof __dirname !== 'undefined' ? `${__dirname}/fonts/Inter-Bold.ttf` : null;
    const hasCustomFonts = (FONT_REGULAR && FONT_BOLD && fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD));

    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      bufferPages: true,
      autoFirstPage: false,
      info: {
        Title: 'Manual Monthly Attendance Report',
        Author: 'Atithi Paper LLP',
        Subject: 'Manual Employee Attendance Report',
        Keywords: 'attendance, manual, report, employees',
        CreationDate: new Date()
      }
    });

    // Setup response headers
    const filename = `manual-attendance-${data.employeeId || 'NA'}-${data.year}-${String(data.month).padStart(2, '0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Register fonts if available
    if (hasCustomFonts) {
      try {
        doc.registerFont('Regular', FONT_REGULAR);
        doc.registerFont('Bold', FONT_BOLD);
      } catch (e) {
        // fallback to built-ins if custom fonts fail
        console.error('Font registration error:', e);
      }
    }

    const FONT = {
      regular: hasCustomFonts ? 'Regular' : 'Helvetica',
      bold: hasCustomFonts ? 'Bold' : 'Helvetica-Bold'
    };

    // Layout metrics
    const headerHeight = 80;
    const footerHeight = 50;
    const contentTopStart = MARGIN + headerHeight;
    const usableHeight = PAGE_HEIGHT - MARGIN - headerHeight - footerHeight - MARGIN;
    const lineHeight = 14;

    // Table column widths (make sure sum <= page width - margins*2)
    const columnWidths = {
      date: 70,
      day: 60,
      status: 90,
      checkIn: 70,
      checkOut: 70,
      nightShift: 70
    };
    const tableX = MARGIN;
    const tableWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);
    const rowHeight = 24;
    const headerRowHeight = 30;
    const rowsPerPage = Math.floor(usableHeight / rowHeight) - 4; // leave room for title/totals

    // Helpers: header & footer repeated on each page
    function addPageWithHeaderFooter() {
      doc.addPage({ margin: MARGIN, size: 'A4' });
      // Header
      const leftX = MARGIN;
      let y = MARGIN;

      // Logo (if provided)
      if (data.logoPath) {
        try {
          doc.image(data.logoPath, leftX, y - 6, { width: 60, height: 60 });
        } catch (e) {
          // ignore image errors
          console.error('Logo image error:', e);
        }
      }

      // Company & report title
      const titleX = leftX + (data.logoPath ? 70 : 0);
      doc
        .font(FONT.bold)
        .fontSize(14)
        .fillColor(COLORS.primary)
        .text(data.companyName || 'Company', titleX, y, { continued: false });

      doc
        .font(FONT.regular)
        .fontSize(10)
        .fillColor(COLORS.muted)
        .text(data.companyAddress || '', titleX, y + 18, { continued: false });

      // Report title on right
      const rightBoxX = PAGE_WIDTH - MARGIN - 200;
      doc
        .font(FONT.bold)
        .fontSize(12)
        .fillColor(COLORS.primary)
        .text('Manual Monthly Attendance', rightBoxX, y, { width: 200, align: 'right' });

      doc
        .font(FONT.regular)
        .fontSize(10)
        .fillColor(COLORS.muted)
        .text(`${data.monthName} ${data.year}`, rightBoxX, y + 18, { width: 200, align: 'right' });

      // Subheader info (employee)
      const subY = y + 44;
      doc.moveTo(MARGIN, subY - 6).lineTo(PAGE_WIDTH - MARGIN, subY - 6).strokeColor(COLORS.lightGray).lineWidth(0.5).stroke();
      doc.font(FONT.regular).fontSize(10).fillColor(COLORS.text);
      doc.text(`Employee: `, leftX, subY, { continued: true });
      doc.font(FONT.bold).text(`${data.employeeName || 'N/A'}`, { continued: true });
      doc.font(FONT.regular).text(`  (${data.employeeId || 'N/A'})`, { align: 'left' });

      // Meta right
      const metaX = PAGE_WIDTH - MARGIN - 200;
      doc.font(FONT.regular).fontSize(9).fillColor(COLORS.muted);
      doc.text(`Generated: ${new Date().toLocaleString()}`, metaX, subY);

      // Move cursor to content top
      doc.y = subY + 20;
      doc.x = tableX;
    }

    // Draw table header with background
    function drawTableHeader(yPos) {
      let x = tableX;
      // background
      doc.rect(x, yPos, tableWidth, headerRowHeight).fill(COLORS.tableHeaderBg);
      // Header labels
      const headers = ['Date', 'Day', 'Status', 'Check In', 'Check Out', 'Night Shift'];
      const widths = Object.values(columnWidths);
      doc.fillColor(COLORS.tableHeaderText).font(FONT.bold).fontSize(10);
      headers.forEach((h, i) => {
        const cellX = x + (i === 0 ? 0 : widths.slice(0, i).reduce((a, b) => a + b, 0));
        doc.text(h, cellX + 6, yPos + 8, { width: widths[i] - 12, align: 'left' });
      });
      // reset fill
      doc.fillColor(COLORS.text);
    }

    // Draw a single row at y position
    function drawRow(day, rowIndex, yPos) {
      const x = tableX;
      const widths = Object.values(columnWidths);
      // Alternate row background
      const bg = rowIndex % 2 === 0 ? COLORS.rowAlt : COLORS.rowAlt2;
      doc.rect(x, yPos, tableWidth, rowHeight).fill(bg);
      // Status color mapping
      let statusFill = COLORS.muted;
      if (day.punchStatus === 'Present') statusFill = COLORS.success;
      else if (day.punchStatus === 'Absent') statusFill = COLORS.danger;
      else if (day.punchStatus === 'In Only') statusFill = COLORS.warning;

      doc.font(FONT.regular).fontSize(9).fillColor(COLORS.text);
      // Date
      doc.text(day.date, x + 6, yPos + 7, { width: widths[0] - 12 });
      // Day
      doc.text(day.day, x + widths[0] + 6, yPos + 7, { width: widths[1] - 12 });
      // Status (colored)
      doc.fillColor(statusFill).text(day.punchStatus, x + widths[0] + widths[1] + 6, yPos + 7, { width: widths[2] - 12 });
      // Reset for rest
      doc.fillColor(COLORS.text);
      // In
      doc.text(day.inTime || '—', x + widths[0] + widths[1] + widths[2] + 6, yPos + 7, { width: widths[3] - 12 });
      // Out
      doc.text(day.outTime || '—', x + widths[0] + widths[1] + widths[2] + widths[3] + 6, yPos + 7, { width: widths[4] - 12 });
      // Night shift
      doc.text(day.isNightShift ? 'Yes' : 'No', x + widths[0] + widths[1] + widths[2] + widths[3] + widths[4] + 6, yPos + 7, { width: widths[5] - 12 });

      // Borders: light grid line around the row
      doc.lineWidth(0.5).strokeColor('#e6e9ee');
      doc.rect(x, yPos, tableWidth, rowHeight).stroke();
    }

    // Totals and legend
    function drawTotalsAndLegend(startY) {
      const leftX = tableX;
      let y = startY;
      const presentCount = data.attendance.filter(d => d.punchStatus === 'Present').length;
      const absentCount = data.attendance.filter(d => d.punchStatus === 'Absent').length;
      const inOnlyCount = data.attendance.filter(d => d.punchStatus === 'In Only').length;

      doc.moveTo(leftX, y).lineTo(PAGE_WIDTH - MARGIN, y).strokeColor(COLORS.lightGray).lineWidth(0.5).stroke();
      y += 8;

      doc.font(FONT.regular).fontSize(10).fillColor(COLORS.text);
      doc.text(`Totals: Present ${presentCount}   |   Absent ${absentCount}   |   In Only ${inOnlyCount}`, leftX, y);
    }

    // Footer drawn on each page bottom
    function drawFooter(pageNumber, totalPages) {
      const y = PAGE_HEIGHT - MARGIN - 30;
      doc.font(FONT.regular).fontSize(9).fillColor(COLORS.muted);
      doc.text(`Page ${pageNumber} of ${totalPages}`, -MARGIN - 40, y, { width: 200, align: 'right' });
    }

    // Build document pages with table pagination
    const rows = data.attendance || [];
    let currentIndex = 0;
    const totalRows = rows.length;

    // We'll store pages to later stamp page numbering
    addPageWithHeaderFooter();
    let currentPage = 1;
    const pageIndices = [1]; // will track page numbers

    while (currentIndex < totalRows) {
      // Draw header area and table header
      const startY = doc.y;
      drawTableHeader(startY);
      let y = startY + headerRowHeight;

      doc.moveTo(tableX, y).lineTo(tableX + tableWidth, y).strokeColor(COLORS.lightGray).lineWidth(0.5).stroke();

      // Fill rows for this page
      let rowsDrawn = 0;
      while (currentIndex < totalRows && rowsDrawn < rowsPerPage) {
        const day = rows[currentIndex];
        drawRow(day, rowsDrawn, y + rowsDrawn * rowHeight);
        rowsDrawn++;
        currentIndex++;
      }

      // After rows, draw totals & signature block if we have space else create new page
      const afterTableY = y + rowsDrawn * rowHeight + 10;
      const spaceNeeded = 90; // estimate for totals + signatures
      if (afterTableY + spaceNeeded + footerHeight + MARGIN > PAGE_HEIGHT) {
        // not enough space -> create new page
        addPageWithHeaderFooter();
        currentPage++;
        pageIndices.push(currentPage);
        continue; // next loop will draw more rows on new page
      } else {
        // draw totals, legend, signature block
        drawTotalsAndLegend(afterTableY);
        // drawSignatureBlock(afterTableY + 30); // This function is not defined, so we'll skip it
        // done, but maybe there are more rows: if yes, create new page and continue
        if (currentIndex < totalRows) {
          addPageWithHeaderFooter();
          currentPage++;
          pageIndices.push(currentPage);
          continue;
        }
      }
    }

    // Add footer (page numbers) to all pages
    const range = doc.bufferedPageRange(); // { start: 0, count: n }
    const totalPages = range.count;
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      drawFooter(i + 1, totalPages);
    }

    // Finalize the PDF and end the stream
    doc.end();
  } catch (err) {
    console.error('PDF Generation Error:', err);
    // If headers haven't been sent yet, send an error response
    if (!res.headersSent) {
      res.status(500).json({ error: 'PDF generation failed', details: err.message });
    }
  }
}

function generatePayslipPDF(data, res) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    bufferPages: true,
    info: {
      Title: `Payslip - ${data.empId}`,
      Author: 'Atithi Paper LLP',
      Subject: 'Employee Payslip',
      Keywords: 'payslip, salary, employee',
      CreationDate: new Date()
    }
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="payslip-${data.empId}-${data.month}.pdf"`);
  doc.pipe(res);
  drawModernHeader(doc, 'EMPLOYEE PAYSLIP', `Atithi Paper LLP - ${data.month}`, null);
  doc.fillColor(COLORS.dark)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('Employee Information', doc.x, doc.y);
  doc.y += 20;
  const detailCardWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 20) / 2;
  const detailCardHeight = 120;
  drawModernCard(doc, doc.x, doc.y, detailCardWidth, detailCardHeight, 'Personal Details',
    `Name: ${data.name}\nEmployee ID: ${data.empId}\nDesignation: ${data.designation}\nDepartment: ${data.department}`,
    COLORS.gray[100]);
  drawModernCard(doc, doc.x + detailCardWidth + 20, doc.y, detailCardWidth, detailCardHeight, 'Pay Period',
    `Month: ${data.month}\nPaid Days: ${data.paidDays}\nLOP Days: ${data.lopDays}\nOT Hours: ${data.otHours}`,
    COLORS.gray[100]);
  doc.y += detailCardHeight + 30;
  doc.fillColor(COLORS.dark)
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('Salary Breakdown', doc.x, doc.y);
  doc.y += 20;
  const salaryTableHeaders = ['Description', 'Amount'];
  const salaryTableData = [
    { 'Description': 'Basic Salary', 'Amount': `₹${data.basicSalary}` },
    { 'Description': 'HRA', 'Amount': `₹${data.hra}` },
    { 'Description': 'DA', 'Amount': `₹${data.da}` },
    { 'Description': 'Other Allowances', 'Amount': `₹${data.otherAllowances}` },
    { 'Description': 'Gross Salary', 'Amount': `₹${data.grossSalary}` },
    { 'Description': 'PF Deduction', 'Amount': `₹${data.pfDeduction}` },
    { 'Description': 'TDS', 'Amount': `₹${data.tds}` },
    { 'Description': 'Other Deductions', 'Amount': `₹${data.otherDeductions}` },
    { 'Description': 'Net Payable', 'Amount': `₹${data.netPayable}` }
  ];
  const salaryTableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  drawModernTable(doc, salaryTableHeaders, salaryTableData, doc.y, salaryTableWidth);
  doc.y += 30;
  doc.fillColor(COLORS.primary)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(`Net Payable in Words: ${data.netPayableWords}`, doc.x, doc.y);
  doc.y += 20;
  doc.fillColor(COLORS.dark)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('Bank Details', doc.x, doc.y);
  doc.y += 10;
  const bankCardWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const bankCardHeight = 80;
  drawModernCard(doc, doc.x, doc.y, bankCardWidth, bankCardHeight, 'Payment Information',
    `Bank: ${data.bankName}\nAccount No: ${data.accountNo}\nIFSC: ${data.ifsc}\nPayment Mode: ${data.paymentMode}`,
    COLORS.light);
  drawModernFooter(doc);
  doc.end();
}

export {
  generateDailyAttendancePDF,
  generateMonthlyAttendancePDF,
  generateManualAttendancePDF,
  generatePayslipPDF,
  COLORS,
  drawModernHeader,
  drawModernCard,
  drawModernTable,
  drawModernChartPlaceholder,
  drawModernFooter
}; 