// payroll/hr.payroll.controller.js
import { User } from '../../models/user.model.js';
import { AttendanceSession } from '../../models/attendanceSession.model.js';
import { PaidHoliday } from '../../models/paidHoliday.model.js';
import { Leave } from '../../models/leave.model.js';
import { PayrollSnapshot } from '../../models/payrollSnapshot.model.js';
import { SalaryHistory } from '../../models/salaryHistory.model.js';
import mongoose from 'mongoose';
import { validateDatabaseConnection, } from '../../utils/productionExportFixes.js';
import { calculatePayroll, getPayrollForEmployeeWithSnapshot, getMonthlyLeaveSummary, syncCoffBalancesForMonth } from '../../services/payroll.service.js';
import { fetchPayrollDataSafely } from '../../utils/productionExportFixes.js';
import generatePayslipPdf from '../generatePayslipPdf.js';
import { imageFileToDataUri } from '../generatePayslipPdf.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

if (process.env.NODE_ENV === 'development') console.log("=== HR PAYROLL CONTROLLER MODULE LOADED ===");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);




// Fast payroll endpoint for frontend
export const getFastPayroll = async (req, res) => {
  try {
    const [year, month] = req.query.month.split('-').map(Number);

    await syncCoffBalancesForMonth(year, month);
    
    const records = await calculatePayroll({ year, month });

    return res.status(200).json({
      success: true,
      total: records.length,
      records
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};






/**
 * Helper: safe date formatting (DD-MM-YYYY)
 */
function formatDateSafe(d) {
  try {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
  } catch {
    return '';
  }
}

/**
 * Build salary rows for payslip from payroll data
 * @param {Object} payrollRow - Payroll data for an employee
 * @returns {Array} - Array of salary row objects for the payslip template
 */
function buildSalaryRowsFromPayroll(payrollRow) {
  const rows = [];

  const febAdjustment = payrollRow?.febAdjustment ?? 0;
  const extraDayAdjustment = payrollRow?.extraDayAdjustment ?? 0;
  const fixedSalaryAdjustment = payrollRow?.fixedSalaryAdjustment ?? 0;
  const totalAdjustments = febAdjustment + extraDayAdjustment + fixedSalaryAdjustment;

  const earned = payrollRow?.earned ?? 0;
  const phAmount = payrollRow?.phAmount ?? 0;

  rows.push({
    earningFixed: payrollRow?.fixedSalary ?? 0,
    earningEarned: earned.toFixed(2),
    otEarned: payrollRow?.otSalary ?? 0,
    phEarned: phAmount.toFixed(2),
    adjustments: totalAdjustments.toFixed(2),
    earningTotal: payrollRow?.grossSalary?.toFixed(2) ?? '0.00',
    deductionName: '',
    deductionAmount: ''
  });

  // Add all deductions as separate rows (empty earnings columns)
  if (Array.isArray(payrollRow?.deductions)) {
    for (let i = 0; i < payrollRow.deductions.length; i++) {
      const d = payrollRow.deductions[i];
      rows.push({
        earningFixed: '',
        earningEarned: '',
        otEarned: '',
        phEarned: '',
        adjustments: '',
        earningTotal: '',
        deductionName: d.name || '',
        deductionAmount: (d.amount || 0).toFixed(2)
      });
    }
  }



  return rows;
}

/**
 * Convert amount to words (Indian format)
 * Supports Rupees and Paise correctly
 * Example:
 *  29800      -> Rupees Twenty Nine Thousand Eight Hundred Only
 *  29800.50   -> Rupees Twenty Nine Thousand Eight Hundred and Fifty Paise Only
 *  29800.05   -> Rupees Twenty Nine Thousand Eight Hundred and Five Paise Only
 */
export function amountToWords(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    amount = 0;
  }

  const fixed = Number(amount).toFixed(2); // 🔒 keeps paise
  const [rupeesPart, paisePart] = fixed.split('.');

  const rupees = Number(rupeesPart);
  const paise = Number(paisePart);

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six',
    'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
    'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty',
    'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function twoDigits(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }

  function threeDigits(n) {
    let str = '';
    if (Math.floor(n / 100) > 0) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 0) str += twoDigits(n);
    return str.trim();
  }

  function numberToIndianWords(num) {
    if (num === 0) return 'Zero';

    let words = '';

    const crore = Math.floor(num / 10000000);
    num %= 10000000;

    const lakh = Math.floor(num / 100000);
    num %= 100000;

    const thousand = Math.floor(num / 1000);
    num %= 1000;

    if (crore) words += threeDigits(crore) + ' Crore ';
    if (lakh) words += threeDigits(lakh) + ' Lakh ';
    if (thousand) words += threeDigits(thousand) + ' Thousand ';
    if (num) words += threeDigits(num) + ' ';

    return words.trim();
  }

  let result = `Rupees ${numberToIndianWords(rupees)}`;

  if (paise > 0) {
    result += ` and ${twoDigits(paise)} Paise`;
  }

  return result + ' Only';
}




/**
 * Controller: downloadPayslip
 * Route: GET /hr/payroll/payslip/:empId?month=YYYY-MM
 */
export const downloadPayslip = async (req, res) => {
  const { empId } = req.params;
  const monthParam = req.query.month;

  if (!empId) return res.status(400).json({ error: 'empId is required' });
  if (!monthParam || !/^\d{4}-\d{1,2}$/.test(monthParam)) {
    return res.status(400).json({ error: 'month is required (YYYY-MM)' });
  }

  const [yearNum, monthNum] = monthParam.split('-').map(Number);

  try {
    const user = await User.findOne({ empId }).lean();
    if (!user) return res.status(404).json({ error: 'Employee not found' });

    const payrollList = await calculatePayroll({ year: yearNum, month: monthNum });
    const payrollRow = payrollList.find(r => r.empId === empId);

    if (!payrollRow) {
      return res.status(404).json({ error: 'Payroll not found' });
    }


    const data = {
      // ===== Employee =====
      empId,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      joiningDate: formatDateSafe(user.joiningDate),
      dob: formatDateSafe(user.dob),
      pan: user.pan || '',
      uan: user.uanNo || '',
      pfAccount: user.pfAccount || '',
      esi: user.esi || '',

      designation: user.position || '',
      department: user.department || '',

      // ===== Month =====
      monthYear: `${String(monthNum).padStart(2, '0')}-${yearNum}`,
      totalDays: new Date(yearNum, monthNum, 0).getDate(),

      // ===== Attendance =====
      presentDays: payrollRow.presentDays ?? 0,
      absentDays: payrollRow.absentDays ?? 0,
      paidDays: payrollRow.presentDays ?? 0,
      paidPhDays: payrollRow.phPaid ?? 0,
      otHours: payrollRow.otHours ?? 0,

      // ===== Salary =====
      totalEarnings: payrollRow.grossSalary.toFixed(2),
      totalDeduction: payrollRow.totalDeduction.toFixed(2),
      netPayable: payrollRow.netSalary.toFixed(2),
      netPayableWords: amountToWords(payrollRow.netSalary),

      // ===== Bank =====
      paymentMode: user.paymentMode || 'Bank Transfer',
      bankName: user.bankDetails?.nameOnBank || '',
      accountNo: user.bankDetails?.accountNo || '',
      ifsc: user.bankDetails?.ifsc || '',

      // ===== Table =====
      salaryRows: buildSalaryRowsFromPayroll(payrollRow)
    };


    const netAmount = Number(payrollRow.netSalary || 0);

    // Use the amountToWords function defined in this controller for proper rupees-paise format
    data.netPayableWords = amountToWords(netAmount);


    // Logo (optional)
    const logoPath = path.join(process.cwd(), 'frontend/public/atithi-logo.png');
    if (fsSync.existsSync(logoPath)) data.logoPath = logoPath;

    const tmpDir = path.join(process.cwd(), 'tmp/payslips');
    if (!fsSync.existsSync(tmpDir)) fsSync.mkdirSync(tmpDir, { recursive: true });

    const filename = `payslip_${empId}_${monthParam}.pdf`;
    const outputPdfPath = path.join(tmpDir, filename);

    const resultPath = await generatePayslipPdf(data, outputPdfPath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.download(resultPath, filename, async () => {
      if (fsSync.existsSync(resultPath)) await fs.unlink(resultPath);
    });

  } catch (err) {
    console.error('downloadPayslip error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


/**
 * Controller: previewPayslip
 * Route: GET /hr/payroll/preview/:empId?month=YYYY-MM
 */
export const previewPayslip = async (req, res) => {
  const { empId } = req.params;
  const monthParam = req.query.month;

  if (!empId) return res.status(400).json({ error: 'empId is required' });
  if (!monthParam || !/^\d{4}-\d{1,2}$/.test(monthParam)) {
    return res.status(400).json({ error: 'month is required (YYYY-MM)' });
  }

  const [yearNum, monthNum] = monthParam.split('-').map(Number);

  try {
    const user = await User.findOne({ empId }).lean();
    if (!user) return res.status(404).json({ error: 'Employee not found' });

    const payrollList = await calculatePayroll({ year: yearNum, month: monthNum });
    const payrollRow = payrollList.find(r => r.empId === empId);

    if (!payrollRow) {
      return res.status(404).json({ error: 'Payroll not found' });
    }


    const data = {
      // ===== Employee =====
      empId,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      joiningDate: formatDateSafe(user.joiningDate),
      dob: formatDateSafe(user.dob),
      pan: user.pan || '',
      uan: user.uanNo || '',
      pfAccount: user.pfAccount || '',
      esi: user.esi || '',

      designation: user.position || '',
      department: user.department || '',

      // ===== Month =====
      monthYear: `${String(monthNum).padStart(2, '0')}-${yearNum}`,
      totalDays: new Date(yearNum, monthNum, 0).getDate(),

      // ===== Attendance =====
      presentDays: payrollRow.presentDays ?? 0,
      absentDays: payrollRow.absentDays ?? 0,
      paidDays: payrollRow.presentDays ?? 0,
      paidPhDays: payrollRow.phPaid ?? 0,
      otHours: payrollRow.otHours ?? 0,

      // ===== Salary =====
      totalEarnings: payrollRow.grossSalary.toFixed(2),
      totalDeduction: payrollRow.totalDeduction.toFixed(2),
      netPayable: payrollRow.netSalary.toFixed(2),
      netPayableWords: amountToWords(payrollRow.netSalary),

      // ===== Bank =====
      paymentMode: user.paymentMode || 'Bank Transfer',
      bankName: user.bankDetails?.nameOnBank || '',
      accountNo: user.bankDetails?.accountNo || '',
      ifsc: user.bankDetails?.ifsc || '',

      // ===== Table =====
      salaryRows: buildSalaryRowsFromPayroll(payrollRow)
    };


    const netAmount = Number(payrollRow.netSalary || 0);
    // Use the amountToWords function defined in this controller for proper rupees-paise format
    data.netPayableWords = amountToWords(netAmount);


    const templatePath = path.join(__dirname, '../payslipTemplate.html');
    let template = fsSync.readFileSync(templatePath, 'utf8');

    const html = fillTemplate(template, data);

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);

  } catch (err) {
    console.error('previewPayslip error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


// Helper function to fill template with data
function fillTemplate(template, data) {
  let html = template;

  console.log('=== FILL TEMPLATE DEBUG ===');
  // Log top-level primitive keys and indicators for non-primitives
  const keys = Object.keys(data || {});
  console.log('Template variables to replace:', keys.map(k => {
    const v = data[k];
    if (v === null || v === undefined) return `${k}:<empty>`;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return `${k}:${String(v)}`.slice(0, 120);
    if (Array.isArray(v)) return `${k}:<array length=${v.length}>`;
    if (typeof v === 'object') return `${k}:<object>`;
    return `${k}:<${typeof v}>`;
  }));

  // Handle salaryRows first (special Mustache-like block)
  if (Array.isArray(data.salaryRows)) {
    let rowsHtml = '';
    data.salaryRows.forEach(row => {
      // Build a row using the same columns you expect
      // Be sure to safely coerce values to strings
      const safe = (val) => {
        try {
          if (val === null || val === undefined) return '';
          if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
          if (Array.isArray(val)) return val.join(', ');
          // For objects, try JSON.stringify but guard against circular
          try { return JSON.stringify(val); } catch { return ''; }
        } catch { return ''; }
      };

      rowsHtml += `<tr>
        <td>${safe(row.earningFixed)}</td>
        <td>${safe(row.earningEarned)}</td>
        <td>${safe(row.otEarned)}</td>
        <td>${safe(row.phEarned)}</td>
        <td>${safe(row.adjustments)}</td>
        <td>${safe(row.earningTotal)}</td>
        <td>${safe(row.deductionName)}</td>
        <td>${safe(row.deductionAmount)}</td>
      </tr>\n`;
    });

    // Replace the whole block between {{#salaryRows}} and {{/salaryRows}}
    html = html.replace(/{{#salaryRows}}[\s\S]*?{{\/salaryRows}}/, rowsHtml);
  }

  // Now replace primitive placeholders only (skip arrays/objects)
  for (const key of keys) {
    if (key === 'salaryRows') continue; // already handled

    const value = data[key];
    // Only replace for primitive values
    if (value === null || value === undefined) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), '');
      continue;
    }

    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      // Use a safe string coercion
      const safe = String(value);
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), safe);
      console.log(`Replacing {{${key}}} => ${safe.length > 120 ? safe.slice(0, 120) + '...' : safe}`);
    } else {
      // Non-primitive: skip replacing (developers can add handlers if needed)
      console.log(`Skipping non-primitive key for replacement: ${key} (type=${t})`);
    }
  }

  console.log('=== END FILL TEMPLATE DEBUG ===');
  return html;
}

// Export bank sheet
export const exportBankSheet = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: "Month is required (YYYY-MM)" });

    // Parse month and year
    const [year, monthNum] = month.split("-").map(Number);
    if (!year || !monthNum) {
      return res.status(400).json({ error: "Invalid month format. Use YYYY-MM" });
    }

    // Import professional Excel export utilities
    const {
      createProfessionalWorkbook,
      addProfessionalHeader,
      styleHeaderRow,
      applyProfessionalStyling,
      styleTotalsRow,
      formatCurrency,
      createProfessionalFilename
    } = await import('../../utils/professionalExcelExport.js');

    // Get payroll data using the existing service function
    const payrollData = { records: await calculatePayroll({ month: monthNum, year }) };
    let payroll = payrollData.records || [];

    // Get user details for all employees
    const empIds = payroll.map(e => e.empId);
    const users = await User.find({ empId: { $in: empIds }, role: { $ne: 'ADMIN' } });
    const userMap = {};
    users.forEach(u => { userMap[u.empId] = u; });

    // Prepare data for Excel
    const headers = ["Emp ID", "Name", "Department", "Bank Name", "Account No", "IFSC", "Net Payable", "Payment Mode"];

    const rows = payroll.map(emp => {
      const user = userMap[emp.empId];
      return [
        emp.empId,
        user ? `${user.firstName} ${user.lastName}` : '',
        user ? (user.department || '') : '',
        user && user.bankDetails ? (user.bankDetails.nameOnBank || '') : '',
        user && user.bankDetails ? (user.bankDetails.accountNo || '') : '',
        user && user.bankDetails ? (user.bankDetails.ifsc || '') : '',
        emp.netSalary || 0,
        user ? (user.paymentMode || 'Bank Transfer') : ''
      ];
    });

    // Calculate total amount
    const totalAmount = payroll.reduce((sum, emp) => sum + (emp.netSalary || 0), 0);

    // Create workbook and worksheet
    const reportTitle = `Bank Transfer Sheet - ${month}`;
    const workbook = createProfessionalWorkbook(reportTitle);
    const sheet = workbook.addWorksheet("Bank Transfers");

    // Add professional header
    addProfessionalHeader(sheet, reportTitle, new Date(), headers.length);

    // Add table title
    const tableStartRow = 5;
    sheet.mergeCells(`A${tableStartRow}:${String.fromCharCode(64 + headers.length)}${tableStartRow}`);
    const titleCell = sheet.getCell(`A${tableStartRow}`);
    titleCell.value = `BANK TRANSFER DETAILS FOR ${month}`;
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.font = { bold: true, size: 12 };

    // Add headers
    const headerRow = sheet.getRow(tableStartRow + 1);
    headerRow.values = headers;
    styleHeaderRow(headerRow);

    // Add data rows
    rows.forEach((row, i) => {
      const r = sheet.addRow(row);
      r.eachCell(cell => {
        cell.alignment = { vertical: "middle", horizontal: "left" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });

      // Right-align numeric columns (Net Payable)
      const netPayableCell = r.getCell(7);
      netPayableCell.alignment = { vertical: "middle", horizontal: "right" };
      if (typeof netPayableCell.value === 'number') {
        netPayableCell.value = formatCurrency(netPayableCell.value);
      }
    });

    // Add totals row
    const totalsRow = sheet.addRow(['', '', '', '', 'TOTAL', totalAmount, '']);
    const totalAmountCell = totalsRow.getCell(7);
    totalAmountCell.value = formatCurrency(totalAmount);
    totalAmountCell.font = { bold: true };
    totalAmountCell.alignment = { vertical: "middle", horizontal: "right" };
    styleTotalsRow(totalsRow);

    // Apply professional styling
    applyProfessionalStyling(sheet, tableStartRow + 1, tableStartRow + 2);

    // Set column widths
    [10, 25, 20, 25, 20, 15, 15, 15].forEach((w, i) => sheet.getColumn(i + 1).width = w);

    // Send response
    const exportDate = new Date(year, monthNum - 1);
    const filename = createProfessionalFilename("Bank_Transfer", exportDate);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Bank sheet export error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Export salary sheet
export const exportSalarySheet = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: "Month is required (YYYY-MM)" });

    // Parse month and year
    const [year, monthNum] = month.split("-").map(Number);
    if (!year || !monthNum) {
      return res.status(400).json({ error: "Invalid month format. Use YYYY-MM" });
    }

    // 🔧 FIX ISSUE 2: Add daysInMonth declaration
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    // Import professional Excel export utilities
    const {
      createProfessionalWorkbook,
      addProfessionalHeader,
      styleHeaderRow,
      applyProfessionalStyling,
      styleTotalsRow,
      formatCurrency,
      createProfessionalFilename
    } = await import('../../utils/professionalExcelExport.js');

    // Get payroll data using the existing service function
    const payrollData = { records: await calculatePayroll({ month: monthNum, year }) };
    let payroll = payrollData.records || [];

    // Get user details for all employees
    const empIds = payroll.map(e => e.empId);
    const users = await User.find({ empId: { $in: empIds }, role: { $ne: 'ADMIN' } });
    const userMap = {};
    users.forEach(u => { userMap[u.empId] = u; });

    // Prepare data for Excel
    const headers = [
      "Emp name", "Department", "Designation", "Fixe up salary", "Total present",
      "PH", "CL", "SL", "EL", "Net present days", "Gross Salary", "WPL",
      "Adv/Loan", "P TAX", "WL FUND", "Canteen", "room rent", "PF", "ESI",
      "Total deduction", "Total OT Hrs", "Salary", "Total OT Salary", "Net Salary", "Signeture"
    ];

    const rows = payroll.map(emp => {
      const user = userMap[emp.empId];

      // Helper to get deduction by name (case-insensitive and partial match)
      const getDeduction = (names) => {
        if (!emp.deductions) return 0;
        const found = emp.deductions.find(d => 
          names.some(name => d.name.toLowerCase().includes(name.toLowerCase()))
        );
        return found ? Number(found.amount) || 0 : 0;
      };

      const otHours = Number(emp.otHours || 0);
      const otSalary = Number(emp.otSalary || 0);
      const fixedSalary = Number(emp.fixedSalary) || 0;
      const totalDeduction = Number(emp.totalDeduction) || 0;
      const grossSalary = Number(emp.grossSalary) || 0;
      const netSalary = Number(emp.netSalary) || 0;

      // Calculate "Salary" as Net Salary minus OT Salary to match the required columns
      const salaryWithoutOT = Math.max(0, netSalary - otSalary);

      return [
        user ? `${user.firstName} ${user.lastName}` : '',
        user ? (user.department || '') : '',
        user ? (user.designation || user.position || '') : '',
        fixedSalary,
        Number(emp.attendancePresentDays) || 0,
        Number(emp.phPaid) || 0,
        Number(emp.leaveSummary?.CL) || 0,
        Number(emp.leaveSummary?.SL) || 0,
        Number(emp.leaveSummary?.PL) || 0, // Mapping PL to EL
        (Number(emp.attendancePresentDays) || 0) + (Number(emp.phPaid) || 0) + (Number(emp.leaveSummary?.paidLeaveDays) || 0), // Net present days = attendance + PH + paid leaves
        grossSalary,
        Number(emp.leaveSummary?.LWP) || 0, // WPL (LWP)
        getDeduction(['Advance', 'Loan']),
        getDeduction(['Prof Tax', 'TDS', 'P TAX', 'P. TAX']),
        getDeduction(['WL FUND', 'Welfare', 'WF']),
        getDeduction(['Canteen']),
        getDeduction(['Room Rent', 'Rent']),
        getDeduction(['PF', 'Provident']),
        getDeduction(['ESI']),
        totalDeduction,
        otHours,
        salaryWithoutOT,
        otSalary,
        netSalary,
        '' // Signeture
      ];
    });

    // Calculate totals for numeric columns
    const totals = payroll.reduce((acc, emp, idx) => {
      const row = rows[idx];
      for (let i = 3; i < 24; i++) {
        acc[i] = (acc[i] || 0) + (typeof row[i] === 'number' ? row[i] : 0);
      }
      return acc;
    }, {});

    // Create workbook and worksheet
    const reportTitle = `Salary Sheet - ${month}`;
    const workbook = createProfessionalWorkbook(reportTitle);
    const sheet = workbook.addWorksheet("Salary Sheet");

    // Add professional header
    addProfessionalHeader(sheet, reportTitle, new Date(), headers.length);

    // Add table title
    const tableStartRow = 5;
    sheet.mergeCells(`A${tableStartRow}:${String.fromCharCode(64 + headers.length)}${tableStartRow}`);
    const titleCell = sheet.getCell(`A${tableStartRow}`);
    titleCell.value = `SALARY DETAILS FOR ${month}`;
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.font = { bold: true, size: 12 };

    // Add headers
    const headerRow = sheet.getRow(tableStartRow + 1);
    headerRow.values = headers;
    styleHeaderRow(headerRow);

    // Add data rows
    rows.forEach((row, i) => {
      const r = sheet.addRow(row);
      r.eachCell(cell => {
        cell.alignment = { vertical: "middle", horizontal: "left" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });

      // Right-align numeric columns (indices 3 to 23 are numeric)
      for (let col = 4; col <= 24; col++) {
        const cell = r.getCell(col);
        cell.alignment = { vertical: "middle", horizontal: "right" };
        
        // Format as currency if it's a monetary value
        const currencyIndices = [4, 11, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24];
        if (typeof cell.value === 'number' && currencyIndices.includes(col)) {
          cell.value = formatCurrency(cell.value);
        }
      }
    });

    // Add totals row
    const totalsRowValues = Array(headers.length).fill('');
    totalsRowValues[2] = 'TOTAL';
    for (let i = 3; i < 24; i++) {
      totalsRowValues[i] = totals[i];
    }
    const totalsRow = sheet.addRow(totalsRowValues);

    // Style totals row
    totalsRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true };
      if (colNumber >= 4 && colNumber <= 24) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
        const currencyIndices = [4, 11, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24];
        if (typeof cell.value === 'number' && currencyIndices.includes(colNumber)) {
          cell.value = formatCurrency(cell.value);
        }
      }
    });
    styleTotalsRow(totalsRow);

    // Apply professional styling
    applyProfessionalStyling(sheet, tableStartRow + 1, tableStartRow + 2);

    // Set column widths
    const widths = [25, 20, 20, 15, 12, 8, 8, 8, 8, 15, 15, 10, 15, 15, 15, 15, 15, 15, 15, 15, 12, 15, 15, 15, 20];
    widths.forEach((w, i) => sheet.getColumn(i + 1).width = w);


    // Send response
    const exportDate = new Date(year, monthNum - 1);
    const filename = createProfessionalFilename("Salary_Sheet", exportDate);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Salary sheet export error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Dynamic header generator
