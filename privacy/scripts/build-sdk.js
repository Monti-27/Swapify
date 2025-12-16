#!/usr/bin/env node

import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const sdkPath = join(projectRoot, 'privacy-cash-sdk');

if (!existsSync(sdkPath)) {
  console.error('❌ privacy-cash-sdk directory not found!');
  console.error('');
  console.error('   The SDK directory is required for the build.');
  console.error('   Options to include it in Railway:');
  console.error('');
  console.error('   Option 1: Add as git submodule (recommended):');
  console.error('     git submodule add https://github.com/Privacy-Cash/privacy-cash-sdk.git privacy-cash-sdk');
  console.error('     # Then commit your local changes in the submodule');
  console.error('');
  console.error('   Option 2: Remove nested git and add to main repo:');
  console.error('     rm -rf privacy-cash-sdk/.git');
  console.error('     git add privacy-cash-sdk');
  console.error('     git commit -m "Add privacy-cash-sdk with local changes"');
  process.exit(1);
}

const sdkPackageJson = join(sdkPath, 'package.json');
if (!existsSync(sdkPackageJson)) {
  console.warn('⚠️  privacy-cash-sdk/package.json not found, skipping SDK build');
  process.exit(0);
}

const sdkDist = join(sdkPath, 'dist');
const needsBuild = !existsSync(sdkDist) || !existsSync(join(sdkDist, 'index.js'));

if (needsBuild) {
  console.log('🔨 Building privacy-cash-sdk...');
  try {
    process.chdir(sdkPath);
    execSync('npm install', { stdio: 'inherit' });
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ SDK build complete');
  } catch (error) {
    console.error('❌ SDK build failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ SDK already built, skipping...');
}

