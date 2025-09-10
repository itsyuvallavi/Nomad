#!/usr/bin/env node

/**
 * Script to rename existing log files to more descriptive names
 */

import * as fs from 'fs/promises';
import * as path from 'path';

async function renameLogs() {
  const logsDir = path.join(process.cwd(), 'logs');
  
  console.log('🔄 Renaming log files to more descriptive names...\n');
  
  // Rename AI request logs
  const aiLogsDir = path.join(logsDir, 'ai-requests');
  try {
    const files = await fs.readdir(aiLogsDir);
    
    for (const file of files) {
      // Rename ai-log-YYYY-MM-DD.jsonl to ai-requests-YYYY-MM-DD.jsonl
      if (file.startsWith('ai-log-') && file.endsWith('.jsonl')) {
        const date = file.replace('ai-log-', '').replace('.jsonl', '');
        const oldPath = path.join(aiLogsDir, file);
        const newPath = path.join(aiLogsDir, `ai-requests-${date}.jsonl`);
        
        await fs.rename(oldPath, newPath);
        console.log(`✅ Renamed: ${file} → ai-requests-${date}.jsonl`);
      }
      
      // Rename session files
      if (file.startsWith('session_')) {
        // Extract timestamp from old format
        const parts = file.replace('session_', '').replace('.json', '').split('_');
        if (parts.length >= 1) {
          const timestamp = parseInt(parts[0]);
          const date = new Date(timestamp);
          const dateStr = date.toISOString().split('T')[0];
          const timeStr = date.toISOString().replace(/[:.]/g, '-').substring(11, 19);
          
          const oldPath = path.join(aiLogsDir, 'sessions', file);
          const newPath = path.join(aiLogsDir, 'sessions', `session-${dateStr}-${timeStr}.json`);
          
          try {
            await fs.rename(oldPath, newPath);
            console.log(`✅ Renamed: sessions/${file} → sessions/session-${dateStr}-${timeStr}.json`);
          } catch (err) {
            // File might not exist in sessions folder
          }
        }
      }
    }
  } catch (err) {
    console.log('⚠️  No AI request logs found to rename');
  }
  
  // Rename AI test logs
  const aiTestLogsDir = path.join(logsDir, 'ai-tests');
  try {
    const testFiles = await fs.readdir(aiTestLogsDir);
    
    for (const file of testFiles) {
      // Rename test-results-TIMESTAMP.json to ai-test-results-YYYY-MM-DD-at-HH-MM-SS.json
      if (file.startsWith('test-results-') && file.endsWith('.json')) {
        const timestampStr = file.replace('test-results-', '').replace('.json', '');
        // Parse the ISO-like timestamp
        const parts = timestampStr.split('T');
        if (parts.length === 2) {
          const date = parts[0];
          const time = parts[1].substring(0, 8).replace(/[-]/g, '-');
          
          const oldPath = path.join(aiTestLogsDir, file);
          const newPath = path.join(aiTestLogsDir, `ai-test-results-${date}-at-${time}.json`);
          
          await fs.rename(oldPath, newPath);
          console.log(`✅ Renamed: ${file} → ai-test-results-${date}-at-${time}.json`);
        }
      }
    }
  } catch (err) {
    console.log('⚠️  No AI test logs found to rename');
  }
  
  console.log('\n✨ Log renaming complete!');
  console.log('\n📝 New naming conventions:');
  console.log('  • AI requests: ai-requests-YYYY-MM-DD.jsonl');
  console.log('  • Test results: ai-test-results-YYYY-MM-DD-at-HH-MM-SS.json');
  console.log('  • Sessions: session-YYYY-MM-DD-HH-MM-SS.json');
}

// Run the script
renameLogs().catch(console.error);