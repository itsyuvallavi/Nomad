interface AILog {
  id: string;
  type: 'request' | 'response' | 'error';
  timestamp: string;
  prompt?: string;
  duration?: number;
  error?: string;
  metadata?: any;
}

export function getAILogger() {
  return {
    logs: [] as AILog[],
    getRecentLogs: (count: number = 100): AILog[] => [],
    clearLogs: () => {},
    getDailyStats: (date: Date) => Promise.resolve({
      totalRequests: 0,
      totalErrors: 0,
      averageDuration: 0
    })
  };
}