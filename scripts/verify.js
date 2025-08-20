#!/usr/bin/env node

// Simple verification script to check if the project structure is correct

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { access, constants } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const requiredFiles = [
  'package.json',
  'tsconfig.json',
  '.env.example',
  'README.md',
  'SETUP.md',
  'HTTP_TRANSPORT.md',
  'src/index.ts',
  'src/types/index.ts',
  'src/llm/base.ts',
  'src/llm/factory.ts',
  'src/llm/openai.ts',
  'src/llm/anthropic.ts',
  'src/mcp/hub.ts',
  'src/chat/engine.ts',
  'src/cli/index.ts',
  'src/config/manager.ts',
  'examples/http-server.js',
  'examples/package.json',
];

async function verify() {
  console.log('🔍 Verifying project structure...');
  
  let allGood = true;
  
  for (const file of requiredFiles) {
    try {
      await access(join(projectRoot, file), constants.F_OK);
      console.log(`✅ ${file}`);
    } catch (error) {
      console.log(`❌ ${file} - Missing!`);
      allGood = false;
    }
  }
  
  if (allGood) {
    console.log('✨ All required files are present!');
    console.log('📝 Next steps:');
    console.log('   1. npm install');
    console.log('   2. cp .env.example .env');
    console.log('   3. Edit .env with your API key');
    console.log('   4. npm run dev config');
  } else {
    console.log('⚠️  Some files are missing. Please check the project structure.');
    process.exit(1);
  }
}

verify().catch(console.error);