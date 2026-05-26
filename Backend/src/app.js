import express, { json } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Routes import - using the index.js file
import {
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
  paidHolidayRoutes,
  visitorRoutes,
  healthRoutes,
  deductionRoutes,
  salaryHistoryRoutes
} from './routes/index.js';

const app = new express()

// For configuration we use app.use function
// Configuration for cross origin resource
dotenv.config(); // Must come before you use process.env

// Parse CORS origins properly
let corsOrigins = process.env.CORS_ORIGIN || true;
if (typeof corsOrigins === 'string') {
  // Split comma-separated origins
  corsOrigins = corsOrigins.split(',').map(origin => origin.trim());
}

// Add localhost:8000 to CORS origins for unified deployment
if (Array.isArray(corsOrigins)) {
  corsOrigins.push('http://localhost:8000');
  corsOrigins.push('http://127.0.0.1:8000');
  corsOrigins.push('https://atithi-workflow-pro.onrender.com');
} else if (corsOrigins === true) {
  // If CORS is set to true (allow all), we don't need to modify it
  corsOrigins = true;
}

app.use(cors({
  origin: corsOrigins,
  credentials: true
}))

// Configuration for accepting data from forms
app.use(express.json({ limit: "5mb" }))
// Configuration for accepting data from URL
app.use(express.urlencoded({ extended: true, limit: "5mb" }))
// Configuration for access of cookies from server
app.use(cookieParser())

