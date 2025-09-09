/**
 * Sequence Model for Context Understanding
 * LSTM-based model for conversation flow analysis
 */

import * as tf from '@tensorflow/tfjs-node';
import { enhancedLogger } from './enhanced-logger';

export interface ContextVector {
  vector: Float32Array;
  attention: Float32Array;
  confidence: number;
}

export interface Pattern {
  sequence: string[];
  frequency: number;
  nextLikely: string[];
}

const MAX_SEQUENCE_LENGTH = 10;
const EMBEDDING_DIM = 128;
const LSTM_UNITS = 64;

export class ContextSequenceModel {
  private lstmModel: tf.LayersModel | null = null;
  private attentionModel: tf.LayersModel | null = null;
  private isInitialized = false;
  private vocabulary: Map<string, number> = new Map();
  private reverseVocab: Map<number, string> = new Map();

  /**
   * Initialize the sequence model
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.buildVocabulary();
      this.lstmModel = this.createLSTMModel();
      this.attentionModel = this.createAttentionModel();
      
      this.isInitialized = true;
      enhancedLogger.info('SEQUENCE', 'Sequence models initialized');
    } catch (error: any) {
      enhancedLogger.error('SEQUENCE', 'Failed to initialize', error);
      throw error;
    }
  }

  /**
   * Build vocabulary for conversation modeling
   */
  private buildVocabulary(): void {
    const commonWords = [
      '<PAD>', '<UNK>', '<START>', '<END>',
      // Question words
      'where', 'when', 'what', 'how', 'why', 'which',
      // Travel words
      'travel', 'trip', 'visit', 'go', 'fly', 'stay',
      'destination', 'origin', 'from', 'to', 'in', 'at',
      // Time words
      'days', 'weeks', 'month', 'year', 'next', 'this',
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
      // Intent words
      'want', 'need', 'like', 'prefer', 'looking', 'planning',
      'interested', 'thinking', 'considering',
      // Common destinations
      'paris', 'london', 'tokyo', 'new', 'york', 'bali',
      'thailand', 'rome', 'barcelona', 'dubai',
      // Other
      'budget', 'cheap', 'luxury', 'family', 'solo', 'couple',
      'yes', 'no', 'maybe', 'thanks', 'please', 'help'
    ];

    commonWords.forEach((word, index) => {
      this.vocabulary.set(word, index);
      this.reverseVocab.set(index, word);
    });
  }

  /**
   * Create LSTM model for sequence processing
   */
  private createLSTMModel(): tf.LayersModel {
    const model = tf.sequential();

    // Embedding layer
    model.add(tf.layers.embedding({
      inputDim: this.vocabulary.size,
      outputDim: EMBEDDING_DIM,
      inputLength: MAX_SEQUENCE_LENGTH,
      maskZero: true,
    }));

    // Bidirectional LSTM
    model.add(tf.layers.bidirectional({
      layer: tf.layers.lstm({
        units: LSTM_UNITS,
        returnSequences: true,
        dropout: 0.2,
        recurrentDropout: 0.2,
      }) as tf.layers.RNN,
    }));

    // Another LSTM layer
    model.add(tf.layers.lstm({
      units: LSTM_UNITS,
      returnSequences: false,
      dropout: 0.2,
    }));

    // Dense layer for context vector
    model.add(tf.layers.dense({
      units: 256,
      activation: 'relu',
    }));

    model.add(tf.layers.dropout({ rate: 0.3 }));

    // Output context vector
    model.add(tf.layers.dense({
      units: 128,
      activation: 'tanh',
    }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
    });

    return model;
  }

