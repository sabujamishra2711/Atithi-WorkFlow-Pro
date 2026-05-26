// Professional Excel Export Utility with Company Branding
// This module provides consistent styling and formatting for all Excel exports

import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Company branding constants
const COMPANY_NAME = "Atithi Paper LLP";
const COMPANY_ADDRESS = "Company Address Line 1, City, State - ZIP";
const COMPANY_COLOR = "FF1a7f37"; // Deep green
const HEADER_COLOR = "FF366092"; // Dark blue
const ALTERNATE_ROW_COLOR = "FFF7F9FB"; // Light gray
const TOTAL_ROW_COLOR = "FFFFFF00"; // Yellow

/**
 * Creates a professionally styled workbook with company branding
 * @param {string} reportTitle - The title of the report
 * @param {Date} exportDate - The date of export (defaults to current date)
 * @returns {ExcelJS.Workbook} - Styled workbook
 */
export const createProfessionalWorkbook = (reportTitle, exportDate = new Date()) => {
  const workbook = new ExcelJS.Workbook();
  
  // Set workbook properties
  workbook.creator = COMPANY_NAME;
  workbook.lastModifiedBy = 'HR System';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.title = reportTitle;
  workbook.properties.subject = `${reportTitle} - ${COMPANY_NAME}`;
  workbook.properties.keywords = 'HR, Payroll, Attendance, Export';
  workbook.properties.category = 'HR Reports';
  workbook.properties.description = `Generated on ${exportDate.toISOString().split('T')[0]}`;
  
  return workbook;
};

/**
 * Adds a professional header with company branding to a worksheet
 * @param {ExcelJS.Worksheet} worksheet - The worksheet to add header to
 * @param {string} reportTitle - The title of the report
 * @param {Date} exportDate - The date of export
 * @param {number} columnCount - Number of columns to span the header
 */
export const addProfessionalHeader = (worksheet, reportTitle, exportDate = new Date(), columnCount) => {
  // Add company name header
  const companyNameCell = worksheet.getCell('A1');
  companyNameCell.value = COMPANY_NAME;
  companyNameCell.font = { bold: true, size: 16, color: { argb: COMPANY_COLOR } };
  companyNameCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.mergeCells(`A1:${getColumnName(columnCount)}1`);
  
  // Add company address
  const addressCell = worksheet.getCell('A2');
  addressCell.value = COMPANY_ADDRESS;
  addressCell.font = { size: 10, color: { argb: 'FF666666' } };
  addressCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.mergeCells(`A2:${getColumnName(columnCount)}2`);
  
  // Add report title
  const titleCell = worksheet.getCell('A3');
  titleCell.value = reportTitle;
  titleCell.font = { bold: true, size: 14, color: { argb: COMPANY_COLOR } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.mergeCells(`A3:${getColumnName(columnCount)}3`);
  
  // Add export date
  const dateCell = worksheet.getCell('A4');
  dateCell.value = `Generated on: ${exportDate.toLocaleDateString('en-GB')}`;
  dateCell.font = { size: 10, italic: true };
  dateCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.mergeCells(`A4:${getColumnName(columnCount)}4`);
  
  // Set row heights
  worksheet.getRow(1).height = 30;
  worksheet.getRow(2).height = 20;
  worksheet.getRow(3).height = 25;
  worksheet.getRow(4).height = 18;
};

/**
 * Styles a header row with professional formatting
 * @param {ExcelJS.Row} headerRow - The row to style as header
 */
export const styleHeaderRow = (headerRow) => {
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_COLOR }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    };
    cell.alignment = { 
      vertical: 'middle', 
      horizontal: 'center',
      wrapText: true
    };
  });
};

/**
 * Applies professional styling to a worksheet
 * @param {ExcelJS.Worksheet} worksheet - The worksheet to style
 * @param {number} headerRowIndex - The row index of the header row
 * @param {number} dataStartRowIndex - The row index where data starts
 */
export const applyProfessionalStyling = (worksheet, headerRowIndex, dataStartRowIndex) => {
  // Freeze header row
  worksheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];
  
  // Add auto-filter to header row
  const lastColumn = worksheet.columns[worksheet.columns.length - 1].letter;
  worksheet.autoFilter = {
    from: `${worksheet.columns[0].letter}${headerRowIndex}`,
    to: `${lastColumn}${headerRowIndex}`
  };
  
  // Style data rows with alternating colors
  for (let i = dataStartRowIndex; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    // Alternate row coloring for better readability
    if (i % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: ALTERNATE_ROW_COLOR }
        };
      });
    }
    
    // Add borders to all cells
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
      };
    });
  }
};

/**
 * Styles a totals row with professional formatting
 * @param {ExcelJS.Row} totalsRow - The row to style as totals
 */
export const styleTotalsRow = (totalsRow) => {
  totalsRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: TOTAL_ROW_COLOR }
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF999999' } },
      left: { style: 'thin', color: { argb: 'FF999999' } },
      bottom: { style: 'medium', color: { argb: 'FF999999' } },
      right: { style: 'thin', color: { argb: 'FF999999' } }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'right' };
  });
};

/**
 * Auto-adjusts column widths based on content
 * @param {ExcelJS.Worksheet} worksheet - The worksheet to adjust
 */
export const autoAdjustColumnWidths = (worksheet) => {
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value ? cell.value.toString() : '';
      const columnLength = cellValue.length;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    // Set width with some padding, but cap at a reasonable maximum
    column.width = Math.min(Math.max(maxLength + 3, 10), 50);
  });
};

/**
 * Gets column name from index (A, B, C, ..., Z, AA, AB, ...)
 * @param {number} columnIndex - The column index (1-based)
 * @returns {string} - The column name
 */
export const getColumnName = (columnIndex) => {
  let columnName = '';
  let dividend = columnIndex;
  
  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  
  return columnName;
};

/**
 * Formats a currency value for display
 * @param {number} value - The value to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '';
  return `₹ ${parseFloat(value).toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

/**
 * Creates a professional filename for Excel exports
 * @param {string} reportType - Type of report (e.g., 'Attendance', 'Salary')
 * @param {Date} date - Date for the report
 * @returns {string} - Formatted filename
 */
export const createProfessionalFilename = (reportType, date) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  
  // Replace spaces with underscores and ensure valid filename characters
  const cleanReportType = reportType.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  
  return `${cleanReportType}_${month}_${year}.xlsx`;
};

export default {
  createProfessionalWorkbook,
  addProfessionalHeader,
  styleHeaderRow,
  applyProfessionalStyling,
  styleTotalsRow,
  autoAdjustColumnWidths,
  getColumnName,
  formatCurrency,
  createProfessionalFilename
};