#!/usr/bin/env tsx
/**
 * Production Log Viewer
 * Command-line tool for analyzing production logs and user interactions
 */

import fs from 'fs/promises';
import path from 'path';

interface LogEntry {
  timestamp: string;
  sessionId?: string;
  action?: string;
  input?: any;
  output?: any;
  error?: any;
  performance?: any;
}

class ProductionLogAnalyzer {
  private logDir: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs', 'production');
  }

  /**
   * Get all log files
   */
  async getLogFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.logDir);
      return files.filter(f => f.endsWith('.json')).sort();
    } catch (error) {
      console.error('❌ Could not read log directory:', error.message);
      return [];
    }
  }

  /**
   * Read and parse log file
   */
  async readLogFile(filename: string): Promise<LogEntry[]> {
    const filepath = path.join(this.logDir, filename);
    
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      
      return lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      console.error(`❌ Could not read log file ${filename}:`, error.message);
      return [];
    }
  }

  /**
   * Analyze daily stats
   */
  async analyzeDailyStats(date?: string): Promise<any> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const logFile = `production-${targetDate}.json`;
    
    const logs = await this.readLogFile(logFile);
    
    if (logs.length === 0) {
      return {
        date: targetDate,
        totalLogs: 0,
        message: 'No logs found for this date'
      };
    }

    // Separate different types of logs
    const userActions = logs.filter(log => 'action' in log);
    const itineraryGenerations = logs.filter(log => 'input' in log);
    const systemMetrics = logs.filter(log => 'metric' in log);

    // Analyze user actions
    const actionCounts = userActions.reduce((counts, log) => {
      const action = (log as any).action;
      counts[action] = (counts[action] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Analyze itinerary generations
    const totalGenerations = itineraryGenerations.length;
    const successfulGenerations = itineraryGenerations.filter(log => 
      (log as any).output && !(log as any).error
    ).length;
    
    const avgResponseTime = itineraryGenerations.reduce((sum, log) => {
      const perf = (log as any).performance;
      return sum + (perf?.totalDuration || 0);
    }, 0) / Math.max(totalGenerations, 1);

    // Get popular destinations
    const destinations = itineraryGenerations
      .filter(log => (log as any).output?.destinations)
      .map(log => (log as any).output.destinations)
      .reduce((counts, dest) => {
        counts[dest] = (counts[dest] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

    const topDestinations = Object.entries(destinations)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([dest, count]) => ({ destination: dest, count }));

    return {
      date: targetDate,
      totalLogs: logs.length,
      userActions: {
        total: userActions.length,
        breakdown: actionCounts
      },
      itineraryGeneration: {
        total: totalGenerations,
        successful: successfulGenerations,
        successRate: totalGenerations > 0 ? ((successfulGenerations / totalGenerations) * 100).toFixed(1) + '%' : 'N/A',
        avgResponseTime: Math.round(avgResponseTime) + 'ms'
      },
      popularDestinations: topDestinations,
      systemMetrics: {
        total: systemMetrics.length
      }
    };
  }

  /**
   * Show recent logs
   */
  async showRecentLogs(limit: number = 20) {
    const files = await this.getLogFiles();
    if (files.length === 0) {
      console.log('📝 No log files found');
      return;
    }

    // Read from most recent file
    const latestFile = files[files.length - 1];
    const logs = await this.readLogFile(latestFile);
    
    console.log(`\n📊 Recent logs from ${latestFile}`);
    console.log('='.repeat(80));

    const recentLogs = logs.slice(-limit);
    
    recentLogs.forEach(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      
      if ('action' in log) {
        // User action
        const action = (log as any).action;
        const metadata = (log as any).metadata;
        console.log(`👤 ${time} - ${action}`, metadata ? JSON.stringify(metadata).slice(0, 50) + '...' : '');
        
      } else if ('input' in log) {
        // Itinerary generation
        const input = (log as any).input;
        const output = (log as any).output;
        const error = (log as any).error;
        const perf = (log as any).performance;
        
        if (error) {
          console.log(`❌ ${time} - FAILED: "${input.prompt.slice(0, 40)}..." (${perf.totalDuration}ms)`);
          console.log(`   Error: ${error.message}`);
        } else {
          console.log(`✅ ${time} - SUCCESS: "${input.prompt.slice(0, 40)}..." → ${output.destinations} (${perf.totalDuration}ms)`);
        }
        
      } else if ('metric' in log) {
        // System metric
        const metric = (log as any).metric;
        const value = (log as any).value;
        console.log(`📊 ${time} - ${metric}: ${value}`);
      }
    });
  }

  /**
   * Show user session analysis
   */
  async analyzeUserSessions(date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const logFile = `production-${targetDate}.json`;
    
    const logs = await this.readLogFile(logFile);
    
    // Group by session ID
    const sessionGroups = logs
      .filter(log => 'sessionId' in log)
      .reduce((groups, log) => {
        const sessionId = (log as any).sessionId;
        if (!groups[sessionId]) {
          groups[sessionId] = [];
        }
        groups[sessionId].push(log);
        return groups;
      }, {} as Record<string, LogEntry[]>);

    console.log(`\n🔍 User Sessions Analysis for ${targetDate}`);
    console.log('='.repeat(80));

    Object.entries(sessionGroups).forEach(([sessionId, sessionLogs]) => {
      const startTime = new Date(sessionLogs[0].timestamp);
      const endTime = new Date(sessionLogs[sessionLogs.length - 1].timestamp);
      const duration = endTime.getTime() - startTime.getTime();
      
      const actions = sessionLogs.filter(log => 'action' in log);
      const generations = sessionLogs.filter(log => 'input' in log);
      
      console.log(`\n📱 Session: ${sessionId}`);
      console.log(`   Duration: ${Math.round(duration / 1000)}s (${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()})`);
      console.log(`   Actions: ${actions.length}, Generations: ${generations.length}`);
      
      if (generations.length > 0) {
        const successful = generations.filter(g => !(g as any).error).length;
        console.log(`   Success Rate: ${successful}/${generations.length} (${Math.round((successful/generations.length)*100)}%)`);
      }
    });
    
    console.log(`\n📈 Summary: ${Object.keys(sessionGroups).length} unique sessions`);
  }
}

// CLI Interface
async function main() {
  const analyzer = new ProductionLogAnalyzer();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📊 Production Log Analyzer');
    console.log('==========================');
    console.log('');
    console.log('Commands:');
    console.log('  recent [limit]     - Show recent log entries (default: 20)');
    console.log('  stats [date]       - Show daily statistics (YYYY-MM-DD)');
    console.log('  sessions [date]    - Analyze user sessions (YYYY-MM-DD)');
    console.log('  files              - List all log files');
    console.log('');
    console.log('Examples:');
    console.log('  npm run logs:view recent 50');
    console.log('  npm run logs:view stats 2025-09-11');
    console.log('  npm run logs:view sessions');
    return;
  }
  
  const command = args[0];
  
  try {
    switch (command) {
      case 'recent':
        const limit = parseInt(args[1]) || 20;
        await analyzer.showRecentLogs(limit);
        break;
        
      case 'stats':
        const date = args[1];
        const stats = await analyzer.analyzeDailyStats(date);
        console.log('\n📊 Daily Statistics');
        console.log('==================');
        console.log(JSON.stringify(stats, null, 2));
        break;
        
      case 'sessions':
        const sessionDate = args[1];
        await analyzer.analyzeUserSessions(sessionDate);
        break;
        
      case 'files':
        const files = await analyzer.getLogFiles();
        console.log('\n📁 Available Log Files:');
        files.forEach(file => console.log(`  ${file}`));
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}`);
        console.log('Run without arguments to see available commands.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ProductionLogAnalyzer };