// Production fixes for backend Excel and PDF exports

import ExcelJS from 'exceljs';

// Fix 1: Enhanced error handling for Excel exports
export const safeExcelExport = async (res, workbookGenerator, filename) => {
  try {
    // Set headers early
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Generate workbook with timeout
    const workbook = await Promise.race([
      workbookGenerator(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Workbook generation timeout')), 30000)
      )
    ]);

    // Validate workbook
    if (!workbook || !workbook.worksheets || workbook.worksheets.length === 0) {
      throw new Error('Invalid workbook generated');
    }

    // Write to response with error handling
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Excel export error:', error);

    // If headers not sent, send error response
    if (!res.headersSent) {
      res.status(500).json({
        error: "Excel export failed",
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};

// Fix 2: Memory-efficient Excel generation
export const createOptimizedWorkbook = () => {
  const workbook = new ExcelJS.Workbook();

  // Set workbook properties for better compatibility
  workbook.creator = 'Atithi LLP HR System';
  workbook.lastModifiedBy = 'System';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.lastPrinted = new Date();

  // Use streaming for large datasets
  workbook.useSharedStrings = true;
  workbook.useStyles = true;

  return workbook;
};

// Fix 3: Safe data processing
export const safeDataProcessor = (data, processor) => {
  try {
    if (!Array.isArray(data)) {
      console.warn('Data is not an array, converting:', typeof data);
      data = data ? [data] : [];
    }

    return data.map((item, index) => {
      try {
        return processor(item, index);
      } catch (error) {
        console.error(`Error processing item at index ${index}:`, error);
        return null; // Return null for failed items
      }
    }).filter(item => item !== null); // Remove failed items

  } catch (error) {
    console.error('Data processing error:', error);
    return [];
  }
};

// Fix 4: Database connection validation
export const validateDatabaseConnection = async (mongoose) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }

    // Test with a simple query
    await mongoose.connection.db.admin().ping();
    return true;

  } catch (error) {
    console.error('Database validation error:', error);
    return false;
  }
};

// Fix 5: Enhanced payroll data fetching with retries
export const fetchPayrollDataSafely = async (getPayrollFunction, params, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetching payroll data, attempt ${attempt}/${maxRetries}`);

      const result = await Promise.race([
        getPayrollFunction(params),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Payroll fetch timeout')), 30000)
        )
      ]);

      // Validate result
      if (!result || !result.data) {
        throw new Error('Invalid payroll data received');
      }

      console.log(`Payroll data fetched successfully, ${result.data.length} records`);
      return result.data;

    } catch (error) {
      console.error(`Payroll fetch attempt ${attempt} failed:`, error);

      if (attempt === maxRetries) {
        throw new Error(`Failed to fetch payroll data after ${maxRetries} attempts: ${error.message}`);
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

// Fix 6: Safe user data fetching
export const fetchUserDataSafely = async (User, empIds) => {
  try {
    if (!empIds || empIds.length === 0) {
      console.warn('No employee IDs provided for user data fetch');
      return [];
    }

    console.log(`Fetching user data for ${empIds.length} employees`);

    const users = await User.find(
      { empId: { $in: empIds }, role: { $ne: 'ADMIN' } },
      'empId firstName lastName mobile bankDetails employeeCategory employeeType shiftDetails'
    ).lean().exec();

    console.log(`User data fetched for ${users.length} employees`);
    return users;

  } catch (error) {
    console.error('User data fetch error:', error);
    return [];
  }
};

// Fix 7: Excel worksheet styling
export const applyWorksheetStyling = (worksheet, headerRow) => {
  try {
    // Style header row
    if (headerRow) {
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '366092' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    }

    // Auto-fit columns
    worksheet.columns.forEach((column, index) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

  } catch (error) {
    console.error('Worksheet styling error:', error);
  }
};

// Fix 8: Safe value extraction
export const safeValue = (value, defaultValue = '') => {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// Fix 9: Production logging
export const productionLog = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data })
  };

  if (process.env.NODE_ENV === 'production') {
    // In production, only log errors and warnings
    if (level === 'error' || level === 'warn') {
      console[level](`[${timestamp}] ${message}`, data || '');
    }
  } else {
    // In development, log everything
    console[level](`[${timestamp}] ${message}`, data || '');
  }
};

// Fix 10: Response timeout handler
export const withTimeout = (res, timeoutMs = 60000) => {
  // Validate Express response object
  if (!res || typeof res !== "object" || typeof res.on !== "function") {
    console.warn("withTimeout() called with invalid res object. Skipping timeout setup.");
    return null; // do nothing safely
  }

  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        error: 'Request timeout',
        message: 'The request took too long to process'
      });
    }
  }, timeoutMs);

  // auto-clear once response ends
  res.on('finish', () => clearTimeout(timeout));
  res.on('close', () => clearTimeout(timeout));

  return timeout;
};
