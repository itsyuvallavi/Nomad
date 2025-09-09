/**
 * Neural Travel Parser
 * Uses TensorFlow.js for ML-based parsing
 */

import * as tf from '@tensorflow/tfjs-node';
import { ParsedTravelRequest } from './master-parser';
import { enhancedLogger } from './enhanced-logger';

export interface NeuralParseResult {
  destinations: string[];
  origin?: string;
  duration?: number;
  travelers?: number;
  budget?: number;
  tripType?: string;
  confidence: number;
  rawPredictions: number[];
}

export interface TrainingExample {
  input: string;
  labels: {
    hasOrigin: boolean;
    hasDestination: boolean;
    hasDuration: boolean;
    hasBudget: boolean;
    travelers: number;
    tripType: string;
  };
}

// Vocabulary for tokenization
const VOCAB: { [key: string]: number } = {
  '<PAD>': 0,
  '<UNK>': 1,
  '<START>': 2,
  '<END>': 3,
  // Common travel words
  'trip': 4, 'travel': 5, 'visit': 6, 'go': 7, 'fly': 8,
  'days': 9, 'week': 10, 'weeks': 11, 'month': 12,
  'from': 13, 'to': 14, 'in': 15, 'at': 16, 'for': 17,
  'budget': 18, 'cheap': 19, 'luxury': 20, 'affordable': 21,
  'solo': 22, 'couple': 23, 'family': 24, 'group': 25,
  'honeymoon': 26, 'business': 27, 'vacation': 28, 'holiday': 29,
  // Numbers
  '1': 30, '2': 31, '3': 32, '4': 33, '5': 34,
  '6': 35, '7': 36, '8': 37, '9': 38, '10': 39,
  // Common destinations
  'paris': 40, 'london': 41, 'tokyo': 42, 'new': 43, 'york': 44,
  'bali': 45, 'thailand': 46, 'rome': 47, 'barcelona': 48,
  'dubai': 49, 'singapore': 50, 'amsterdam': 51,
};

const VOCAB_SIZE = Object.keys(VOCAB).length;
const MAX_SEQUENCE_LENGTH = 50;
const EMBEDDING_DIM = 64;
const LSTM_UNITS = 128;

export class NeuralTravelParser {
  private model: tf.LayersModel | null = null;
  private isInitialized = false;

