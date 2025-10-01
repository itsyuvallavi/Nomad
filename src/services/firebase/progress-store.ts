import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './auth';
import { logger } from '@/lib/monitoring/logger';

/**
 * Firebase Firestore-based progress storage for AI generation
 * Replaces in-memory storage to persist data across server restarts
 */

const COLLECTION_NAME = 'ai_generation_progress';
const EXPIRY_HOURS = 24; // Auto-cleanup after 24 hours

export interface ProgressData {
  type: 'processing' | 'complete' | 'error' | 'question' | 'confirmation';
  status: string;
  progress: number;
  message: string;
  awaitingInput?: string;
  hasItinerary?: boolean;
  intent?: any;
  missingFields?: string[];
  mode?: string;
  metadata?: any;
  city?: string;
  cityData?: any;
  allCities?: any[];
  itinerary?: any;
  conversationContext?: any;
  error?: boolean;
  stack?: string;
  createdAt?: any;
  updatedAt?: any;
  expiresAt?: any;
}

class ProgressStore {
  private memoryCache: Map<string, ProgressData>;

  constructor() {
    // Keep a memory cache for fast reads during active sessions
    this.memoryCache = new Map();
  }

  /**
   * Set progress data in Firestore and memory cache
   */
  async set(generationId: string, data: ProgressData): Promise<void> {
    try {
      const now = serverTimestamp();
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + EXPIRY_HOURS);

      const progressData = {
        ...data,
        updatedAt: now,
        createdAt: data.createdAt || now,
        expiresAt: Timestamp.fromDate(expiryTime)
      };

      // Update memory cache immediately for fast reads
      this.memoryCache.set(generationId, progressData);

      // Persist to Firestore
      const docRef = doc(collection(db, COLLECTION_NAME), generationId);
      await setDoc(docRef, progressData, { merge: true });

      logger.info('ProgressStore', `Saved progress for ${generationId}`, {
        type: data.type,
        status: data.status,
        progress: data.progress
      });

      // Clean up memory cache for completed/errored items after 5 minutes
      if (data.type === 'complete' || data.type === 'error') {
        setTimeout(() => {
          this.memoryCache.delete(generationId);
        }, 5 * 60 * 1000);
      }
    } catch (error) {
      logger.error('ProgressStore', `Failed to save progress for ${generationId}`, error);
      // Still update memory cache even if Firestore fails
      this.memoryCache.set(generationId, data);
    }
  }

  /**
   * Get progress data from memory cache or Firestore
   */
  async get(generationId: string): Promise<ProgressData | null> {
    try {
      // Check memory cache first
      if (this.memoryCache.has(generationId)) {
        return this.memoryCache.get(generationId) || null;
      }

      // Fallback to Firestore
      const docRef = doc(collection(db, COLLECTION_NAME), generationId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as ProgressData;

        // Check if expired
        if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
          await this.delete(generationId);
          return null;
        }

        // Update memory cache
        this.memoryCache.set(generationId, data);
        return data;
      }

      return null;
    } catch (error) {
      logger.error('ProgressStore', `Failed to get progress for ${generationId}`, error);
      // Return from memory cache if Firestore fails
      return this.memoryCache.get(generationId) || null;
    }
  }

  /**
   * Delete progress data from both Firestore and memory cache
   */
  async delete(generationId: string): Promise<void> {
    try {
      this.memoryCache.delete(generationId);
      const docRef = doc(collection(db, COLLECTION_NAME), generationId);
      await deleteDoc(docRef);
      logger.info('ProgressStore', `Deleted progress for ${generationId}`);
    } catch (error) {
      logger.error('ProgressStore', `Failed to delete progress for ${generationId}`, error);
    }
  }

  /**
   * Check if a generation exists
   */
  async has(generationId: string): Promise<boolean> {
    if (this.memoryCache.has(generationId)) {
      return true;
    }

    const data = await this.get(generationId);
    return data !== null;
  }

  /**
   * Clean up expired entries (can be called periodically)
   */
  async cleanupExpired(): Promise<void> {
    // This would ideally be a Firebase Function or scheduled task
    // For now, it's called opportunistically
    logger.info('ProgressStore', 'Cleanup expired entries - would run in production via Firebase Functions');
  }
}

// Export singleton instance
export const progressStore = new ProgressStore();