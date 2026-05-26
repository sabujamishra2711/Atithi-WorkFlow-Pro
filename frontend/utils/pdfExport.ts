interface ExportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  orientation?: 'portrait' | 'landscape';
}

interface TableColumn {
  header: string;
  dataKey: string;
}

const BRAND_COLOR = '#8B0000';

function createTableHTML(
  data: Record<string, unknown>[],
  columns: TableColumn[],
  options: ExportOptions
): string {
  const { title, subtitle } = options;

  const rows = data.map((row, idx) => {
    const cells = columns.map(col => {
      const value = row[col.dataKey];
      if (value === null || value === undefined) return '-';
      if (typeof value === 'number') {
        return value % 1 === 0 ? value.toString() : value.toFixed(2);
      }
      return String(value);
    }).map(v => `<td style="padding: 6px 8px; border: 1px solid #ddd; font-size: 9px; white-space: nowrap;">${v}</td>`).join('');
    const bgColor = idx % 2 === 0 ? '#fff' : '#f9fafb';
    return `<tr style="background-color: ${bgColor};">${cells}</tr>`;
  }).join('');

  const headers = columns.map(col => 
    `<th style="padding: 8px; border: 1px solid #ddd; background-color: ${BRAND_COLOR}; color: white; font-size: 9px; font-weight: bold; text-align: center; white-space: nowrap;">${col.header}</th>`
  ).join('');

  return `
    <div style="font-family: Arial, sans-serif; padding: 10px;">
      <div style="background-color: ${BRAND_COLOR}; color: white; padding: 12px 15px; margin-bottom: 10px;">
        <h1 style="margin: 0; font-size: 16px; font-weight: bold;">ATITHI LLP</h1>
        <p style="margin: 4px 0 0 0; font-size: 11px;">${title}</p>
      </div>
      ${subtitle ? `<p style="margin: 0 0 10px 0; font-size: 10px; color: #666;">${subtitle} | Generated: ${new Date().toLocaleDateString('en-IN')}</p>` : ''}
      <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
        <thead>
          <tr>${headers}</tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top: 15px; font-size: 8px; color: #888; text-align: center;">Atithi LLP - WorkFlow Pro</p>
    </div>
  `;
}

async function exportHTMLToPDF(html: string, filename: string, orientation: 'portrait' | 'landscape' = 'landscape'): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;
  
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  const opt = {
    margin: 5,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation }
  };

  await html2pdf().set(opt).from(container).save();
  document.body.removeChild(container);
}

export const createPDFWithTable = async (
  data: Record<string, unknown>[],
  columns: TableColumn[],
  options: ExportOptions
): Promise<void> => {
  const html = createTableHTML(data, columns, options);
  await exportHTMLToPDF(html, options.filename, options.orientation);
};

export const exportPayrollToPDF = async (
  data: Record<string, unknown>[],
  month: string,
  year: string
): Promise<{ success: boolean; message: string }> => {
  const columns: TableColumn[] = [
    { header: 'ID', dataKey: 'empId' },
    { header: 'Name', dataKey: 'name' },
    { header: 'Type', dataKey: 'workerType' },
    { header: 'Present', dataKey: 'presentDays' },
    { header: 'Absent', dataKey: 'absentDays' },
    { header: 'OT Hrs', dataKey: 'otHours' },
    { header: 'OT Pay', dataKey: 'otSalary' },
    { header: 'Gross', dataKey: 'grossSalary' },
    { header: 'Deductions', dataKey: 'totalDeduction' },
    { header: 'Net Salary', dataKey: 'netSalary' }
  ];

  const formattedData = data.map(emp => ({
    empId: emp.empId,
    name: emp.name,
    workerType: formatWorkerType(emp.workerType as string),
    presentDays: emp.presentDays,
    absentDays: emp.absentDays,
    otHours: emp.otHours,
    otSalary: formatCurrency((emp.otSalary as number) || 0),
    grossSalary: formatCurrency((emp.grossSalary as number) || 0),
    totalDeduction: formatCurrency((emp.totalDeduction as number) || 0),
    netSalary: formatCurrency((emp.netSalary as number) || 0)
  }));

  await createPDFWithTable(formattedData, columns, {
    title: 'Payroll Report',
    subtitle: `${month} ${year}`,
    filename: `payroll-${month}-${year}.pdf`,
    orientation: 'landscape'
  });

  return { success: true, message: 'Payroll PDF exported successfully!' };
};

