#!/usr/bin/env node

import 'dotenv/config';
import { CLI } from './cli/index.js';

async function main() {
  const cli = new CLI();
  await cli.run();
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});