function buildAttendanceHeaders(daysInMonth, deductionTypes = []) {
  const headers = [
    'Sr No',
    'Emp Code',
    'Employee Name',
    'Designation'
  ];

  // Day columns
  for (let d = 1; d <= daysInMonth; d++) {
    headers.push(String(d));
  }

  // Attendance summary
  headers.push(
    'Present',
    'Absent',
    'PH',
    'PL',
    'SL',
    'CL',
    'EL',
    'C-OFF',
    'Net Present Days',
    'OT Hours',
    'OT Amount'
  );

  // Salary
  headers.push(
    'Gross Salary',
    'LWP',
    'Prof Tax',
    'WF Fund'
  );

  // Dynamic deductions
  deductionTypes.forEach(d => headers.push(d));

  headers.push(
    'Total Deduction',
    'Net Salary'
  );

  // Bank
  headers.push(
    'Bank A/C No',
    'Bank Name',
    'IFSC'
  );

  // Employee meta
  headers.push(
    'Joining Date',
    'Retired Date',
    'DOB',
    'PAN',
    'UAN',
    'PF A/C No',
    'ESI No'
  );

  return headers;
}

// Dynamic deduction column builder
function collectDeductionTypes(payrollList) {
  const set = new Set();

  payrollList.forEach(p => {
    if (Array.isArray(p.deductions)) {
      p.deductions.forEach(d => {
        if (d?.name) set.add(d.name);
      });
    }
  });

  return Array.from(set);
}

