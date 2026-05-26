// Script to secure environment files with proper permissions
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const secureEnvFiles = () => {
  const envFiles = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../../.env'),
    path.join(__dirname, '../../../.env')
  ];

  envFiles.forEach(envFile => {
    if (fs.existsSync(envFile)) {
      try {
        // Set file permissions to read-only for owner only (600)
        fs.chmodSync(envFile, 0o600);
        console.log(`✅ Secured ${envFile} with 600 permissions`);
        
        // Hide the file (add dot prefix if not already hidden)
        const dir = path.dirname(envFile);
        const filename = path.basename(envFile);
        if (!filename.startsWith('.')) {
          const hiddenPath = path.join(dir, `.${filename}`);
          fs.renameSync(envFile, hiddenPath);
          console.log(`✅ Hidden ${envFile} as ${hiddenPath}`);
        }
      } catch (error) {
        console.error(`❌ Failed to secure ${envFile}:`, error.message);
      }
    }
  });
};

// Run the security script
secureEnvFiles();