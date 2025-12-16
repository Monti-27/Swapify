#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const srcAssets = join(projectRoot, 'src', 'assets');
const distAssets = join(projectRoot, 'dist', 'assets');

if (!existsSync(srcAssets)) {
  console.warn('⚠️  src/assets directory not found, skipping asset copy');
  process.exit(0);
}

// Create dist/assets directory if it doesn't exist
if (!existsSync(distAssets)) {
  mkdirSync(distAssets, { recursive: true });
}

// Copy assets directory
try {
  cpSync(srcAssets, distAssets, { recursive: true });
  console.log('✅ Assets copied to dist/');
} catch (error) {
  console.error('❌ Failed to copy assets:', error.message);
  process.exit(1);
}