export const exportAttendanceSheetToPDF = async (
  data: Record<string, unknown>[],
  month: string,
  year: string
): Promise<{ success: boolean; message: string }> => {
  const columns: TableColumn[] = [
    { header: 'ID', dataKey: 'empId' },
    { header: 'Name', dataKey: 'name' },
    { header: 'Type', dataKey: 'workerType' },
    { header: 'Present', dataKey: 'presentDays' },
    { header: 'Absent', dataKey: 'absentDays' },
    { header: 'PH Paid', dataKey: 'phPaid' },
    { header: 'PH OT', dataKey: 'phOtDays' },
    { header: 'PL', dataKey: 'pl' },
    { header: 'LWP', dataKey: 'lwp' },
    { header: 'OT Hrs', dataKey: 'otHours' }
  ];

  const formattedData = data.map(emp => ({
    empId: emp.empId,
    name: emp.name,
    workerType: formatWorkerType(emp.workerType as string),
    presentDays: emp.presentDays,
    absentDays: emp.absentDays,
    phPaid: emp.phPaid ?? 0,
    phOtDays: emp.phOtDays ?? 0,
    pl: (emp.leaveBreakdown as Record<string, number>)?.PL || 0,
    lwp: (emp.leaveBreakdown as Record<string, number>)?.LWP || 0,
    otHours: emp.otHours
  }));

  await createPDFWithTable(formattedData, columns, {
    title: 'Attendance Sheet',
    subtitle: `${month} ${year}`,
    filename: `attendance-sheet-${month}-${year}.pdf`,
    orientation: 'landscape'
  });

  return { success: true, message: 'Attendance Sheet PDF exported successfully!' };
};

export const exportSalarySheetToPDF = async (
  data: Record<string, unknown>[],
  month: string,
  year: string
): Promise<{ success: boolean; message: string }> => {
  const columns: TableColumn[] = [
    { header: 'ID', dataKey: 'empId' },
    { header: 'Name', dataKey: 'name' },
    { header: 'Type', dataKey: 'workerType' },
    { header: 'Fixed', dataKey: 'fixedSalary' },
    { header: 'Earned', dataKey: 'earned' },
    { header: 'OT Pay', dataKey: 'otSalary' },
    { header: 'Gross', dataKey: 'grossSalary' },
    { header: 'PF', dataKey: 'pfDeduction' },
    { header: 'ESIC', dataKey: 'esicDeduction' },
    { header: 'Advance', dataKey: 'advanceDeduction' },
    { header: 'Net', dataKey: 'netSalary' }
  ];

  const formattedData = data.map(emp => ({
    empId: emp.empId,
    name: emp.name,
    workerType: formatWorkerType(emp.workerType as string),
    fixedSalary: formatCurrency((emp.fixedSalary as number) || 0),
    earned: formatCurrency((emp.earned as number) || 0),
    otSalary: formatCurrency((emp.otSalary as number) || 0),
    grossSalary: formatCurrency((emp.grossSalary as number) || 0),
    pfDeduction: formatCurrency((emp.pfDeduction as number) || 0),
    esicDeduction: formatCurrency((emp.esicDeduction as number) || 0),
    advanceDeduction: formatCurrency((emp.advanceDeduction as number) || 0),
    netSalary: formatCurrency((emp.netSalary as number) || 0)
  }));

  await createPDFWithTable(formattedData, columns, {
    title: 'Salary Sheet',
    subtitle: `${month} ${year}`,
    filename: `salary-sheet-${month}-${year}.pdf`,
    orientation: 'landscape'
  });

  return { success: true, message: 'Salary Sheet PDF exported successfully!' };
};

