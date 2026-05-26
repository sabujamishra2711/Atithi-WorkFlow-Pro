import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execPromise = promisify(exec);

async function buildFrontend() {
  try {
    console.log('Building frontend...');

    // Change to frontend directory
    const frontendDir = path.join(__dirname, '..', '..', 'frontend');
    const backendPublicDir = path.join(__dirname, '..', 'public');
    const frontendPublicDir = path.join(backendPublicDir, 'frontend');

    // Build the frontend
    const { stdout, stderr } = await execPromise('npm run build', {
      cwd: frontendDir,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    if (stderr) {
      console.error('Build stderr:', stderr);
    }

    console.log('Frontend build completed');
    console.log(stdout);

    // Remove existing frontend directory contents
    if (await fs.pathExists(frontendPublicDir)) {
      await fs.remove(frontendPublicDir);
    }

    // Create frontend directory
    await fs.ensureDir(frontendPublicDir);

    // Copy standalone build to backend public directory
    const standaloneDir = path.join(frontendDir, '.next', 'standalone');
    if (await fs.pathExists(standaloneDir)) {
      console.log('Copying standalone build...');
      // Copy the entire standalone directory structure
      await fs.copy(standaloneDir, frontendPublicDir);
    }

    // Copy static files (CSS, JS, images, etc.) from .next/static to frontend/.next/static
    console.log('Copying static files...');
    const staticDir = path.join(frontendDir, '.next', 'static');
    const targetStaticDir = path.join(frontendPublicDir, 'frontend', '.next', 'static');
    if (await fs.pathExists(staticDir)) {
      await fs.copy(staticDir, targetStaticDir);
    }

    // Copy public directory contents if it exists
    const frontendPublicSourceDir = path.join(frontendDir, 'public');
    if (await fs.pathExists(frontendPublicSourceDir)) {
      const items = await fs.readdir(frontendPublicSourceDir);
      for (const item of items) {
        await fs.copy(
          path.join(frontendPublicSourceDir, item),
          path.join(frontendPublicDir, item)
        );
      }
    }

    // Copy package.json and server.js from standalone if they exist
    const standalonePackageJson = path.join(frontendDir, '.next', 'standalone', 'package.json');
    const standaloneServerJs = path.join(frontendDir, '.next', 'standalone', 'server.js');

    if (await fs.pathExists(standalonePackageJson)) {
      await fs.copy(standalonePackageJson, path.join(frontendPublicDir, 'package.json'));
    }

    if (await fs.pathExists(standaloneServerJs)) {
      await fs.copy(standaloneServerJs, path.join(frontendPublicDir, 'server.js'));
    }

    console.log('Frontend build copied to backend public directory');
  } catch (error) {
    console.error('Error building frontend:', error);
    process.exit(1);
  }
}

buildFrontend();