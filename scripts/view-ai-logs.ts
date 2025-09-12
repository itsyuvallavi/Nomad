#!/usr/bin/env tsx
/**
 * CLI tool to view AI logs
 */

import fs from 'fs/promises';
import path from 'path';
import { getAILogger } from '../src/lib/utils/ai-logger';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function main() {
  const command = process.argv[2] || 'recent';
  const logger = getAILogger();

  console.log(`${colors.cyan}🔍 AI Log Viewer${colors.reset}`);
  console.log('─'.repeat(50));

  switch (command) {
    case 'recent':
      await showRecentLogs();
      break;
    case 'stats':
      await showStats();
      break;
    case 'errors':
      await showErrors();
      break;
    case 'help':
      showHelp();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      showHelp();
  }
}

async function showRecentLogs() {
  const logger = getAILogger();
  const logs = await logger.getRecentLogs(10);
  
  if (logs.length === 0) {
    console.log('No recent logs found');
    return;
  }

  console.log(`\n${colors.bright}Recent AI Requests:${colors.reset}\n`);
  
  for (const log of logs) {
    const color = log.type === 'error' ? colors.red : 
                  log.type === 'response' ? colors.green : colors.blue;
    
    console.log(`${color}[${log.type.toUpperCase()}]${colors.reset} ${log.timestamp}`);
    console.log(`  ID: ${log.id}`);
    
    if (log.prompt) {
      console.log(`  Prompt: "${log.prompt.substring(0, 80)}${log.prompt.length > 80 ? '...' : ''}"`);
    }
    
    if (log.duration) {
      console.log(`  Duration: ${log.duration}ms`);
    }
    
    if (log.error) {
      console.log(`  ${colors.red}Error: ${log.error}${colors.reset}`);
    }
    
    if (log.metadata) {
      console.log(`  Metadata:`, log.metadata);
    }
    
    console.log('');
  }
}

async function showStats() {
  const logger = getAILogger();
  const today = new Date().toISOString().split('T')[0];
  const stats = await logger.getDailyStats(today);
  
  console.log(`\n${colors.bright}Daily Statistics (${today}):${colors.reset}\n`);
  console.log(`  Total Requests: ${stats.totalRequests}`);
  console.log(`  Successful: ${stats.successfulResponses}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Success Rate: ${stats.successRate}`);
  console.log(`  Avg Response Time: ${stats.avgResponseTime}`);
}

async function showErrors() {
  const logger = getAILogger();
  const logs = await logger.getRecentLogs(100);
  const errors = logs.filter(l => l.type === 'error');
  
  if (errors.length === 0) {
    console.log('No errors found in recent logs');
    return;
  }
  
  console.log(`\n${colors.red}Recent Errors:${colors.reset}\n`);
  
  for (const error of errors.slice(-10)) {
    console.log(`${colors.red}[ERROR]${colors.reset} ${error.timestamp}`);
    console.log(`  ID: ${error.id}`);
    console.log(`  Error: ${error.error}`);
    if (error.duration) {
      console.log(`  Failed after: ${error.duration}ms`);
    }
    console.log('');
  }
}

function showHelp() {
  console.log(`
${colors.bright}Usage:${colors.reset}
  npm run logs:ai [command]

${colors.bright}Commands:${colors.reset}
  recent   - Show recent AI requests (default)
  stats    - Show daily statistics
  errors   - Show recent errors
  help     - Show this help message

${colors.bright}Examples:${colors.reset}
  npm run logs:ai
  npm run logs:ai stats
  npm run logs:ai errors
  `);
}

main().catch(console.error);