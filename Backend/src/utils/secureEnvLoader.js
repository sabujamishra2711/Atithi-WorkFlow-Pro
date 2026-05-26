// Secure environment variable loader
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import EnvEncryption from './envEncryption.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SecureEnvLoader {
  constructor() {
    this.loaded = false;
    this.envVars = {};
  }

  // Load environment variables with password protection
  async loadSecureEnv(password) {
    try {
      if (this.loaded) {
        return this.envVars;
      }

      // Try different environment file locations
      const envPaths = [
        path.join(__dirname, '../../.env'),
        path.join(__dirname, '../../.env.encrypted'),
        path.join(__dirname, '../../../.env'),
        path.join(__dirname, '../../../.env.encrypted'),
      ];

      let envContent = '';
      let foundFile = null;

      // Look for encrypted file first
      for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
          foundFile = envPath;
          
          if (envPath.endsWith('.encrypted')) {
            // Decrypt encrypted file
            if (!password) {
              throw new Error('Password required for encrypted environment file');
            }
            
            const encryption = new EnvEncryption(password);
            const encryptedData = JSON.parse(fs.readFileSync(envPath, 'utf8'));
            envContent = encryption.decrypt(encryptedData);
            console.log('✅ Loaded encrypted environment file');
          } else {
            // Load plain text file
            envContent = fs.readFileSync(envPath, 'utf8');
            console.log('⚠️ Loaded plain text environment file (consider encrypting)');
          }
          break;
        }
      }

      if (!foundFile) {
        throw new Error('No environment file found');
      }

      // Parse environment variables
      this.envVars = this.parseEnvContent(envContent);
      this.loaded = true;

      // Set environment variables
      Object.keys(this.envVars).forEach(key => {
        if (!process.env[key]) {
          process.env[key] = this.envVars[key];
        }
      });

      console.log(`✅ Loaded ${Object.keys(this.envVars).length} environment variables`);
      return this.envVars;

    } catch (error) {
      console.error('❌ Failed to load environment variables:', error.message);
      throw error;
    }
  }

  // Parse environment file content
  parseEnvContent(content) {
    const envVars = {};
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      line = line.trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        return;
      }

      const equalIndex = line.indexOf('=');
      if (equalIndex === -1) {
        console.warn(`⚠️ Invalid env line ${index + 1}: ${line}`);
        return;
      }

      const key = line.substring(0, equalIndex).trim();
      let value = line.substring(equalIndex + 1).trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      envVars[key] = value;
    });

    return envVars;
  }

  // Get specific environment variable
  get(key, defaultValue = null) {
    return this.envVars[key] || process.env[key] || defaultValue;
  }

  // Check if environment is loaded
  isLoaded() {
    return this.loaded;
  }

  // Get all loaded variables (excluding sensitive ones)
  getAll(includeSensitive = false) {
    if (!includeSensitive) {
      const sensitiveKeys = [
        'PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'PRIVATE',
        'MONGODB_URI', 'DATABASE_URL', 'API_KEY'
      ];
      
      const filtered = {};
      Object.keys(this.envVars).forEach(key => {
        const isSensitive = sensitiveKeys.some(sensitive => 
          key.toUpperCase().includes(sensitive)
        );
        
        if (!isSensitive) {
          filtered[key] = this.envVars[key];
        } else {
          filtered[key] = '***HIDDEN***';
        }
      });
      
      return filtered;
    }
    
    return this.envVars;
  }
}

// Singleton instance
const secureEnvLoader = new SecureEnvLoader();

// Auto-load environment variables
const autoLoad = async () => {
  try {
    // Try to get password from various sources
    const password = 
      process.env.ENV_PASSWORD ||           // Environment variable
      process.argv.find(arg => arg.startsWith('--env-password='))?.split('=')[1] || // CLI argument
      null;

    if (password) {
      await secureEnvLoader.loadSecureEnv(password);
    } else {
      // Try loading without password (plain text file)
      await secureEnvLoader.loadSecureEnv();
    }
  } catch (error) {
    console.error('❌ Auto-load environment failed:', error.message);
    console.log('💡 Tip: Set ENV_PASSWORD environment variable or use --env-password=yourpassword');
  }
};

// Auto-load when module is imported
if (process.env.NODE_ENV !== 'test') {
  autoLoad();
}

export default secureEnvLoader;