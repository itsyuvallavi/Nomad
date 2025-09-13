/**
 * AI Request/Response Logger
 * Logs all AI generation requests and responses for debugging and analysis
 */

import fs from 'fs/promises';
import path from 'path';

export interface AILogEntry {
  id: string;
  timestamp: string;
  type: 'request' | 'response' | 'error';
  prompt?: string;
  response?: any;
  error?: string;
  duration?: number;
  metadata?: {
    model?: string;
    temperature?: number;
    strategy?: string;
    tokensUsed?: number;
    origin?: string;
    destinations?: string[];
    totalDays?: number;
  };
}

class AILogger {
  private logDir: string;
  private currentSessionId: string;
  private requestStartTime: number = 0;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs', 'ai-requests');
    this.currentSessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    const now = new Date();
    // Convert to LA time (PST/PDT) using Intl.DateTimeFormat
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const p: any = {};
    parts.forEach(part => {
      if (part.type !== 'literal') p[part.type] = part.value;
    });
    
    return `session-${p.year}-${p.month}-${p.day}-${p.hour}-${p.minute}-${p.second}`;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('[AILogger] Failed to create log directory:', error);
    }
  }

  async logRequest(prompt: string, metadata?: AILogEntry['metadata']): Promise<string> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.requestStartTime = Date.now();

    const entry: AILogEntry = {
      id: requestId,
      timestamp: new Date().toISOString(),
      type: 'request',
      prompt,
      metadata
    };

    await this.writeLog(entry);
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AI Request]', {
        id: requestId,
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        metadata
      });
    }

    return requestId;
  }

  async logResponse(
    requestId: string, 
    response: any, 
    metadata?: AILogEntry['metadata']
  ): Promise<void> {
    const duration = Date.now() - this.requestStartTime;

    const entry: AILogEntry = {
      id: requestId,
      timestamp: new Date().toISOString(),
      type: 'response',
      response,
      duration,
      metadata
    };

    await this.writeLog(entry);

    // Log summary to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AI Response]', {
        id: requestId,
        duration: `${duration}ms`,
        destinations: response.destination,
        days: response.itinerary?.length,
        activities: response.itinerary?.reduce((sum: number, day: any) => 
          sum + (day.activities?.length || 0), 0)
      });
    }
  }

  async logError(
    requestId: string, 
    error: Error | string, 
    metadata?: AILogEntry['metadata']
  ): Promise<void> {
    const duration = Date.now() - this.requestStartTime;

    const entry: AILogEntry = {
      id: requestId,
      timestamp: new Date().toISOString(),
      type: 'error',
      error: error instanceof Error ? error.message : error,
      duration,
      metadata
    };

    await this.writeLog(entry);

    // Log to console
    console.error('[AI Error]', {
      id: requestId,
      error: error instanceof Error ? error.message : error,
      duration: `${duration}ms`
    });
  }

  private async writeLog(entry: AILogEntry): Promise<void> {
    try {
      // Write to daily log file using LA timezone
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      const parts = formatter.formatToParts(now);
      const p: any = {};
      parts.forEach(part => {
        if (part.type !== 'literal') p[part.type] = part.value;
      });
      
      const date = `${p.year}-${p.month}-${p.day}`;
      const logFile = path.join(this.logDir, `ai-requests-${date}.jsonl`);
      
      // Append to JSONL file
      await fs.appendFile(logFile, JSON.stringify(entry) + '\n');

      // Also write to a session-specific file for easier debugging
      const sessionFile = path.join(this.logDir, 'sessions', `${this.currentSessionId}.jsonl`);
      await fs.mkdir(path.dirname(sessionFile), { recursive: true });
      await fs.appendFile(sessionFile, JSON.stringify(entry) + '\n');

      // Keep a rolling buffer of recent requests in memory (for quick access)
      await this.updateRecentRequests(entry);

    } catch (error) {
      console.error('[AILogger] Failed to write log:', error);
    }
  }

  private async updateRecentRequests(entry: AILogEntry): Promise<void> {
    const recentFile = path.join(this.logDir, 'recent.json');
    
    try {
      let recent: AILogEntry[] = [];
      
      try {
        const content = await fs.readFile(recentFile, 'utf-8');
        recent = JSON.parse(content);
      } catch {
        // File doesn't exist yet
      }

      // Add new entry and keep only last 100
      recent.push(entry);
      if (recent.length > 100) {
        recent = recent.slice(-100);
      }

      await fs.writeFile(recentFile, JSON.stringify(recent, null, 2));
    } catch (error) {
      // Non-critical error, don't throw
    }
  }

  async getRecentLogs(limit: number = 10): Promise<AILogEntry[]> {
    try {
      const recentFile = path.join(this.logDir, 'recent.json');
      const content = await fs.readFile(recentFile, 'utf-8');
      const logs = JSON.parse(content);
      return logs.slice(-limit);
    } catch {
      return [];
    }
  }

  async getSessionLogs(sessionId?: string): Promise<AILogEntry[]> {
    const sid = sessionId || this.currentSessionId;
    const sessionFile = path.join(this.logDir, 'sessions', `${sid}.jsonl`);
    
    try {
      const content = await fs.readFile(sessionFile, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      return lines.map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }

  async getDailyStats(date?: string): Promise<any> {
    let targetDate = date;
    if (!date) {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      const parts = formatter.formatToParts(now);
      const p: any = {};
      parts.forEach(part => {
        if (part.type !== 'literal') p[part.type] = part.value;
      });
      
      targetDate = `${p.year}-${p.month}-${p.day}`;
    }
    const logFile = path.join(this.logDir, `ai-requests-${targetDate}.jsonl`);
    
    try {
      const content = await fs.readFile(logFile, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const logs = lines.map(line => JSON.parse(line));
      
      const requests = logs.filter(l => l.type === 'request').length;
      const responses = logs.filter(l => l.type === 'response').length;
      const errors = logs.filter(l => l.type === 'error').length;
      const avgDuration = logs
        .filter(l => l.type === 'response' && l.duration)
        .reduce((sum, l) => sum + (l.duration || 0), 0) / (responses || 1);

      return {
        date: targetDate,
        totalRequests: requests,
        successfulResponses: responses,
        errors,
        successRate: requests > 0 ? ((responses / requests) * 100).toFixed(1) + '%' : 'N/A',
        avgResponseTime: Math.round(avgDuration) + 'ms'
      };
    } catch {
      return {
        date: targetDate,
        totalRequests: 0,
        successfulResponses: 0,
        errors: 0,
        successRate: 'N/A',
        avgResponseTime: 'N/A'
      };
    }
  }
}

// Singleton instance
let logger: AILogger | null = null;

export function getAILogger(): AILogger {
  if (!logger) {
    logger = new AILogger();
    logger.initialize().catch(console.error);
  }
  return logger;
}

// Convenience functions
export async function logAIRequest(prompt: string, metadata?: AILogEntry['metadata']): Promise<string> {
  return getAILogger().logRequest(prompt, metadata);
}

export async function logAIResponse(requestId: string, response: any, metadata?: AILogEntry['metadata']): Promise<void> {
  return getAILogger().logResponse(requestId, response, metadata);
}

export async function logAIError(requestId: string, error: Error | string, metadata?: AILogEntry['metadata']): Promise<void> {
  return getAILogger().logError(requestId, error, metadata);
}