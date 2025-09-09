/**
 * Embeddings Service
 * Semantic similarity using Universal Sentence Encoder
 */

import * as tf from '@tensorflow/tfjs-node';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { enhancedLogger } from './enhanced-logger';

export interface SimilarityResult {
  text: string;
  similarity: number;
  embedding?: Float32Array;
}

export interface DestinationCluster {
  centroid: string;
  members: string[];
  theme: string;
}

export class EmbeddingService {
  private model: use.UniversalSentenceEncoder | null = null;
  private embeddings: Map<string, Float32Array> = new Map();
  private isInitialized = false;

  // Pre-computed embeddings for common destinations
  private readonly DESTINATIONS = [
    { name: 'Paris', tags: ['romantic', 'culture', 'art', 'food'] },
    { name: 'London', tags: ['history', 'culture', 'shopping', 'theater'] },
    { name: 'Tokyo', tags: ['technology', 'culture', 'food', 'anime'] },
    { name: 'New York', tags: ['city', 'culture', 'shopping', 'broadway'] },
    { name: 'Bali', tags: ['beach', 'relaxation', 'nature', 'spiritual'] },
    { name: 'Bangkok', tags: ['food', 'temples', 'shopping', 'nightlife'] },
    { name: 'Rome', tags: ['history', 'art', 'food', 'architecture'] },
    { name: 'Barcelona', tags: ['beach', 'architecture', 'food', 'culture'] },
    { name: 'Dubai', tags: ['luxury', 'shopping', 'modern', 'desert'] },
    { name: 'Singapore', tags: ['food', 'modern', 'shopping', 'gardens'] },
    { name: 'Amsterdam', tags: ['canals', 'culture', 'liberal', 'bikes'] },
    { name: 'Sydney', tags: ['beach', 'nature', 'city', 'opera'] },
    { name: 'Istanbul', tags: ['history', 'culture', 'food', 'bazaars'] },
    { name: 'Lisbon', tags: ['affordable', 'food', 'culture', 'beaches'] },
    { name: 'Prague', tags: ['affordable', 'history', 'beer', 'architecture'] },
  ];

  /**
   * Initialize the embedding service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load Universal Sentence Encoder
      this.model = await use.load();
      enhancedLogger.info('EMBEDDINGS', 'Universal Sentence Encoder loaded');

      // Pre-compute embeddings for destinations
      await this.precomputeDestinations();

      this.isInitialized = true;
    } catch (error: any) {
      enhancedLogger.error('EMBEDDINGS', 'Failed to initialize', error);
      throw error;
    }
  }

  /**
   * Pre-compute embeddings for known destinations
   */
  private async precomputeDestinations(): Promise<void> {
    if (!this.model) return;

    const texts = this.DESTINATIONS.map(d => 
      `${d.name} ${d.tags.join(' ')}`
    );

    const embeddings = await this.model.embed(texts);
    const embeddingsArray = await embeddings.array();

    texts.forEach((text, i) => {
      this.embeddings.set(
        this.DESTINATIONS[i].name.toLowerCase(),
        new Float32Array(embeddingsArray[i])
      );
    });

    embeddings.dispose();

    enhancedLogger.info('EMBEDDINGS', 'Pre-computed destination embeddings', {
      count: this.DESTINATIONS.length
    });
  }

  /**
   * Generate embedding for text
   */
  async embed(text: string): Promise<Float32Array> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check cache
    const cached = this.embeddings.get(text.toLowerCase());
    if (cached) {
      return cached;
    }