// Add this at the very top, after express initialization but before routes
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl} - params:`, req.params, 'body:', req.body, 'query:', req.query);
  next();
});

// Serve frontend static files (before API routes)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');
const frontendDir = path.join(publicDir, 'frontend');
const nextDir = path.join(frontendDir, 'frontend', '.next');
const serverAppDir = path.join(nextDir, 'server', 'app');

console.log('Public directory:', publicDir);
console.log('Frontend directory:', frontendDir);
console.log('Next directory:', nextDir);
console.log('Server app directory:', serverAppDir);

// Serve static files from the Next.js build directory
// This will serve CSS, JS, images, and other static assets
// IMPORTANT: The order of these static file handlers matters!
// Handle _next/static first (for CSS, JS, images, etc.)
app.use('/_next/static', express.static(path.join(nextDir, 'static'), {
  maxAge: '1y',
  etag: false,
}));

// Handle other _next files (for server-side rendered pages)
app.use('/_next', express.static(path.join(nextDir), {
  maxAge: '1y',
  etag: false,
}));

// Handle other static files from frontend directory
app.use(express.static(frontendDir, {
  maxAge: '1d',
  etag: false,
}));

// Mount routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/add-employee', addEmployeeRoutes);
app.use('/api/v1/punch', punchRoutes);
app.use('/api/v1/leave', leaveRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/migration', migrationRoutes);
app.use('/api/v1/payment', paymentRoutes);
// Add audit routes
app.use('/api/v1/audit', auditRoutes);
// Add dashboard routes
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/cron', cronRoutes);
// Add HR routes
app.use('/api/v1/hr', hrRoutes);
// Add contractor routes
app.use('/api/v1/contractors', contractorRoutes);
// Add paid holiday routes
app.use('/api/v1/paid-holidays', paidHolidayRoutes);
// Add visitor routes
app.use('/api/v1/visitors', visitorRoutes);
// // Add health routes
// app.use('/api/v1/health', healthRoutes);
// // Also mount health routes at /api/health for Render compatibility
// app.use('/api/health', healthRoutes);

// Add deduction routes
app.use('/api/v1/deductions', deductionRoutes);

// Add salary history routes
app.use('/api/v1/salary-history', salaryHistoryRoutes);

// Serve frontend routes (this should be the last route)
// Explicitly define routes for better control
app.get('/', (req, res) => {
  const indexPath = path.join(serverAppDir, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('Error serving frontend');
    }
  });
});

// Main static routes
app.get('/documentation', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'documentation.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending documentation.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

app.get('/forgot-password', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'forgot-password.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending forgot-password.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

app.get('/login', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'login.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending login.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

app.get('/punch', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'punch.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending punch.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

app.get('/support', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'support.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending support.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// Support sub-routes
app.get('/support/account-recovery', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'support', 'account-recovery.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending support/account-recovery.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

app.get('/support/new-user', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'support', 'new-user.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending support/new-user.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

app.get('/support/technical-support', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'support', 'technical-support.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending support/technical-support.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

app.get('/test-payment', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'test-payment.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending test-payment.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

app.get('/unauthorized', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'unauthorized.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending unauthorized.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

app.get('/visitor', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'visitor.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending visitor.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// Visitor sub-routes
app.get('/visitor/pass', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'visitor', 'pass.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending visitor/pass.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Main Route
app.get('/hr', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Analytics
app.get('/hr/analytics', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'analytics.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/analytics.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Attendance
app.get('/hr/attendance', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'attendance.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/attendance.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Attendance Contractor
app.get('/hr/attendance/contractor', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'attendance', 'contractor.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/attendance/contractor.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Attendance Monthly
app.get('/hr/attendance/monthly', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'attendance', 'monthly.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/attendance/monthly.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Contractors
app.get('/hr/contractors', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'contractors.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/contractors.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Contractors Add
app.get('/hr/contractors/add', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'contractors', 'add.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/contractors/add.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Deductions
app.get('/hr/deductions', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'deductions.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/deductions.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Employees
app.get('/hr/employees', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'employees.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/employees.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Employees Add
app.get('/hr/employees/add', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'employees', 'add.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/employees/add.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Employees Profiles
app.get('/hr/employees/profiles', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'employees', 'profiles.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/employees/profiles.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Holidays
app.get('/hr/holidays', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'holidays.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/holidays.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Leaves
app.get('/hr/leaves', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'leaves.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/leaves.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Leaves Allocation
app.get('/hr/leaves/allocation', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'leaves', 'allocation.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/leaves/allocation.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Leaves Applications
app.get('/hr/leaves/applications', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'leaves', 'applications.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/leaves/applications.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Leaves Balance
app.get('/hr/leaves/balance', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'leaves', 'balance.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/leaves/balance.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Leaves Policy
app.get('/hr/leaves/policy', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'leaves', 'policy.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/leaves/policy.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Manual Attendance
app.get('/hr/manual-attendance', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'manual-attendance.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/manual-attendance.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Payroll
app.get('/hr/payroll', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'payroll.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/payroll.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Reports
app.get('/hr/reports', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'reports.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/reports.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Settings
app.get('/hr/settings', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'settings.html');
  res.sendFile(htmlFilePath, (err) => {
    if (err) {
      console.error('Error sending hr/settings.html:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    }
  });
});

// HR Visitors
app.get('/hr/visitors', (req, res) => {
  const htmlFilePath = path.join(serverAppDir, 'hr', 'visitors.html');
  // Check if the specific HTML file exists
  fs.access(htmlFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      // If the specific HTML file doesn't exist, fall back to index.html
      console.log('HR visitors HTML file not found, falling back to index.html');
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    } else {
      // If the specific HTML file exists, serve it
      res.sendFile(htmlFilePath, (err) => {
        if (err) {
          console.error('Error sending hr/visitors.html:', err);
          // Fallback to index.html
          const indexPath = path.join(serverAppDir, 'index.html');
          res.sendFile(indexPath, (err) => {
            if (err) {
              console.error('Error sending index.html:', err);
              res.status(500).send('Error serving frontend');
            }
          });
        }
      });
    }
  });
});

// Instead of dynamic routes, we'll use query parameters for employee ID cards
// This allows us to generate static HTML files
app.get('/hr/employees/id-card', (req, res) => {
  console.log('Processing HR employee ID card route with query param empId:', req.query.empId);
  // For this route, we serve the specific HTML file for ID cards
  const htmlFilePath = path.join(serverAppDir, 'hr', 'employees', 'id-card.html');

  fs.access(htmlFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('ID Card HTML file not found:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    } else {
      res.sendFile(htmlFilePath, (err) => {
        if (err) {
          console.error('Error sending ID Card HTML file:', err);
          // Fallback to index.html
          const indexPath = path.join(serverAppDir, 'index.html');
          res.sendFile(indexPath, (err) => {
            if (err) {
              console.error('Error sending index.html:', err);
              res.status(500).send('Error serving frontend');
            }
          });
        }
      });
    }
  });
});

// Similarly for contractor ID cards
app.get('/hr/contractors/id-card', (req, res) => {
  console.log('Processing HR contractor ID card route with query param contractorId:', req.query.contractorId);
  // For this route, we serve the specific HTML file for contractor ID cards
  const htmlFilePath = path.join(serverAppDir, 'hr', 'contractors', 'id-card.html');

  fs.access(htmlFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('Contractor ID Card HTML file not found:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    } else {
      res.sendFile(htmlFilePath, (err) => {
        if (err) {
          console.error('Error sending Contractor ID Card HTML file:', err);
          // Fallback to index.html
          const indexPath = path.join(serverAppDir, 'index.html');
          res.sendFile(indexPath, (err) => {
            if (err) {
              console.error('Error sending index.html:', err);
              res.status(500).send('Error serving frontend');
            }
          });
        }
      });
    }
  });
});

// Define route for HR contractor edit using query parameters instead of route parameters
app.get('/hr/contractors/edit', (req, res) => {
  console.log('Processing HR contractor edit route with query param contractorId:', req.query.contractorId);
  // For this route, we serve the specific HTML file for contractor edit
  const htmlFilePath = path.join(serverAppDir, 'hr', 'contractors', 'edit.html');

  fs.access(htmlFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('Contractor edit HTML file not found:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    } else {
      res.sendFile(htmlFilePath, (err) => {
        if (err) {
          console.error('Error sending contractor edit HTML file:', err);
          // Fallback to index.html
          const indexPath = path.join(serverAppDir, 'index.html');
          res.sendFile(indexPath, (err) => {
            if (err) {
              console.error('Error sending index.html:', err);
              res.status(500).send('Error serving frontend');
            }
          });
        }
      });
    }
  });
});

// Define route for HR visitor details using query parameters
app.get('/hr/visitors/detail', (req, res) => {
  console.log('Processing HR visitor detail route with query param visitorId:', req.query.visitorId);
  // For this route, we serve the specific HTML file for visitor details
  const htmlFilePath = path.join(serverAppDir, 'hr', 'visitors', 'detail.html');

  fs.access(htmlFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('Visitor detail HTML file not found:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    } else {
      res.sendFile(htmlFilePath, (err) => {
        if (err) {
          console.error('Error sending visitor detail HTML file:', err);
          // Fallback to index.html
          const indexPath = path.join(serverAppDir, 'index.html');
          res.sendFile(indexPath, (err) => {
            if (err) {
              console.error('Error sending index.html:', err);
              res.status(500).send('Error serving frontend');
            }
          });
        }
      });
    }
  });
});

// Define route for HR leave applications using query parameters
app.get('/hr/leaves/application', (req, res) => {
  console.log('Processing HR leave application route with query params empId:', req.query.empId, 'applicationId:', req.query.applicationId);
  // For this route, we serve the specific HTML file for leave applications
  const htmlFilePath = path.join(serverAppDir, 'hr', 'leaves', 'application.html');

  fs.access(htmlFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('Leave application HTML file not found:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    } else {
      res.sendFile(htmlFilePath, (err) => {
        if (err) {
          console.error('Error sending leave application HTML file:', err);
          // Fallback to index.html
          const indexPath = path.join(serverAppDir, 'index.html');
          res.sendFile(indexPath, (err) => {
            if (err) {
              console.error('Error sending index.html:', err);
              res.status(500).send('Error serving frontend');
            }
          });
        }
      });
    }
  });
});

// Define route for HR leave apply using query parameters
app.get('/hr/leaves/apply', (req, res) => {
  console.log('Processing HR leave apply route with query params employeeId:', req.query.employeeId, 'year:', req.query.year);
  // For this route, we serve the specific HTML file for leave apply
  const htmlFilePath = path.join(serverAppDir, 'hr', 'leaves', 'apply.html');

  fs.access(htmlFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('Leave apply HTML file not found:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    } else {
      res.sendFile(htmlFilePath, (err) => {
        if (err) {
          console.error('Error sending leave apply HTML file:', err);
          // Fallback to index.html
          const indexPath = path.join(serverAppDir, 'index.html');
          res.sendFile(indexPath, (err) => {
            if (err) {
              console.error('Error sending index.html:', err);
              res.status(500).send('Error serving frontend');
            }
          });
        }
      });
    }
  });
});

// Define route for HR leave balance using query parameters
app.get('/hr/leaves/balance', (req, res) => {
  console.log('Processing HR leave balance route with query param employeeId:', req.query.employeeId);
  // For this route, we serve the specific HTML file for leave balance
  const htmlFilePath = path.join(serverAppDir, 'hr', 'leaves', 'balance.html');

  fs.access(htmlFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('Leave balance HTML file not found:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    } else {
      res.sendFile(htmlFilePath, (err) => {
        if (err) {
          console.error('Error sending leave balance HTML file:', err);
          // Fallback to index.html
          const indexPath = path.join(serverAppDir, 'index.html');
          res.sendFile(indexPath, (err) => {
            if (err) {
              console.error('Error sending index.html:', err);
              res.status(500).send('Error serving frontend');
            }
          });
        }
      });
    }
  });
});

// Define route for HR payslip using query parameters
app.get('/hr/payroll/payslip', (req, res) => {
  console.log('Processing HR payslip route with query param empId:', req.query.empId);
  // For this route, we serve the specific HTML file for payslip
  const htmlFilePath = path.join(serverAppDir, 'hr', 'payroll', 'payslip.html');

  fs.access(htmlFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('Payslip HTML file not found:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    } else {
      res.sendFile(htmlFilePath, (err) => {
        if (err) {
          console.error('Error sending payslip HTML file:', err);
          // Fallback to index.html
          const indexPath = path.join(serverAppDir, 'index.html');
          res.sendFile(indexPath, (err) => {
            if (err) {
              console.error('Error sending index.html:', err);
              res.status(500).send('Error serving frontend');
            }
          });
        }
      });
    }
  });
});

// Define route for manual attendance using query parameters
app.get('/hr/attendance/manual', (req, res) => {
  console.log('Processing manual attendance route with query params employeeId:', req.query.employeeId, 'year:', req.query.year, 'month:', req.query.month);
  // For this route, we serve the specific HTML file for manual attendance
  const htmlFilePath = path.join(serverAppDir, 'hr', 'attendance', 'manual.html');

  fs.access(htmlFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('Manual attendance HTML file not found:', err);
      // Fallback to index.html
      const indexPath = path.join(serverAppDir, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error sending index.html:', err);
          res.status(500).send('Error serving frontend');
        }
      });
    } else {
      res.sendFile(htmlFilePath, (err) => {
        if (err) {
          console.error('Error sending manual attendance HTML file:', err);
          // Fallback to index.html
          const indexPath = path.join(serverAppDir, 'index.html');
          res.sendFile(indexPath, (err) => {
            if (err) {
              console.error('Error sending index.html:', err);
              res.status(500).send('Error serving frontend');
            }
          });
        }
      });
    }
  });
});

// Catch-all route for all other frontend routes
// For all non-API routes, serve the appropriate HTML file to enable proper client-side routing
app.get('*', (req, res, next) => {
  // If the request is for an API route that should be handled by Next.js proxy routes, let it pass through
  if (req.path.startsWith('/api/')) {
    // List of API routes that should be handled by Next.js proxy routes
    const nextJsProxyRoutes = [
      '/api/attendance/manual',
      '/api/employees',
      '/api/hr/export/attendance-sheet',
      '/api/hr/export/bank-sheet',
      '/api/hr/export/salary-sheet',
      '/api/leaves/allocate/all',
      '/api/leaves/allocate/pending',
      '/api/leaves/application',
      '/api/leaves/applications',
      '/api/leaves/apply',
      '/api/leaves/approve',
      '/api/leaves/balance',
      '/api/leaves/dashboard',
      '/api/leaves/pending-allocations',
      '/api/leaves/recalculate-balances',
      '/api/leaves/reject',
      '/api/leaves',
      '/api/punch',
      // Add other Next.js proxy routes here
    ];

    // Check if this is a Next.js proxy route
    const isNextJsProxyRoute = nextJsProxyRoutes.some(route =>
      req.path === route || req.path.startsWith(route + '/')
    );

    if (isNextJsProxyRoute) {
      // Let the request pass through to Next.js
      return next();
    }

    // For other API routes, return 404
    return res.status(404).json({
      success: false,
      message: `API route ${req.path} not found`
    });
  }

  // If the request is for a static file, let it fall through to the static middleware
  // Check for static files in _next directory or files with extensions (but not query parameters)
  if (req.path.startsWith('/_next/') ||
    (req.path.includes('.') && !req.path.includes('?'))) {
    console.log('Static file request falling through:', req.path);
    return next();
  }

  console.log('Processing request for path:', req.path);
  console.log('Request params:', req.params);
  console.log('Request query:', req.query);

  // Convert the path to a file path by removing leading slash and replacing slashes with directory separators
  let filePath = req.path;
  if (filePath.startsWith('/')) {
    filePath = filePath.substring(1);
  }

  // For the root path, serve index.html
  if (filePath === '') {
    filePath = 'index.html';
  } else {
    // For other paths, append .html extension
    filePath = filePath + '.html';
  }

  // Construct the full path to the HTML file
  const htmlFilePath = path.join(serverAppDir, filePath);
  console.log('Looking for HTML file at:', htmlFilePath);

  // Check if the specific HTML file exists
  return fs.access(htmlFilePath, fs.constants.F_OK, (err) => {
    if (err) {
      // If the specific HTML file doesn't exist, try to serve index.html as fallback
      console.log('Specific HTML file not found, falling back to index.html');
      const indexPath = path.join(serverAppDir, 'index.html');
      return fs.access(indexPath, fs.constants.F_OK, (err) => {
        if (err) {
          console.error('Failed to serve frontend:', err);
          return res.status(200).send(`
            <html>
              <head>
                <title>Atithi WorkFlow Pro</title>
              </head>
              <body>
                <h1>Atithi WorkFlow Pro</h1>
                <p>Frontend is not built yet. Please run the build process.</p>
                <p>Debug info: Looking for index.html at ${indexPath}</p>
              </body>
            </html>
          `);
        } else {
          console.log('Serving index.html as fallback');
          return res.sendFile(indexPath, (err) => {
            if (err) {
              console.error('Error sending index.html:', err);
              res.status(500).send('Error serving frontend');
            }
          });
        }
      });
    } else {
      console.log('Serving specific HTML file:', htmlFilePath);
      return res.sendFile(htmlFilePath, (err) => {
        if (err) {
          console.error('Error sending HTML file:', err);
          // Fallback to index.html if there's an error
          const indexPath = path.join(serverAppDir, 'index.html');
          return res.sendFile(indexPath, (err) => {
            if (err) {
              console.error('Error sending index.html:', err);
              res.status(500).send('Error serving frontend');
            }
          });
        }
      });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ API Error:', err.message);
  console.error('Stack:', err.stack);

  // If it's an ApiError, use its status and message
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || []
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: err.message
  });
});

export { app }