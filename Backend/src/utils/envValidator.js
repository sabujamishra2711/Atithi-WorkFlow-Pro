// Environment variable validation and security
import crypto from 'crypto';

class EnvValidator {
  constructor() {
    this.requiredVars = [
      'MONGODB_URI',
      'ACCESS_TOKEN_SECRET',
      'REFRESH_TOKEN_SECRET',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET'
    ];
    
    this.sensitiveVars = [
      'PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'PRIVATE',
      'MONGODB_URI', 'DATABASE_URL', 'API_KEY', 'CLOUDINARY'
    ];
  }

  // Validate all required environment variables
  validateRequired() {
    const missing = [];
    const invalid = [];

    this.requiredVars.forEach(varName => {
      const value = process.env[varName];
      
      if (!value) {
        missing.push(varName);
      } else if (this.isWeakValue(varName, value)) {
        invalid.push(varName);
      }
    });

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    if (invalid.length > 0) {
      console.warn(`⚠️ Weak environment variables detected: ${invalid.join(', ')}`);
    }

    console.log('✅ All required environment variables are present');
    return true;
  }

  // Check if environment variable value is weak
  isWeakValue(varName, value) {
    // Check for common weak patterns
    const weakPatterns = [
      'password', '123456', 'admin', 'test', 'demo',
      'secret', 'key', 'token', 'default'
    ];

    const lowerValue = value.toLowerCase();
    
    // Check for weak patterns
    if (weakPatterns.some(pattern => lowerValue.includes(pattern))) {
      return true;
    }

    // Check minimum length for secrets
    if (varName.includes('SECRET') || varName.includes('KEY')) {
      return value.length < 32;
    }

    return false;
  }

  // Mask sensitive environment variables for logging
  maskSensitiveVars(envVars) {
    const masked = {};
    
    Object.keys(envVars).forEach(key => {
      const value = envVars[key];
      const isSensitive = this.sensitiveVars.some(sensitive => 
        key.toUpperCase().includes(sensitive)
      );

      if (isSensitive && value) {
        // Show first 4 and last 4 characters
        if (value.length > 8) {
          masked[key] = `${value.substring(0, 4)}***${value.substring(value.length - 4)}`;
        } else {
          masked[key] = '***HIDDEN***';
        }
      } else {
        masked[key] = value;
      }
    });

    return masked;
  }

  // Generate secure random values for environment variables
  generateSecureValue(type = 'secret', length = 64) {
    switch (type) {
      case 'secret':
      case 'key':
        return crypto.randomBytes(length).toString('hex');
      
      case 'password':
        // Generate password with mixed characters
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      
      case 'uuid':
        return crypto.randomUUID();
      
      default:
        return crypto.randomBytes(32).toString('base64');
    }
  }

  // Create secure environment template
  createSecureTemplate() {
    const template = `# Atithi LLP HR System - Environment Configuration
# Generated on: ${new Date().toISOString()}
# 
# SECURITY NOTICE:
# - Keep this file secure and never commit to version control
# - Use strong, unique values for all secrets
# - Regularly rotate secrets in production
# 

# Server Configuration
PORT=8000
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com

# Database Configuration
MONGODB_URI=mongodb+srv://username:${this.generateSecureValue('password', 16)}@cluster.mongodb.net/database

# JWT Secrets (Keep these secure!)
ACCESS_TOKEN_SECRET=${this.generateSecureValue('secret', 64)}
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=${this.generateSecureValue('secret', 64)}
REFRESH_TOKEN_EXPIRY=10d

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=${this.generateSecureValue('secret', 32)}

# Optional: Environment Protection
ENV_PASSWORD=${this.generateSecureValue('password', 24)}

# Application Specific
APP_NAME="Atithi LLP HR System"
APP_VERSION=1.0.0
`;

    return template;
  }

  // Check environment security
  checkSecurity() {
    const issues = [];
    const recommendations = [];

    // Check if running in production
    if (process.env.NODE_ENV === 'production') {
      // Production-specific checks
      if (process.env.CORS_ORIGIN === 'http://localhost:3000') {
        issues.push('CORS_ORIGIN still set to localhost in production');
      }

      if (!process.env.HTTPS) {
        recommendations.push('Consider enabling HTTPS in production');
      }
    }

    // Check for common security issues
    if (process.env.DEBUG === 'true' && process.env.NODE_ENV === 'production') {
      issues.push('Debug mode enabled in production');
    }

    return {
      issues,
      recommendations,
      secure: issues.length === 0
    };
  }
}

export default EnvValidator;