    try {
      const embeddings = await this.model!.embed([text]);
      const embeddingArray = await embeddings.array();
      const embedding = new Float32Array(embeddingArray[0]);
      
      embeddings.dispose();

      // Cache the result
      this.embeddings.set(text.toLowerCase(), embedding);

      return embedding;
    } catch (error: any) {
      enhancedLogger.error('EMBEDDINGS', 'Failed to generate embedding', error);
      throw error;
    }
  }

  /**
   * Find semantically similar items
   */
  async findSimilar(
    query: string,
    candidates?: string[],
    threshold: number = 0.5,
    topK: number = 5
  ): Promise<SimilarityResult[]> {
    const queryEmbedding = await this.embed(query);
    
    // Use provided candidates or default destinations
    const searchCandidates = candidates || this.DESTINATIONS.map(d => d.name);
    
    const results: SimilarityResult[] = [];

    for (const candidate of searchCandidates) {
      const candidateEmbedding = await this.embed(candidate);
      const similarity = this.cosineSimilarity(queryEmbedding, candidateEmbedding);
      
      if (similarity >= threshold) {
        results.push({
          text: candidate,
          similarity,
          embedding: candidateEmbedding
        });
      }
    }

    // Sort by similarity and return top K
    results.sort((a, b) => b.similarity - a.similarity);
    
    enhancedLogger.info('EMBEDDINGS', 'Found similar items', {
      query,
      resultsCount: Math.min(topK, results.length)
    });

    return results.slice(0, topK);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Cluster destinations by similarity
   */
  async clusterDestinations(k: number = 5): Promise<DestinationCluster[]> {
    const destinations = this.DESTINATIONS.map(d => d.name);
    const embeddings: Float32Array[] = [];

    for (const dest of destinations) {
      const embedding = await this.embed(dest);
      embeddings.push(embedding);
    }

    // Simple k-means clustering
    const clusters = this.kMeansClustering(embeddings, destinations, k);
    
    // Assign themes to clusters
    const themedClusters: DestinationCluster[] = clusters.map(cluster => {
      const theme = this.identifyClusterTheme(cluster.members);
      return {
        ...cluster,
        theme
      };
    });

    enhancedLogger.info('EMBEDDINGS', 'Clustered destinations', {
      clusterCount: k,
      themes: themedClusters.map(c => c.theme)
    });

    return themedClusters;
  }

  /**
   * Simple k-means clustering
   */
  private kMeansClustering(
    embeddings: Float32Array[],
    labels: string[],
    k: number
  ): DestinationCluster[] {
    if (embeddings.length === 0 || k <= 0) {
      return [];
    }

    // Initialize centroids randomly
    const centroids: number[][] = [];
    const used = new Set<number>();
    
    while (centroids.length < k && centroids.length < embeddings.length) {
      const idx = Math.floor(Math.random() * embeddings.length);
      if (!used.has(idx)) {
        used.add(idx);
        centroids.push(Array.from(embeddings[idx]));
      }
    }

    // Iterate until convergence
    let assignments: number[] = new Array(embeddings.length).fill(0);
    let changed = true;
    let iterations = 0;
    const maxIterations = 100;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      // Assign points to nearest centroid
      for (let i = 0; i < embeddings.length; i++) {
        let minDist = Infinity;
        let bestCluster = 0;

        for (let j = 0; j < centroids.length; j++) {
          const dist = this.euclideanDistance(
            embeddings[i],
            new Float32Array(centroids[j])
          );
          if (dist < minDist) {
            minDist = dist;
            bestCluster = j;
          }
        }

        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster;
          changed = true;
        }
      }

      // Update centroids
      for (let j = 0; j < centroids.length; j++) {
        const clusterPoints = embeddings.filter((_, i) => assignments[i] === j);
        if (clusterPoints.length > 0) {
          const newCentroid = new Array(embeddings[0].length).fill(0);
          
          for (const point of clusterPoints) {
            for (let d = 0; d < point.length; d++) {
              newCentroid[d] += point[d];
            }
          }
          
          for (let d = 0; d < newCentroid.length; d++) {
            newCentroid[d] /= clusterPoints.length;
          }
          
          centroids[j] = newCentroid;
        }
      }
    }

    // Build clusters
    const clusters: DestinationCluster[] = [];
    
    for (let j = 0; j < centroids.length; j++) {
      const members = labels.filter((_, i) => assignments[i] === j);
      
      if (members.length > 0) {
        clusters.push({
          centroid: members[0], // Use first member as representative
          members,
          theme: ''
        });
      }
    }

    return clusters;
  }

  /**
   * Calculate Euclidean distance
   */
  private euclideanDistance(a: Float32Array, b: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Identify theme for a cluster
   */
  private identifyClusterTheme(members: string[]): string {
    const themes: { [key: string]: number } = {};

    for (const member of members) {
      const dest = this.DESTINATIONS.find(d => 
        d.name.toLowerCase() === member.toLowerCase()
      );
      
      if (dest) {
        for (const tag of dest.tags) {
          themes[tag] = (themes[tag] || 0) + 1;
        }
      }
    }

    // Find most common theme
    let maxCount = 0;
    let bestTheme = 'general';
    
    for (const [theme, count] of Object.entries(themes)) {
      if (count > maxCount) {
        maxCount = count;
        bestTheme = theme;
      }
    }

    return bestTheme;
  }

  /**
   * Get semantic similarity between two texts
   */
  async getSimilarity(text1: string, text2: string): Promise<number> {
    const embedding1 = await this.embed(text1);
    const embedding2 = await this.embed(text2);
    
    return this.cosineSimilarity(embedding1, embedding2);
  }

  /**
   * Find most relevant destination for a query
   */
  async findBestDestination(query: string): Promise<{
    destination: string;
    confidence: number;
    alternatives: string[];
  }> {
    const similar = await this.findSimilar(query, undefined, 0.3, 5);
    
    if (similar.length === 0) {
      return {
        destination: '',
        confidence: 0,
        alternatives: []
      };
    }

    const best = similar[0];
    const alternatives = similar.slice(1).map(s => s.text);

    enhancedLogger.info('EMBEDDINGS', 'Found best destination', {
      query,
      best: best.text,
      confidence: best.similarity
    });

    return {
      destination: best.text,
      confidence: best.similarity,
      alternatives
    };
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    // Keep pre-computed destination embeddings
    const destinationKeys = this.DESTINATIONS.map(d => d.name.toLowerCase());
    
    for (const key of this.embeddings.keys()) {
      if (!destinationKeys.includes(key)) {
        this.embeddings.delete(key);
      }
    }

    enhancedLogger.info('EMBEDDINGS', 'Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    destinations: number;
    custom: number;
  } {
    const destinationCount = this.DESTINATIONS.length;
    const totalSize = this.embeddings.size;
    
    return {
      size: totalSize,
      destinations: destinationCount,
      custom: totalSize - destinationCount
    };
  }
}