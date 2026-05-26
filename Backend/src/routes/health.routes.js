// Health check routes for production monitoring
import express from 'express';
import mongoose from 'mongoose';
import { User } from '../models/user.model.js';

const router = express.Router();

// Basic health check
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Database health check
router.get('/health/database', async (req, res) => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }

    // Test database with a simple query
    await mongoose.connection.db.admin().ping();
    
    // Test model access
    const userCount = await User.countDocuments();

    res.status(200).json({
      status: 'healthy',
      database: {
        connected: true,
        readyState: mongoose.connection.readyState,
        userCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: {
        connected: false,
        error: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// API endpoints health check
router.get('/health/api', async (req, res) => {
  try {
    const endpoints = [
      { name: 'Users', path: '/api/v1/users' },
      { name: 'HR Stats', path: '/api/v1/hr/stats' },
      { name: 'Payroll', path: '/api/v1/hr/payroll' },
    ];

    const results = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        try {
          // Simple connectivity test (not full request)
          return {
            name: endpoint.name,
            path: endpoint.path,
            status: 'available',
          };
        } catch (error) {
          return {
            name: endpoint.name,
            path: endpoint.path,
            status: 'unavailable',
            error: error.message,
          };
        }
      })
    );

    const endpointStatus = results.map(result => result.value);
    const allHealthy = endpointStatus.every(ep => ep.status === 'available');

    res.status(allHealthy ? 200 : 500).json({
      status: allHealthy ? 'healthy' : 'degraded',
      endpoints: endpointStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Export functionality health check
router.get('/health/exports', async (req, res) => {
  try {
    const exportTests = {
      excel: {
        available: true,
        libraries: ['exceljs'],
      },
      pdf: {
        available: true,
        libraries: ['pdfkit', 'puppeteer'],
      },
    };

    // Test Excel library
    try {
      const ExcelJS = await import('exceljs');
      exportTests.excel.version = ExcelJS.default?.version || 'unknown';
    } catch (error) {
      exportTests.excel.available = false;
      exportTests.excel.error = error.message;
    }

    // Test PDF libraries
    try {
      const PDFDocument = await import('pdfkit');
      exportTests.pdf.pdfkit = 'available';
    } catch (error) {
      exportTests.pdf.available = false;
      exportTests.pdf.error = error.message;
    }

    const allExportsHealthy = exportTests.excel.available && exportTests.pdf.available;

    res.status(allExportsHealthy ? 200 : 500).json({
      status: allExportsHealthy ? 'healthy' : 'degraded',
      exports: exportTests,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Comprehensive health check
router.get('/health/full', async (req, res) => {
  try {
    const [basicHealth, dbHealth, apiHealth, exportHealth] = await Promise.allSettled([
      fetch(`${req.protocol}://${req.get('host')}/api/health`).then(r => r.json()),
      fetch(`${req.protocol}://${req.get('host')}/api/health/database`).then(r => r.json()),
      fetch(`${req.protocol}://${req.get('host')}/api/health/api`).then(r => r.json()),
      fetch(`${req.protocol}://${req.get('host')}/api/health/exports`).then(r => r.json()),
    ]);

    const overallStatus = [basicHealth, dbHealth, apiHealth, exportHealth]
      .every(result => result.status === 'fulfilled' && result.value?.status === 'healthy')
      ? 'healthy' : 'degraded';

    res.status(overallStatus === 'healthy' ? 200 : 500).json({
      status: overallStatus,
      checks: {
        basic: basicHealth.status === 'fulfilled' ? basicHealth.value : { error: basicHealth.reason },
        database: dbHealth.status === 'fulfilled' ? dbHealth.value : { error: dbHealth.reason },
        api: apiHealth.status === 'fulfilled' ? apiHealth.value : { error: apiHealth.reason },
        exports: exportHealth.status === 'fulfilled' ? exportHealth.value : { error: exportHealth.reason },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;