  /**
   * Create attention model
   */
  private createAttentionModel(): tf.LayersModel {
    const input = tf.input({ shape: [MAX_SEQUENCE_LENGTH, LSTM_UNITS * 2] });
    
    // Attention weights
    const attention = tf.layers.dense({
      units: 1,
      activation: 'tanh',
    }).apply(input) as tf.SymbolicTensor;
    
    const attentionWeights = tf.layers.softmax({
      axis: 1,
    }).apply(attention) as tf.SymbolicTensor;
    
    // Weighted sum
    const weighted = tf.layers.multiply().apply([
      input,
      attentionWeights
    ]) as tf.SymbolicTensor;
    
    const output = tf.layers.globalAveragePooling1d().apply(weighted) as tf.SymbolicTensor;
    
    const model = tf.model({
      inputs: input,
      outputs: [output, attentionWeights],
    });

    return model;
  }

  /**
   * Process conversation sequence
   */
  async processSequence(messages: string[]): Promise<ContextVector> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Tokenize messages
      const sequences = messages.map(msg => this.tokenizeMessage(msg));
      
      // Pad sequences
      const padded = this.padSequences(sequences);
      
      // Convert to tensor
      const inputTensor = tf.tensor2d(padded);
      
      // Process through LSTM
      const contextTensor = this.lstmModel!.predict(inputTensor) as tf.Tensor;
      const contextArray = await contextTensor.array() as number[][];
      
      // Calculate attention (simplified)
      const attention = this.calculateAttention(messages);
      
      // Clean up
      inputTensor.dispose();
      contextTensor.dispose();
      
      const result: ContextVector = {
        vector: new Float32Array(contextArray[contextArray.length - 1]),
        attention: new Float32Array(attention),
        confidence: this.calculateConfidence(messages),
      };

      enhancedLogger.info('SEQUENCE', 'Processed conversation sequence', {
        messageCount: messages.length,
        confidence: result.confidence
      });