export const exportBankSheetToPDF = async (
  data: Record<string, unknown>[],
  month: string,
  year: string
): Promise<{ success: boolean; message: string }> => {
  const columns: TableColumn[] = [
    { header: 'ID', dataKey: 'empId' },
    { header: 'Name', dataKey: 'name' },
    { header: 'Bank Name', dataKey: 'bankName' },
    { header: 'Account No', dataKey: 'accountNo' },
    { header: 'IFSC Code', dataKey: 'ifscCode' },
    { header: 'Net Salary', dataKey: 'netSalary' }
  ];

  const formattedData = data.map(emp => ({
    empId: emp.empId,
    name: emp.name,
    bankName: emp.bankName || 'N/A',
    accountNo: emp.accountNo || 'N/A',
    ifscCode: emp.ifscCode || 'N/A',
    netSalary: formatCurrency((emp.netSalary as number) || 0)
  }));

  await createPDFWithTable(formattedData, columns, {
    title: 'Bank Transfer Sheet',
    subtitle: `${month} ${year}`,
    filename: `bank-transfer-${month}-${year}.pdf`,
    orientation: 'landscape'
  });

  return { success: true, message: 'Bank Transfer Sheet PDF exported successfully!' };
};

export const exportPayrollSummaryToPDF = async (
  data: Record<string, unknown>[],
  month: string,
  year: string
): Promise<{ success: boolean; message: string }> => {
  const summary = {
    totalEmployees: data.length,
    totalGross: data.reduce((sum, e) => sum + ((e.grossSalary as number) || 0), 0),
    totalDeductions: data.reduce((sum, e) => sum + ((e.totalDeduction as number) || 0), 0),
    totalNet: data.reduce((sum, e) => sum + ((e.netSalary as number) || 0), 0),
    totalPF: data.reduce((sum, e) => sum + ((e.pfDeduction as number) || 0), 0),
    totalESIC: data.reduce((sum, e) => sum + ((e.esicDeduction as number) || 0), 0),
    totalOT: data.reduce((sum, e) => sum + ((e.otSalary as number) || 0), 0)
  };

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <div style="background-color: ${BRAND_COLOR}; color: white; padding: 15px 20px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: bold;">ATITHI LLP</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px;">Payroll Summary Report</p>
      </div>
      <p style="margin: 0 0 20px 0; font-size: 12px; color: #666;">${month} ${year} | Generated: ${new Date().toLocaleDateString('en-IN')}</p>
      
      <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 30px;">
        <div style="flex: 1; min-width: 150px; background: #eff6ff; padding: 15px; border-radius: 8px;">
          <p style="margin: 0; font-size: 11px; color: #3b82f6;">Total Employees</p>
          <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold;">${summary.totalEmployees}</p>
        </div>
        <div style="flex: 1; min-width: 150px; background: #f0fdf4; padding: 15px; border-radius: 8px;">
          <p style="margin: 0; font-size: 11px; color: #22c55e;">Total Gross</p>
          <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold;">₹${formatCurrency(summary.totalGross)}</p>
        </div>
        <div style="flex: 1; min-width: 150px; background: #fff7ed; padding: 15px; border-radius: 8px;">
          <p style="margin: 0; font-size: 11px; color: #f97316;">Total Deductions</p>
          <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold;">₹${formatCurrency(summary.totalDeductions)}</p>
        </div>
        <div style="flex: 1; min-width: 150px; background: #faf5ff; padding: 15px; border-radius: 8px;">
          <p style="margin: 0; font-size: 11px; color: #a855f7;">Net Payable</p>
          <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold;">₹${formatCurrency(summary.totalNet)}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: ${BRAND_COLOR}; color: white; text-align: left;">Category</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: ${BRAND_COLOR}; color: white; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding: 10px; border: 1px solid #ddd;">Total Gross Salary</td><td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">₹${formatCurrency(summary.totalGross)}</td></tr>
          <tr style="background: #f9fafb;"><td style="padding: 10px; border: 1px solid #ddd;">Total OT Salary</td><td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">₹${formatCurrency(summary.totalOT)}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;">Total PF Deduction</td><td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">₹${formatCurrency(summary.totalPF)}</td></tr>
          <tr style="background: #f9fafb;"><td style="padding: 10px; border: 1px solid #ddd;">Total ESIC Deduction</td><td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">₹${formatCurrency(summary.totalESIC)}</td></tr>
          <tr><td style="padding: 10px; border: 1px solid #ddd;">Total Deductions</td><td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">₹${formatCurrency(summary.totalDeductions)}</td></tr>
          <tr style="background: #faf5ff;"><td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Total Net Payable</td><td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 16px;">₹${formatCurrency(summary.totalNet)}</td></tr>
        </tbody>
      </table>
      <p style="margin-top: 20px; font-size: 9px; color: #888; text-align: center;">Atithi LLP - WorkFlow Pro</p>
    </div>
  `;

  const html2pdf = (await import('html2pdf.js')).default;
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  await html2pdf().set({
    margin: 10,
    filename: `payroll-summary-${month}-${year}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(container).save();

  document.body.removeChild(container);

  return { success: true, message: 'Payroll Summary PDF exported successfully!' };
};

