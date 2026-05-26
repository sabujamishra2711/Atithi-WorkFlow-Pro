// Removed missing authRoutes import
import userRoutes from './user.routes.js';
import employeeRoutes from './employee.routes.js';
import punchRoutes from './punch.routes.js';
import leaveRoutes from './leave.routes.js';
// Removed missing attendanceRoutes import
import cronRoutes from './cron.routes.js';
import reportRoutes from './report.routes.js';
import migrationRoutes from './migration.routes.js';
import auditRoutes from './audit.routes.js';
import paymentRoutes from './payment.route.js';
import dashboardRoutes from './dashboard.routes.js';
import addEmployeeRoutes from './addemployee.routes.js'; // Add the new route
import hrRoutes from './hr.routes.js'; // Add HR routes
import contractorRoutes from './contractor.routes.js'; // Add contractor routes
import paidHolidayRoutes from './paidHoliday.routes.js'; // Add paid holiday routes
import visitorRoutes from './visitor.routes.js'; // Add visitor routes
import healthRoutes from './health.routes.js'; // Add health routes
import deductionRoutes from './deduction.routes.js'; // Add deduction routes
import salaryHistoryRoutes from './salaryHistory.routes.js'; // Add salary history routes

export {
  userRoutes,
  employeeRoutes,
  punchRoutes,
  leaveRoutes,
  cronRoutes,
  reportRoutes,
  migrationRoutes,
  auditRoutes,
  paymentRoutes,
  dashboardRoutes,
  addEmployeeRoutes,
  hrRoutes,
  contractorRoutes,
  paidHolidayRoutes, // Export paid holiday routes
  visitorRoutes, // Export visitor routes
  healthRoutes, // Export health routes
  deductionRoutes, // Export deduction routes
  salaryHistoryRoutes // Export salary history routes
};