      return result;
    } catch (error: any) {
      enhancedLogger.error('SEQUENCE', 'Failed to process sequence', error);
      throw error;
    }
  }

  /**
   * Tokenize a message
   */
  private tokenizeMessage(message: string): number[] {
    const tokens: number[] = [this.vocabulary.get('<START>') || 0];
    
    const words = message.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (tokens.length >= MAX_SEQUENCE_LENGTH - 1) break;
      
      const token = this.vocabulary.get(word) || this.vocabulary.get('<UNK>')!;
      tokens.push(token);
    }
    
    tokens.push(this.vocabulary.get('<END>') || 0);
    
    return tokens;
  }

  /**
   * Pad sequences to same length
   */
  private padSequences(sequences: number[][]): number[][] {
    const padded: number[][] = [];
    
    for (const seq of sequences) {
      const paddedSeq = [...seq];
      while (paddedSeq.length < MAX_SEQUENCE_LENGTH) {
        paddedSeq.push(this.vocabulary.get('<PAD>') || 0);
      }
      padded.push(paddedSeq.slice(0, MAX_SEQUENCE_LENGTH));
    }
    
    return padded;
  }

  /**
   * Calculate attention weights
   */
  private calculateAttention(messages: string[]): number[] {
    // Simple attention based on recency and keywords
    const attention: number[] = [];
    const importantWords = ['where', 'when', 'budget', 'from', 'to', 'days', 'want', 'need'];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i].toLowerCase();
      let score = 0.5;
      
      // Recency bias
      score += (i / messages.length) * 0.3;
      
      // Keyword bias
      for (const word of importantWords) {
        if (message.includes(word)) {
          score += 0.1;
        }
      }
      
      attention.push(Math.min(1.0, score));
    }
    
    // Normalize
    const sum = attention.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < attention.length; i++) {
        attention[i] /= sum;
      }
    }
    
    return attention;
  }

  /**
   * Calculate confidence based on sequence
   */
  private calculateConfidence(messages: string[]): number {
    if (messages.length === 0) return 0;
    
    let confidence = 0.5;
    
    // More messages = more context
    confidence += Math.min(0.3, messages.length * 0.05);
    
    // Check for complete information
    const hasDestination = messages.some(m => 
      m.match(/\b(paris|london|tokyo|bali|rome)\b/i)
    );
    const hasDates = messages.some(m => 
      m.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|next|week|month)\b/i)
    );
    const hasOrigin = messages.some(m => m.includes('from'));
    
    if (hasDestination) confidence += 0.1;
    if (hasDates) confidence += 0.05;
    if (hasOrigin) confidence += 0.05;
    
    return Math.min(0.95, confidence);
  }

  /**
   * Predict next likely query
   */
  async predictNext(history: string[]): Promise<string[]> {
    if (history.length === 0) {
      return [
        'Where would you like to go?',
        'When are you planning to travel?',
        'What\'s your budget for this trip?'
      ];
    }

    const predictions: string[] = [];
    
    // Analyze what's missing
    const hasDestination = history.some(h => 
      h.match(/\b(paris|london|tokyo|bali|rome)\b/i)
    );
    const hasDates = history.some(h => 
      h.match(/\b(january|february|march|april|may|june)\b/i)
    );
    const hasDuration = history.some(h => 
      h.match(/\b\d+\s*(days?|weeks?)\b/i)
    );
    const hasOrigin = history.some(h => h.includes('from'));
    const hasBudget = history.some(h => h.includes('$'));
    
    if (!hasDestination) {
      predictions.push('Which destination are you interested in?');
    }
    if (!hasDates) {
      predictions.push('When would you like to travel?');
    }
    if (!hasDuration) {
      predictions.push('How many days will you be traveling?');
    }
    if (!hasOrigin) {
      predictions.push('Where will you be departing from?');
    }
    if (!hasBudget) {
      predictions.push('What\'s your budget for this trip?');
    }
    
    // If all basic info is present, suggest refinements
    if (predictions.length === 0) {
      predictions.push(
        'Would you like to add any specific activities?',
        'Do you have any dietary restrictions?',
        'Are you interested in cultural experiences?'
      );
    }

    enhancedLogger.info('SEQUENCE', 'Predicted next queries', {
      historyLength: history.length,
      predictionsCount: predictions.length
    });

    return predictions.slice(0, 3);
  }

  /**
   * Extract temporal patterns from sequences
   */
  async extractPatterns(sequences: string[][]): Promise<Pattern[]> {
    const patterns: Map<string, Pattern> = new Map();
    
    for (const sequence of sequences) {
      for (let i = 0; i < sequence.length - 1; i++) {
        const pattern = sequence.slice(i, i + 2).join(' -> ');
        const next = sequence[i + 2] || '<END>';
        
        if (!patterns.has(pattern)) {
          patterns.set(pattern, {
            sequence: sequence.slice(i, i + 2),
            frequency: 0,
            nextLikely: []
          });
        }
        
        const p = patterns.get(pattern)!;
        p.frequency++;
        if (!p.nextLikely.includes(next)) {
          p.nextLikely.push(next);
        }
      }
    }
    
    // Sort by frequency
    const sortedPatterns = Array.from(patterns.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    enhancedLogger.info('SEQUENCE', 'Extracted patterns', {
      totalPatterns: patterns.size,
      topPatterns: sortedPatterns.length
    });

    return sortedPatterns;
  }

  /**
   * Generate context-aware response
   */
  async generateContextualResponse(
    context: ContextVector,
    query: string
  ): Promise<{
    response: string;
    confidence: number;
  }> {
    // Simple template-based response generation
    const templates = [
      'Based on our conversation, I understand you want to {intent}.',
      'From what you\'ve told me, you\'re looking for {feature}.',
      'Let me help you with {next_step}.',
    ];

    const response = templates[0].replace('{intent}', 'plan a trip');
    
    return {
      response,
      confidence: context.confidence
    };
  }

  /**
   * Save model
   */
  async saveModel(path: string = 'file://./models/sequence-model'): Promise<void> {
    if (!this.lstmModel) {
      throw new Error('Model not initialized');
    }

    try {
      await this.lstmModel.save(path);
      enhancedLogger.info('SEQUENCE', 'Model saved', { path });
    } catch (error: any) {
      enhancedLogger.error('SEQUENCE', 'Failed to save model', error);
      throw error;
    }
  }
}