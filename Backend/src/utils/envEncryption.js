// Environment variable encryption utility
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

class EnvEncryption {
  constructor(password) {
    if (!password) {
      throw new Error('Password is required for encryption');
    }
    this.key = crypto.scryptSync(password, 'salt', KEY_LENGTH);
  }

  // Encrypt environment variables
  encrypt(data) {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipher(ALGORITHM, this.key);
      cipher.setAAD(Buffer.from('env-data'));
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  // Decrypt environment variables
  decrypt(encryptedData) {
    try {
      const { encrypted, iv, tag } = encryptedData;
      const decipher = crypto.createDecipher(ALGORITHM, this.key);
      
      decipher.setAAD(Buffer.from('env-data'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  // Encrypt .env file
  encryptEnvFile(envPath, outputPath) {
    try {
      if (!fs.existsSync(envPath)) {
        throw new Error(`Environment file not found: ${envPath}`);
      }

      const envContent = fs.readFileSync(envPath, 'utf8');
      const encrypted = this.encrypt(envContent);
      
      // Save encrypted data as JSON
      fs.writeFileSync(outputPath, JSON.stringify(encrypted, null, 2));
      
      console.log(`✅ Environment file encrypted: ${outputPath}`);
      
      // Optionally delete original file
      const deleteOriginal = process.argv.includes('--delete-original');
      if (deleteOriginal) {
        fs.unlinkSync(envPath);
        console.log(`🗑️ Original file deleted: ${envPath}`);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Encryption failed:`, error.message);
      return false;
    }
  }

  // Decrypt .env file
  decryptEnvFile(encryptedPath, outputPath) {
    try {
      if (!fs.existsSync(encryptedPath)) {
        throw new Error(`Encrypted file not found: ${encryptedPath}`);
      }

      const encryptedData = JSON.parse(fs.readFileSync(encryptedPath, 'utf8'));
      const decrypted = this.decrypt(encryptedData);
      
      fs.writeFileSync(outputPath, decrypted);
      console.log(`✅ Environment file decrypted: ${outputPath}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Decryption failed:`, error.message);
      return false;
    }
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const password = process.env.ENV_PASSWORD || process.argv[3];
  
  if (!password) {
    console.error('❌ Password required. Set ENV_PASSWORD or pass as argument.');
    process.exit(1);
  }

  const encryption = new EnvEncryption(password);

  switch (command) {
    case 'encrypt':
      const envPath = process.argv[4] || '.env';
      const encryptedPath = process.argv[5] || '.env.encrypted';
      encryption.encryptEnvFile(envPath, encryptedPath);
      break;
      
    case 'decrypt':
      const encPath = process.argv[4] || '.env.encrypted';
      const decPath = process.argv[5] || '.env';
      encryption.decryptEnvFile(encPath, decPath);
      break;
      
    default:
      console.log(`
Usage:
  node envEncryption.js encrypt [input] [output] [--delete-original]
  node envEncryption.js decrypt [encrypted-file] [output]

Environment Variables:
  ENV_PASSWORD - Password for encryption/decryption

Examples:
  ENV_PASSWORD=mypassword node envEncryption.js encrypt .env .env.encrypted
  ENV_PASSWORD=mypassword node envEncryption.js decrypt .env.encrypted .env
      `);
  }
}

export default EnvEncryption;