  /**
   * Initialize the neural parser
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Try to load existing model
      const modelPath = 'file://./models/travel-parser/model.json';
      try {
        this.model = await tf.loadLayersModel(modelPath);
        enhancedLogger.info('NEURAL', 'Loaded existing model');
      } catch (e) {
        // Model doesn't exist, create new one
        this.model = this.createModel();
        enhancedLogger.info('NEURAL', 'Created new model');
      }

      this.isInitialized = true;
    } catch (error: any) {
      enhancedLogger.error('NEURAL', 'Failed to initialize', error);
      throw error;
    }
  }

  /**
   * Create the neural network model
   */
  private createModel(): tf.LayersModel {
    const model = tf.sequential();

    // Embedding layer
    model.add(tf.layers.embedding({
      inputDim: VOCAB_SIZE,
      outputDim: EMBEDDING_DIM,
      inputLength: MAX_SEQUENCE_LENGTH,
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

    // Global max pooling
    model.add(tf.layers.globalMaxPooling1d());

    // Dense layers
    model.add(tf.layers.dense({
      units: 256,
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }),
    }));

    model.add(tf.layers.dropout({ rate: 0.5 }));

    model.add(tf.layers.dense({
      units: 128,
      activation: 'relu',
    }));

    // Output layer - multiple outputs
    // [hasOrigin, hasDestination, hasDuration, hasBudget, travelerCount, tripTypeIndex]
    model.add(tf.layers.dense({
      units: 10,
      activation: 'sigmoid',
    }));

    // Compile the model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  /**
   * Tokenize input text
   */
  private tokenize(text: string): number[] {
    const tokens: number[] = [VOCAB['<START>']];
    
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (tokens.length >= MAX_SEQUENCE_LENGTH - 1) break;
      
      const token = VOCAB[word] || VOCAB['<UNK>'];
      tokens.push(token);
    }
    
    tokens.push(VOCAB['<END>']);
    
    // Pad or truncate to MAX_SEQUENCE_LENGTH
    while (tokens.length < MAX_SEQUENCE_LENGTH) {
      tokens.push(VOCAB['<PAD>']);
    }
    
    return tokens.slice(0, MAX_SEQUENCE_LENGTH);
  }

  /**
   * Parse input using neural network
   */
  async parseWithNN(input: string): Promise<NeuralParseResult> {
    if (!this.isInitialized || !this.model) {
      await this.initialize();
    }

    try {
      // Tokenize input
      const tokens = this.tokenize(input);
      const inputTensor = tf.tensor2d([tokens], [1, MAX_SEQUENCE_LENGTH]);

      // Make prediction
      const prediction = this.model!.predict(inputTensor) as tf.Tensor;
      const predictionArray = await prediction.array() as number[][];
      const predictions = predictionArray[0];

      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();

      // Interpret predictions
      const result = this.interpretPredictions(input, predictions);
      
      enhancedLogger.info('NEURAL', 'Neural parse complete', {
        confidence: result.confidence,
        destinationCount: result.destinations.length
      });

      return result;
    } catch (error: any) {
      enhancedLogger.error('NEURAL', 'Neural parsing failed', error);
      throw error;
    }
  }

  /**
   * Interpret neural network predictions
   */
  private interpretPredictions(input: string, predictions: number[]): NeuralParseResult {
    const result: NeuralParseResult = {
      destinations: [],
      confidence: 0,
      rawPredictions: predictions,
    };

    // Threshold for binary predictions
    const threshold = 0.5;

    // Parse predictions
    const hasOrigin = predictions[0] > threshold;
    const hasDestination = predictions[1] > threshold;
    const hasDuration = predictions[2] > threshold;
    const hasBudget = predictions[3] > threshold;
    
    // Traveler count (scaled from 0-1 to 1-10)
    const travelersPred = predictions[4];
    result.travelers = Math.max(1, Math.round(travelersPred * 10));

    // Trip type (index of highest probability)
    const tripTypes = ['general', 'business', 'honeymoon', 'family', 'adventure'];
    const tripTypeIndex = Math.floor(predictions[5] * tripTypes.length);
    result.tripType = tripTypes[Math.min(tripTypeIndex, tripTypes.length - 1)];

    // Extract entities using pattern matching as fallback
    if (hasDestination) {
      result.destinations = this.extractDestinations(input);
    }

    if (hasOrigin) {
      result.origin = this.extractOrigin(input);
    }

    if (hasDuration) {
      result.duration = this.extractDuration(input);
    }

    if (hasBudget) {
      result.budget = this.extractBudget(input);
    }

    // Calculate overall confidence
    const avgConfidence = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    result.confidence = Math.min(0.95, Math.max(0.1, avgConfidence));

    return result;
  }

  /**
   * Extract destinations using patterns (fallback)
   */
  private extractDestinations(input: string): string[] {
    const destinations: string[] = [];
    const knownDestinations = [
      'Paris', 'London', 'Tokyo', 'New York', 'Bali', 'Thailand',
      'Rome', 'Barcelona', 'Dubai', 'Singapore', 'Amsterdam'
    ];

    for (const dest of knownDestinations) {
      if (input.toLowerCase().includes(dest.toLowerCase())) {
        destinations.push(dest);
      }
    }

    return destinations;
  }

  /**
   * Extract origin using patterns (fallback)
   */
  private extractOrigin(input: string): string | undefined {
    const match = input.match(/from\s+([A-Z][a-zA-Z\s]+?)(?:\s|,|$)/i);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Extract duration using patterns (fallback)
   */
  private extractDuration(input: string): number | undefined {
    const patterns = [
      /(\d+)\s*days?/i,
      /(\d+)\s*weeks?/i,
      /(\d+)\s*months?/i,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        if (pattern.source.includes('week')) return value * 7;
        if (pattern.source.includes('month')) return value * 30;
        return value;
      }
    }

    return undefined;
  }

  /**
   * Extract budget using patterns (fallback)
   */
  private extractBudget(input: string): number | undefined {
    const match = input.match(/\$\s?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
    return undefined;
  }

  /**
   * Train the model on new examples
   */
  async trainOnline(examples: TrainingExample[], epochs: number = 10): Promise<void> {
    if (!this.model) {
      await this.initialize();
    }

    try {
      // Prepare training data
      const inputs: number[][] = [];
      const outputs: number[][] = [];

      for (const example of examples) {
        const tokens = this.tokenize(example.input);
        inputs.push(tokens);

        // Create output vector
        const output = [
          example.labels.hasOrigin ? 1 : 0,
          example.labels.hasDestination ? 1 : 0,
          example.labels.hasDuration ? 1 : 0,
          example.labels.hasBudget ? 1 : 0,
          example.labels.travelers / 10, // Normalize to 0-1
          this.tripTypeToIndex(example.labels.tripType) / 5, // Normalize
          0, 0, 0, 0 // Padding to match output size
        ];
        outputs.push(output);
      }

      const xTrain = tf.tensor2d(inputs);
      const yTrain = tf.tensor2d(outputs);

      // Train the model
      const history = await this.model!.fit(xTrain, yTrain, {
        epochs,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            enhancedLogger.info('NEURAL', `Training epoch ${epoch + 1}`, logs);
          }
        }
      });

      // Clean up tensors
      xTrain.dispose();
      yTrain.dispose();

      enhancedLogger.info('NEURAL', 'Online training complete', {
        epochs,
        finalLoss: history.history.loss[history.history.loss.length - 1]
      });

    } catch (error: any) {
      enhancedLogger.error('NEURAL', 'Training failed', error);
      throw error;
    }
  }

  /**
   * Convert trip type to index
   */
  private tripTypeToIndex(tripType: string): number {
    const types = ['general', 'business', 'honeymoon', 'family', 'adventure'];
    const index = types.indexOf(tripType.toLowerCase());
    return index >= 0 ? index : 0;
  }

  /**
   * Save the model
   */
  async saveModel(path: string = 'file://./models/travel-parser'): Promise<void> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    try {
      await this.model.save(path);
      enhancedLogger.info('NEURAL', 'Model saved', { path });
    } catch (error: any) {
      enhancedLogger.error('NEURAL', 'Failed to save model', error);
      throw error;
    }
  }

  /**
   * Get model summary
   */
  getModelSummary(): string {
    if (!this.model) {
      return 'Model not initialized';
    }

    let summary = '';
    this.model.summary(undefined, undefined, (line: string) => {
      summary += line + '\n';
    });
    return summary;
  }
}