function mapDeductions(payrollRow, deductionTypes) {
  const map = {};
  deductionTypes.forEach(d => (map[d] = 0));

  if (Array.isArray(payrollRow?.deductions)) {
    payrollRow.deductions.forEach(d => {
      if (map.hasOwnProperty(d.name)) {
        map[d.name] = Number(d.amount) || 0;
      }
    });
  }

  return deductionTypes.map(d => map[d]);
}

// Export attendance sheet
export const exportAttendanceSheet = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'Month required (YYYY-MM)' });

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    const {
      createProfessionalWorkbook,
      addProfessionalHeader,
      styleHeaderRow,
      applyProfessionalStyling,
      createProfessionalFilename
    } = await import('../../utils/professionalExcelExport.js');

    // ===== LOAD DATA =====
    const employees = await User.find({ role: { $ne: 'ADMIN' } }).lean();

    const sessions = await AttendanceSession.find({
      inTime: { $gte: startDate, $lte: endDate }
    }).lean();

    const payrollList = await calculatePayroll({ year, month: monthNum });
    const payrollMap = Object.fromEntries(payrollList.map(p => [p.empId, p]));

    // ===== LOAD PAID HOLIDAYS =====
    const paidHolidays = await PaidHoliday.find({
      date: { $gte: startDate, $lte: endDate }
    }).lean();
    const phMap = {};
    paidHolidays.forEach(h => {
      phMap[new Date(h.date).getDate()] = h.name;
    });

    // ===== INDEXING =====
    const sessionsByEmp = {};
    sessions.forEach(s => {
      if (!sessionsByEmp[s.employeeId]) sessionsByEmp[s.employeeId] = [];
      sessionsByEmp[s.employeeId].push(s);
    });

    // Correctly index leaves from applications
    const leaveMap = {};
    const allLeaveRecords = await Leave.find({
      'applications.status': 'Approved',
      'applications.startDate': { $lte: endDate },
      'applications.endDate': { $gte: startDate }
    }).lean();

    allLeaveRecords.forEach(leave => {
      leave.applications.forEach(app => {
        if (app.status !== 'Approved') return;
        const appStart = new Date(app.startDate);
        const appEnd = new Date(app.endDate);
        const overlapStart = new Date(Math.max(appStart.getTime(), startDate.getTime()));
        const overlapEnd = new Date(Math.min(appEnd.getTime(), endDate.getTime()));

        for (let d = new Date(overlapStart); d <= overlapEnd; d.setDate(d.getDate() + 1)) {
          const key = `${leave.empId}_${d.getDate()}`;
          leaveMap[key] = leave.leaveType;
        }
      });
    });

    const deductionTypes = collectDeductionTypes(payrollList);
    const headers = buildAttendanceHeaders(daysInMonth, deductionTypes);

    // ===== BUILD ROWS =====
    const rows = [];

    employees.forEach((emp, index) => {
      const empSessions = sessionsByEmp[emp.empId] || [];
      const payroll = payrollMap[emp.empId] || {};

        let present = 0, absent = 0, ph = 0, pl = 0, sl = 0, cl = 0, el = 0, coff = 0;
        const dayCells = [];

        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, monthNum - 1, d);
          
          const worked = empSessions.some(s => {
            const inD = new Date(s.inTime);
            return inD.getDate() === d && s.status === 'CLOSED';
          });

          const leaveType = leaveMap[`${emp.empId}_${d}`];
          const isPH = phMap[d];

          let mark = 'A';

          const isWeeklyOffEmployee = emp.employeeType === 'weeklyOff' || emp.employeeType === 'weeklyOffWithCoff';
          const weeklyOffDay = emp.shiftDetails?.weeklyOff;
          
          if (worked) {
            mark = 'P';
          } else if (leaveType) {
            mark = leaveType;
          } else if (isPH) {
            mark = 'PH';
          } else if (isWeeklyOffEmployee && weeklyOffDay) {
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            if (dayName === weeklyOffDay) {
              mark = 'WO';
            }
          }

          dayCells.push(mark);

          if (mark === 'P') present++;
          else if (mark === 'PH') ph++;
          else if (mark === 'PL') pl++;
          else if (mark === 'SL') sl++;
          else if (mark === 'CL') cl++;
          else if (mark === 'EL') el++;
          else if (mark === 'C-OFF' || mark === 'COFF') coff++;
          else if (mark === 'WO') { /* Weekly off - not counted as present but not absent */ }
          else if (mark === 'LWP') absent++;
          else if (mark === 'A') absent++;
        }

        const netPresent = payroll.presentDays ?? (present + ph + pl + sl + cl + el + coff);


        const deductionCols = mapDeductions(payroll, deductionTypes);

        rows.push([
          index + 1,
          emp.empId,
          `${emp.firstName} ${emp.lastName}`,
          emp.position || '',

          ...dayCells,

          payroll.presentDays ?? present,
          payroll.absentDays ?? absent,
          ph,
          pl,
          sl,
          cl,
          el,
          coff,
            netPresent,
            payroll.otHours || 0,
            payroll.otSalary || 0,

            payroll.grossSalary || 0,
          payroll.leaveSummary?.LWP ?? (emp.employeeType?.toLowerCase() === 'fullmonth'
            ? Math.max(daysInMonth - (payroll.presentDays || 0), 0)
            : absent),
          payroll.totalDeduction || 0, // Placeholder for specific deductions if needed
          0, // WF Fund placeholder

          ...deductionCols,
          payroll.totalDeduction || 0,
          payroll.netSalary || 0,


        emp.bankDetails?.accountNo || '',
        emp.bankDetails?.nameOnBank || '',
        emp.bankDetails?.ifsc || '',

        emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '',
        emp.retiredDate ? new Date(emp.retiredDate).toLocaleDateString() : '',
        emp.dob ? new Date(emp.dob).toLocaleDateString() : '',
        emp.pan || '',
        emp.uanNo || '',
        emp.pfAccount || '',
        emp.esi || ''
      ]);
    });

    // ===== EXPORT =====
    const workbook = createProfessionalWorkbook(`Attendance ${month}`);
    const sheet = workbook.addWorksheet('Attendance');

    addProfessionalHeader(sheet, `Attendance Register - ${month}`, new Date(), headers.length);
    sheet.getRow(6).values = headers;
    styleHeaderRow(sheet.getRow(6));

    rows.forEach(r => sheet.addRow(r));
    applyProfessionalStyling(sheet, 6, 7);

    const filename = createProfessionalFilename('Attendance_Register', new Date(year, monthNum - 1));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Attendance export error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


