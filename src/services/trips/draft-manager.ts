/**
 * Draft Management System
 * Handles auto-saving and recovery of itinerary generation progress
 */

import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';
import { logger } from '@/lib/monitoring/logger';

export type DraftStage = 'initialized' | 'validating' | 'parsing' | 'generating' | 'enhancing' | 'finalizing' | 'complete' | 'error';

export interface DraftItinerary {
  id: string;
  timestamp: number;
  lastUpdated: number;
  stage: DraftStage;
  prompt: string;
  partialData?: Partial<GeneratePersonalizedItineraryOutput>;
  metadata?: {
    origin?: string;
    destinations?: string[];
    totalDays?: number;
    error?: string;
    retryCount?: number;
  };
}

const DRAFT_STORAGE_KEY = 'itinerary_drafts';
const MAX_DRAFTS = 5;
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export class DraftManager {
  private currentDraftId: string | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize a new draft
   */
  public startDraft(prompt: string): string {
    const draftId = `draft_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const draft: DraftItinerary = {
      id: draftId,
      timestamp: Date.now(),
      lastUpdated: Date.now(),
      stage: 'initialized',
      prompt
    };

    this.saveDraft(draft);
    this.currentDraftId = draftId;
    
    // Start auto-save interval
    this.startAutoSave();
    
    logger.info('DRAFT', 'New draft started', { id: draftId });
    return draftId;
  }

  /**
   * Update draft stage and data
   */
  public updateDraft(
    stage: DraftStage,
    partialData?: Partial<GeneratePersonalizedItineraryOutput>,
    metadata?: DraftItinerary['metadata']
  ): void {
    if (!this.currentDraftId) return;

    const draft = this.getDraft(this.currentDraftId);
    if (!draft) return;

    draft.stage = stage;
    draft.lastUpdated = Date.now();
    
    if (partialData) {
      draft.partialData = {
        ...draft.partialData,
        ...partialData
      };
    }

    if (metadata) {
      draft.metadata = {
        ...draft.metadata,
        ...metadata
      };
    }

    this.saveDraft(draft);
    logger.debug('DRAFT', 'Draft updated', { id: draft.id, stage });
  }

  /**
   * Save draft to localStorage
   */
  private saveDraft(draft: DraftItinerary): void {
    try {
      const drafts = this.getAllDrafts();
      const index = drafts.findIndex(d => d.id === draft.id);
      
      if (index >= 0) {
        drafts[index] = draft;
      } else {
        drafts.unshift(draft);
      }

      // Keep only recent drafts
      const recentDrafts = drafts
        .filter(d => Date.now() - d.timestamp < DRAFT_EXPIRY_MS)
        .slice(0, MAX_DRAFTS);

      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(recentDrafts));
    } catch (error) {
      logger.error('DRAFT', 'Failed to save draft', error);
    }
  }

  /**
   * Get a specific draft
   */
  public getDraft(id: string): DraftItinerary | null {
    const drafts = this.getAllDrafts();
    return drafts.find(d => d.id === id) || null;
  }

  /**
   * Get all drafts
   */
  public getAllDrafts(): DraftItinerary[] {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get recent incomplete drafts
   */
  public getIncompleteDrafts(): DraftItinerary[] {
    return this.getAllDrafts()
      .filter(d => d.stage !== 'complete' && d.stage !== 'error')
      .filter(d => Date.now() - d.lastUpdated < 60 * 60 * 1000); // Last hour
  }

  /**
   * Mark draft as complete
   */
  public completeDraft(data: GeneratePersonalizedItineraryOutput): void {
    if (!this.currentDraftId) return;

    this.updateDraft('complete', data);
    this.stopAutoSave();
    
    logger.info('DRAFT', 'Draft completed', { id: this.currentDraftId });
    this.currentDraftId = null;
  }

  /**
   * Mark draft as failed
   */
  public failDraft(error: string): void {
    if (!this.currentDraftId) return;

    this.updateDraft('error', undefined, { error });
    this.stopAutoSave();
    
    logger.error('DRAFT', 'Draft failed', { id: this.currentDraftId, error });
  }

  /**
   * Resume from a draft
   */
  public resumeDraft(id: string): DraftItinerary | null {
    const draft = this.getDraft(id);
    if (!draft) return null;

    this.currentDraftId = id;
    this.startAutoSave();
    
    logger.info('DRAFT', 'Draft resumed', { id, stage: draft.stage });
    return draft;
  }

  /**
   * Delete a draft
   */
  public deleteDraft(id: string): void {
    const drafts = this.getAllDrafts().filter(d => d.id !== id);
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    
    if (this.currentDraftId === id) {
      this.currentDraftId = null;
      this.stopAutoSave();
    }
    
    logger.info('DRAFT', 'Draft deleted', { id });
  }

  /**
   * Clear all drafts
   */
  public clearAllDrafts(): void {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    this.currentDraftId = null;
    this.stopAutoSave();
    
    logger.info('DRAFT', 'All drafts cleared');
  }

  /**
   * Start auto-save interval
   */
  private startAutoSave(): void {
    this.stopAutoSave();
    
    this.autoSaveInterval = setInterval(() => {
      if (this.currentDraftId) {
        const draft = this.getDraft(this.currentDraftId);
        if (draft) {
          draft.lastUpdated = Date.now();
          this.saveDraft(draft);
          logger.debug('DRAFT', 'Auto-saved', { id: this.currentDraftId });
        }
      }
    }, 5000); // Auto-save every 5 seconds
  }

  /**
   * Stop auto-save interval
   */
  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Clean up on unmount
   */
  public cleanup(): void {
    this.stopAutoSave();
  }
}

// Singleton instance
let draftManager: DraftManager | null = null;

export function getDraftManager(): DraftManager {
  if (!draftManager) {
    draftManager = new DraftManager();
  }
  return draftManager;
}