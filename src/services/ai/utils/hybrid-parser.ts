export interface ClassificationResult {
  type: 'query' | 'feedback' | 'command';
  confidence: number;
  intent?: string;
}

export interface ParseResult {
  classification: ClassificationResult;
  entities: Record<string, any>;
  originalText: string;
}

export function classifyMessage(message: string): ClassificationResult {
  return {
    type: 'query',
    confidence: 1.0
  };
}

export function parseMessage(message: string): ParseResult {
  return {
    classification: classifyMessage(message),
    entities: {},
    originalText: message
  };
}