export const exportMonthlyAttendanceToPDF = async (
  data: Record<string, unknown>[],
  month: string
): Promise<{ success: boolean; message: string }> => {
  const columns: TableColumn[] = [
    { header: 'ID', dataKey: 'empId' },
    { header: 'Name', dataKey: 'name' },
    { header: 'Department', dataKey: 'department' },
    { header: 'Present', dataKey: 'presentDays' },
    { header: 'Absent', dataKey: 'absentDays' },
    { header: 'Leaves', dataKey: 'leaveDays' },
    { header: 'OT Hours', dataKey: 'otHours' },
    { header: 'Working Days', dataKey: 'workingDays' }
  ];

  await createPDFWithTable(data, columns, {
    title: 'Monthly Attendance Report',
    subtitle: month,
    filename: `monthly-attendance-${month.replace(' ', '-')}.pdf`,
    orientation: 'landscape'
  });

  return { success: true, message: 'Monthly Attendance PDF exported successfully!' };
};

export const exportContractorAttendanceToPDF = async (
  data: Record<string, unknown>[],
  month: string
): Promise<{ success: boolean; message: string }> => {
  const columns: TableColumn[] = [
    { header: 'Contractor', dataKey: 'contractorName' },
    { header: 'Employees', dataKey: 'totalEmployees' },
    { header: 'Present', dataKey: 'totalPresentDays' },
    { header: 'Absent', dataKey: 'totalAbsentDays' },
    { header: 'Leave', dataKey: 'totalLeaveDays' },
    { header: 'Total Days', dataKey: 'totalDays' },
    { header: 'OT Hours', dataKey: 'totalOtHours' }
  ];

  const formattedData = data.map(record => ({
    ...record,
    totalOtHours: ((record.totalOtHours as number) || 0).toFixed(1)
  }));

  await createPDFWithTable(formattedData, columns, {
    title: 'Contractor Monthly Attendance',
    subtitle: month,
    filename: `contractor-attendance-${month}.pdf`,
    orientation: 'landscape'
  });

  return { success: true, message: 'Contractor Attendance PDF exported successfully!' };
};

export const exportDailyAttendanceToPDF = async (
  data: Record<string, unknown>[],
  date: string
): Promise<{ success: boolean; message: string }> => {
  const columns: TableColumn[] = [
    { header: 'ID', dataKey: 'empId' },
    { header: 'Name', dataKey: 'name' },
    { header: 'Department', dataKey: 'department' },
    { header: 'Check In', dataKey: 'checkIn' },
    { header: 'Check Out', dataKey: 'checkOut' },
    { header: 'Status', dataKey: 'status' },
    { header: 'Night Shift', dataKey: 'nightShift' }
  ];

  const formattedData = data.map(record => ({
    ...record,
    checkIn: record.checkIn || 'N/A',
    checkOut: record.checkOut || 'N/A',
    nightShift: record.isNightShift ? 'Yes' : 'No'
  }));

  await createPDFWithTable(formattedData, columns, {
    title: 'Daily Attendance Report',
    subtitle: date,
    filename: `daily-attendance-${date}.pdf`,
    orientation: 'landscape'
  });

  return { success: true, message: 'Daily Attendance PDF exported successfully!' };
};

function formatCurrency(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatWorkerType(type: string): string {
  if (!type) return '-';
  const typeMap: Record<string, string> = {
    'fullmonth': 'Full Month',
    'weeklyoff': 'Weekly Off',
    'weeklyoffwithcoff': 'Weekly Off + C.Off'
  };
  return typeMap[type.toLowerCase()] || type;
}

export const exportAttendancePDF = exportMonthlyAttendanceToPDF;
export const exportAttendanceTableToPDF = exportMonthlyAttendanceToPDF;