// Export daily attendance PDF
export const exportDailyAttendancePDF = async (req, res) => {
  res.status(501).json({ error: "Not implemented" });
};

// Export monthly attendance PDF
export const exportMonthlyAttendancePDF = async (req, res) => {
  res.status(501).json({ error: "Not implemented" });
};

// Export payroll filtered PDF
export const exportPayrollFilteredPDF = async (req, res) => {
  res.status(501).json({ error: "Not implemented" });
};

// Get performance analytics
export const getPerformanceAnalytics = async (req, res) => {
  res.status(501).json({ error: "Not implemented" });
};

// Test database
export const testDatabase = async (req, res) => {
  res.status(501).json({ error: "Not implemented" });
};

// Simple test
export const simpleTest = async (req, res) => {
  res.status(501).json({ error: "Not implemented" });
};

// Direct payroll test
export const directPayrollTest = async (req, res) => {
  res.status(501).json({ error: "Not implemented" });
};

// Get monthly attendance summary (moved from hr.controller.js)
export const getMonthlyAttendanceSummary = async (req, res, isInternalCall = false) => {
  try {
    const { month, department } = req.query;

    if (!month) {
      return res.status(400).json({ error: "Month parameter is required" });
    }

    // Parse month parameter (YYYY-MM format)
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    // Build match conditions
    const matchConditions = {
      inTime: { $gte: startDate, $lte: endDate }
      // Removed status filter to include both OPEN and CLOSED sessions
    };

    // If department filter is provided, we'll filter after aggregation
    let departmentFilter = null;
    if (department && department !== 'All') {
      departmentFilter = department;
    }

    // Get attendance summary data
    const summaryData = await AttendanceSession.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: 'users',
          localField: 'employeeId',
          foreignField: 'empId',
          as: 'employee'
        }
      },
      { $unwind: '$employee' },
      {
        $group: {
          _id: '$employeeId',
          employee: { $first: '$employee' },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0] } },
          partialSessions: { $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] } },
          totalHours: {
            $sum: {
              $divide: [
                { $subtract: ['$outTime', '$inTime'] },
                1000 * 60 * 60 // Convert milliseconds to hours
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          totalPresent: { $sum: '$presentDays' },
          totalPartial: { $sum: '$partialSessions' },
          totalHours: { $sum: '$totalHours' },
          employees: { $push: '$$ROOT' }
        }
      }
    ]);

    // Filter by department if needed
    let filteredEmployees = summaryData.length > 0 ? summaryData[0].employees : [];
    if (departmentFilter) {
      filteredEmployees = filteredEmployees.filter(emp =>
        emp.employee.department === departmentFilter
      );
    }

    // Calculate summary statistics
    const totalEmployees = filteredEmployees.length;
    let totalPresent = 0;
    let totalHours = 0;
    let onTimeCount = 0;
    let onLeaveCount = 0;
    let absentCount = 0;
    let partialCount = 0;

    filteredEmployees.forEach(emp => {
      totalPresent += emp.presentDays;
      totalHours += emp.totalHours;
      partialCount += emp.partialSessions;

      // For now, we'll consider all present days as "on time"
      // In a real implementation, you might have more sophisticated logic
      onTimeCount += emp.presentDays;
    });

    // Estimate absent days (assuming 26 working days per month)
    const workingDaysInMonth = 26;
    absentCount = Math.max(0, totalEmployees * workingDaysInMonth - totalPresent);

    // Calculate average attendance rate
    const avgAttendance = totalEmployees > 0 ?
      Math.round((totalPresent / (totalEmployees * workingDaysInMonth)) * 100) : 0;

    // Fix: Calculate correct percentages based on total working days rather than employees
    // This prevents percentages from exceeding 100% when summing present/absent/leave
    const totalWorkingDays = totalEmployees * workingDaysInMonth;
    const presentPercentage = totalWorkingDays > 0 ? Math.round((totalPresent / totalWorkingDays) * 100) : 0;
    const absentPercentage = totalWorkingDays > 0 ? Math.round((absentCount / totalWorkingDays) * 100) : 0;
    const leavePercentage = totalWorkingDays > 0 ? Math.round((onLeaveCount / totalWorkingDays) * 100) : 0;

    const result = {
      totalEmployees,
      onTime: onTimeCount,
      onLeave: onLeaveCount,
      totalAbsences: absentCount,
      partial: partialCount,
      avgAttendance,
      totalHours: Math.round(totalHours * 100) / 100,
      // Add the corrected percentages to the response
      presentPercentage,
      absentPercentage,
      leavePercentage
    };

    if (isInternalCall) {
      return result;
    }

    res.status(200).json(result);
  } catch (err) {
    console.error("Error fetching monthly summary:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get monthly payroll summary for all employees
export async function getMonthlyPayrollSummary(req, res) {
  try {
    // Parse month from query parameters
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({ error: "Month parameter is required (YYYY-MM)" });
    }

    // Parse month and year
    const [year, monthNum] = month.split("-").map(Number);
    if (!year || !monthNum) {
      return res.status(400).json({ error: "Invalid month format. Use YYYY-MM" });
    }

    // Get payroll data using the existing service function
    const payrollData = { records: await calculatePayroll({ month: monthNum, year }) };
    let payroll = payrollData.records || [];


    // Return the payroll data
    res.status(200).json({
      success: true,
      data: { records: payroll },
      month: `${year}-${monthNum.toString().padStart(2, '0')}`
    });
  } catch (err) {
    console.error("Error fetching monthly payroll summary:", err);
    res.status(500).json({
      success: false,
      error: "Server error",
      message: err.message
    });
  }
}

// Utility function to detect worker type and classify days
function getWorkerType(emp) {
  // 8hr with weekly off
  if (emp.shiftDetails?.workHoursPerDay === 8 && emp.shiftDetails?.weeklyOff) {
    return '8hr_weeklyoff';
  }
  // 8hr without weekly off, C-OFF eligible
  if (emp.shiftDetails?.workHoursPerDay === 8 && emp.leaveConfig?.COFF !== undefined) {
    return '8hr_coff';
  }
  // 8hr without weekly off, OT eligible
  if (emp.shiftDetails?.workHoursPerDay === 8 && emp.leaveConfig?.COFF === undefined) {
    return '8hr_ot';
  }
  // 12hr worker
  if (emp.shiftDetails?.workHoursPerDay === 12) {
    return '12hr';
  }
  return 'unknown';
}

// Export salary summary by category as Excel
export const exportSalarySummaryExcel = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: "Month is required (YYYY-MM)" });
    // Parse month and year
    const [year, monthNum] = month.split("-").map(Number);
    if (!year || !monthNum) {
      return res.status(400).json({ error: "Invalid month format. Use YYYY-MM" });
    }

    // Import professional Excel export utilities
    const {
      createProfessionalWorkbook,
      addProfessionalHeader,
      styleHeaderRow,
      applyProfessionalStyling,
      styleTotalsRow,
      autoAdjustColumnWidths,
      formatCurrency,
      createProfessionalFilename
    } = await import('../../utils/professionalExcelExport.js');

    // Get payroll data using the existing service function
    const payrollData = { records: await calculatePayroll({ month: monthNum, year }) };
    let payroll = payrollData.records || [];

    // Get user details for all employees
    const empIds = payroll.map(e => e.empId);
    const users = await User.find({ empId: { $in: empIds }, role: { $ne: 'ADMIN' } });
    const userMap = {};
    users.forEach(u => { userMap[u.empId] = u; });

    function sumNet(category, filterOT = false) {
      return payroll.filter(emp => {
        const user = userMap[emp.empId];
        if (!user) return false;
        if (category === 'STAFFS(OFFICE)') return user.employeeCategory === 'STAFFS(OFFICE)';
        if (category === 'STAFFS(PLANT)') return user.employeeCategory === 'STAFFS(PLANT)';
        if (category === 'WORKERS (PLANT)') return user.employeeCategory === 'WORKERS (PLANT)';
        return false;
      }).reduce((sum, emp) => {
        if (filterOT) return sum + (emp.otSalary || 0);
        // Base net salary: netSalary minus otSalary
        return sum + ((emp.netSalary || 0) - (emp.otSalary || 0));
      }, 0);
    }

    // --- UPPER TABLE (Manual Entry Template) ---
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const formattedMonth = `${monthNames[monthNum - 1]} ${year}`;
    const upperTitle = `MONTHLY SALARY PROVISIONAL SUMMARY FOR THE MONTH OF ${formattedMonth.toUpperCase()}`;
    const upperHeaders = ["SL NO", "PARTICULARS", "MAN POWER", "ACCOUNTS HEAD", "NET PAYABLE AMOUNT", "GST AMOUNT", "CANTEEN"];
    const upperRows = Array.from({ length: 13 }, (_, i) => Array(7).fill(''));

    // --- LOWER TABLE (Auto-filled Salary Summary) ---
    const lowerTitle = upperTitle;
    const lowerHeaders = ["SL NO", "PARTICULARS", "MAN POWER", "ACCOUNTS HEAD", "NET PAYABLE AMOUNT", "CANTEEN"];
    const rows = [
      { sl: 1, particulars: 'STAFFS(OFFICE)', manPower: '', accountsHead: 'MONTHLY SALARY', netPay: sumNet('STAFFS(OFFICE)'), canteen: '' },
      { sl: 2, particulars: 'STAFFS(OFFICE)', manPower: '', accountsHead: 'MONTHLY OT', netPay: sumNet('STAFFS(OFFICE)', true), canteen: '' },
      { sl: 3, particulars: 'STAFFS(PLANT)', manPower: '', accountsHead: 'MONTHLY SALARY', netPay: sumNet('STAFFS(PLANT)'), canteen: '' },
      { sl: 4, particulars: 'STAFFS(PLANT)', manPower: '', accountsHead: 'MONTHLY OT', netPay: sumNet('STAFFS(PLANT)', true), canteen: '' },
      { sl: 5, particulars: 'WORKERS (PLANT )', manPower: '', accountsHead: 'MONTHLY SALARY', netPay: sumNet('WORKERS (PLANT)'), canteen: '' },
      { sl: 6, particulars: 'WORKERS (PLANT)', manPower: '', accountsHead: 'MONTHLY SHORT/EXTRA DUTY', netPay: 0, canteen: '' },
      { sl: 7, particulars: 'DEFERANCE SALARY MAR (SALARY +OT)', manPower: '', accountsHead: 'MONTHLY SALARY', netPay: '', canteen: '' },
      { sl: 8, particulars: 'PARTNERS SALARY', manPower: '', accountsHead: 'MONTHLY SALARY', netPay: '', canteen: '' },
      { sl: 9, particulars: 'SECURITY (1) NIGHT PAGUBAPA, COLONY SUPERVISOR (1)PRAVEEN KAKA', manPower: '', accountsHead: 'MONTHLY SALARY', netPay: '', canteen: '' },
      { sl: 10, particulars: 'OFFICE AND PLANT SWEEPER LADIES', manPower: '', accountsHead: 'MONTHLY SALARY', netPay: '', canteen: '' },
    ];
    const totalSalary = rows.reduce((sum, row) => sum + (typeof row.netPay === 'number' ? row.netPay : 0), 0);

    // --- CREATE WORKBOOK ---
    const reportTitle = `Salary Summary - ${formattedMonth}`;
    const workbook = createProfessionalWorkbook(reportTitle);
    const sheet = workbook.addWorksheet("Salary Summary");

    // --- UPPER TABLE ---
    addProfessionalHeader(sheet, reportTitle, new Date(), 7);

    // Add upper table title (row 5 since we have 4 header rows)
    const upperTableStartRow = 5;
    sheet.mergeCells(`A${upperTableStartRow}:G${upperTableStartRow}`);
    const upperTitleCell = sheet.getCell(`A${upperTableStartRow}`);
    upperTitleCell.value = upperTitle;
    upperTitleCell.alignment = { vertical: "middle", horizontal: "center" };
    upperTitleCell.font = { bold: true, size: 12, color: { argb: 'FF1a7f37' } };

    // Add upper table headers (row 6)
    const upperHeaderRow = sheet.getRow(upperTableStartRow + 1);
    upperHeaderRow.values = upperHeaders;
    styleHeaderRow(upperHeaderRow);

    // Data rows (empty for manual entry)
    upperRows.forEach((row, i) => {
      const r = sheet.addRow(row);
      r.eachCell(cell => {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });
    });

    // Total row for upper table
    const upperTotalRow = sheet.addRow(['', '', '', '', 0, '', '']);
    const upperTotalAmountCell = upperTotalRow.getCell(5);
    upperTotalAmountCell.value = formatCurrency(0);
    upperTotalAmountCell.font = { bold: true };
    upperTotalAmountCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
    upperTotalAmountCell.alignment = { vertical: "middle", horizontal: "center" };
    upperTotalRow.getCell(6).font = { bold: true };
    upperTotalRow.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
    upperTotalRow.getCell(6).alignment = { vertical: "middle", horizontal: "center" };
    upperTotalRow.getCell(7).font = { bold: true };
    upperTotalRow.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
    upperTotalRow.getCell(7).alignment = { vertical: "middle", horizontal: "center" };

    // --- BLANK ROW ---
    sheet.addRow([]);

    // --- LOWER TABLE ---
    const lowerStart = sheet.lastRow.number + 1;
    sheet.mergeCells(`A${lowerStart}:F${lowerStart}`);
    const lowerTitleCell = sheet.getCell(`A${lowerStart}`);
    lowerTitleCell.value = lowerTitle;
    lowerTitleCell.alignment = { vertical: "middle", horizontal: "center" };
    lowerTitleCell.font = { bold: true, size: 12, color: { argb: 'FF1a7f37' } };

    // Add lower table headers (row after title)
    const lowerHeaderRow = sheet.getRow(lowerStart + 1);
    lowerHeaderRow.values = lowerHeaders;
    styleHeaderRow(lowerHeaderRow);

    rows.forEach((row, i) => {
      const r = sheet.addRow([
        row.sl,
        row.particulars,
        row.manPower,
        row.accountsHead,
        typeof row.netPay === 'number' ? row.netPay : row.netPay,
        row.canteen
      ]);
      r.eachCell(cell => {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      });
    });

    // Format currency values in lower table
    for (let i = lowerStart + 2; i <= sheet.lastRow.number; i++) {
      const row = sheet.getRow(i);
      const amountCell = row.getCell(5);
      if (typeof amountCell.value === 'number') {
        amountCell.value = formatCurrency(amountCell.value);
      }
    }

    // Total row for lower table
    const lowerTotalRow = sheet.addRow(['', '', '', 'Total salary', totalSalary, '₹ 0.00']);
    const lowerTotalAmountCell = lowerTotalRow.getCell(5);
    lowerTotalAmountCell.value = formatCurrency(totalSalary);
    lowerTotalRow.getCell(4).font = { bold: true };
    lowerTotalRow.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
    lowerTotalAmountCell.font = { bold: true };
    lowerTotalAmountCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
    lowerTotalRow.getCell(6).font = { bold: true };
    lowerTotalRow.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };

    // Apply professional styling to both tables
    applyProfessionalStyling(sheet, upperTableStartRow + 1, upperTableStartRow + 2);
    applyProfessionalStyling(sheet, lowerStart + 1, lowerStart + 2);

    // Style totals rows
    styleTotalsRow(upperTotalRow);
    styleTotalsRow(lowerTotalRow);

    // --- COLUMN WIDTHS ---
    [8, 45, 15, 25, 20, 20, 18].forEach((w, i) => sheet.getColumn(i + 1).width = w);

    // --- RESPONSE ---
    const exportDate = new Date(year, monthNum - 1);
    const filename = createProfessionalFilename("Salary_Summary", exportDate);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Salary summary export error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};




// Get payroll for a specific employee
export const getEmployeePayroll = async (req, res) => {
  try {
    const { empId, month } = req.query;

    if (!empId) return res.status(400).json({ error: "Employee ID is required" });
    if (!month) return res.status(400).json({ error: "Month is required (YYYY-MM)" });

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "Invalid month format. Use YYYY-MM" });
    }

    let payrollData = await getPayrollForEmployeeWithSnapshot(empId, month);

    if (!payrollData) {
      return res.status(404).json({ error: "Payroll data not found" });
    }

    res.json(payrollData);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') console.error("[getEmployeePayroll] Error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};

export const withTimeout = (res, timeoutMs = 60000) => {

  // Check if res is a valid Express response object
  if (!res || typeof res.status !== "function" || typeof res.headersSent === "undefined") {
    console.warn("withTimeout called with invalid res object. Timeout disabled.");
    return null;
  }

  const timer = setTimeout(() => {
    try {
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timed out' });
      }
    } catch (err) {
      console.error("Timeout handler failed:", err.message);
    }
  }, timeoutMs);

  // Auto-clear when finished
  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));

  return timer;
};