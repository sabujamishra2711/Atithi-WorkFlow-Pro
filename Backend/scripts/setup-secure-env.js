#!/usr/bin/env node
// Setup script for secure environment configuration

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import EnvValidator from '../src/utils/envValidator.js';
import EnvEncryption from '../src/utils/envEncryption.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

class EnvSetup {
  constructor() {
    this.validator = new EnvValidator();
    this.envPath = path.join(__dirname, '../.env');
    this.encryptedPath = path.join(__dirname, '../.env.encrypted');
  }

  async run() {
    console.log('🔐 Atithi LLP HR System - Environment Security Setup\n');

    try {
      const action = await question(`
Choose an action:
1. Create new secure environment file
2. Encrypt existing environment file
3. Decrypt environment file
4. Validate current environment
5. Generate secure template

Enter choice (1-5): `);

      switch (action.trim()) {
        case '1':
          await this.createSecureEnv();
          break;
        case '2':
          await this.encryptEnv();
          break;
        case '3':
          await this.decryptEnv();
          break;
        case '4':
          await this.validateEnv();
          break;
        case '5':
          await this.generateTemplate();
          break;
        default:
          console.log('❌ Invalid choice');
      }
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
    } finally {
      rl.close();
    }
  }

  async createSecureEnv() {
    console.log('\n📝 Creating secure environment file...\n');

    const config = {};

    // Basic configuration
    config.PORT = await question('Server port (default: 8000): ') || '8000';
    config.NODE_ENV = await question('Environment (development/production): ') || 'development';
    config.CORS_ORIGIN = await question('CORS origin (e.g., https://yourdomain.com): ') || 'http://localhost:3000';

    // Database
    config.MONGODB_URI = await question('MongoDB URI: ');
    if (!config.MONGODB_URI) {
      console.log('❌ MongoDB URI is required');
      return;
    }

    // Generate secure secrets
    console.log('\n🔑 Generating secure secrets...');
    config.ACCESS_TOKEN_SECRET = this.validator.generateSecureValue('secret', 64);
    config.ACCESS_TOKEN_EXPIRY = '1d';
    config.REFRESH_TOKEN_SECRET = this.validator.generateSecureValue('secret', 64);
    config.REFRESH_TOKEN_EXPIRY = '10d';

    // Cloudinary
    config.CLOUDINARY_CLOUD_NAME = await question('Cloudinary cloud name: ');
    config.CLOUDINARY_API_KEY = await question('Cloudinary API key: ');
    config.CLOUDINARY_API_SECRET = await question('Cloudinary API secret: ');

    // Create environment file content
    const envContent = Object.entries(config)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Ask if user wants to encrypt
    const encrypt = await question('\n🔐 Encrypt environment file? (y/n): ');
    
    if (encrypt.toLowerCase() === 'y') {
      const password = await question('Enter encryption password: ');
      if (password) {
        const encryption = new EnvEncryption(password);
        const encrypted = encryption.encrypt(envContent);
        
        fs.writeFileSync(this.encryptedPath, JSON.stringify(encrypted, null, 2));
        console.log(`✅ Encrypted environment file created: ${this.encryptedPath}`);
        
        // Save password hint
        const hint = await question('Enter password hint (optional): ');
        if (hint) {
          fs.writeFileSync(this.encryptedPath + '.hint', hint);
          console.log('💡 Password hint saved');
        }
      }
    } else {
      fs.writeFileSync(this.envPath, envContent);
      console.log(`✅ Environment file created: ${this.envPath}`);
      
      // Secure the file
      fs.chmodSync(this.envPath, 0o600);
      console.log('🔒 File permissions set to 600 (owner read/write only)');
    }

    console.log('\n✅ Environment setup complete!');
  }

  async encryptEnv() {
    if (!fs.existsSync(this.envPath)) {
      console.log('❌ Environment file not found:', this.envPath);
      return;
    }

    const password = await question('Enter encryption password: ');
    if (!password) {
      console.log('❌ Password is required');
      return;
    }

    try {
      const encryption = new EnvEncryption(password);
      encryption.encryptEnvFile(this.envPath, this.encryptedPath);
      
      const deleteOriginal = await question('Delete original file? (y/n): ');
      if (deleteOriginal.toLowerCase() === 'y') {
        fs.unlinkSync(this.envPath);
        console.log('🗑️ Original file deleted');
      }
      
      console.log('✅ Environment file encrypted successfully');
    } catch (error) {
      console.error('❌ Encryption failed:', error.message);
    }
  }

  async decryptEnv() {
    if (!fs.existsSync(this.encryptedPath)) {
      console.log('❌ Encrypted environment file not found:', this.encryptedPath);
      return;
    }

    // Show password hint if available
    const hintPath = this.encryptedPath + '.hint';
    if (fs.existsSync(hintPath)) {
      const hint = fs.readFileSync(hintPath, 'utf8');
      console.log(`💡 Password hint: ${hint}`);
    }

    const password = await question('Enter decryption password: ');
    if (!password) {
      console.log('❌ Password is required');
      return;
    }

    try {
      const encryption = new EnvEncryption(password);
      encryption.decryptEnvFile(this.encryptedPath, this.envPath);
      
      // Secure the decrypted file
      fs.chmodSync(this.envPath, 0o600);
      console.log('✅ Environment file decrypted and secured');
    } catch (error) {
      console.error('❌ Decryption failed:', error.message);
    }
  }

  async validateEnv() {
    try {
      this.validator.validateRequired();
      
      const security = this.validator.checkSecurity();
      
      if (security.secure) {
        console.log('✅ Environment configuration is secure');
      } else {
        console.log('⚠️ Security issues found:');
        security.issues.forEach(issue => console.log(`  - ${issue}`));
      }

      if (security.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        security.recommendations.forEach(rec => console.log(`  - ${rec}`));
      }

      // Show masked environment variables
      const masked = this.validator.maskSensitiveVars(process.env);
      console.log('\n📋 Current environment variables:');
      Object.entries(masked).forEach(([key, value]) => {
        if (key.startsWith('npm_') || key.startsWith('NODE_')) return;
        console.log(`  ${key}=${value}`);
      });

    } catch (error) {
      console.error('❌ Validation failed:', error.message);
    }
  }

  async generateTemplate() {
    const template = this.validator.createSecureTemplate();
    const templatePath = path.join(__dirname, '../.env.template');
    
    fs.writeFileSync(templatePath, template);
    console.log(`✅ Secure environment template created: ${templatePath}`);
    console.log('\n📝 Template includes:');
    console.log('  - Secure random secrets');
    console.log('  - Security best practices');
    console.log('  - Configuration comments');
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new EnvSetup();
  setup.run();
}