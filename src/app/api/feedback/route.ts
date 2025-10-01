import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface FeedbackData {
  session_id: string;
  prompt_hash?: string;
  item_type: 'itinerary' | 'day' | 'activity';
  item_id?: string;
  action: 'thumbs_up' | 'thumbs_down' | 'edit' | 'regenerate';
  payload?: any;
  model_info?: {
    model: string;
    temperature?: number;
    strategy?: string;
  };
  timestamp?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: FeedbackData = await req.json();
    
    // Add timestamp if not provided
    if (!body.timestamp) {
      body.timestamp = new Date().toISOString();
    }
    
    // Validate required fields
    if (!body.session_id || !body.item_type || !body.action) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, item_type, action' },
        { status: 400 }
      );
    }
    
    // Create feedback directory if it doesn't exist
    const feedbackDir = path.join(process.cwd(), 'data', 'learned');
    await fs.mkdir(feedbackDir, { recursive: true });
    
    // Append to feedback log file (JSONL format for easy processing)
    const feedbackFile = path.join(feedbackDir, 'feedback.jsonl');
    const feedbackLine = JSON.stringify(body) + '\n';
    
    await fs.appendFile(feedbackFile, feedbackLine);
    
    // Log feedback for monitoring
    console.log('[Feedback] Received:', {
      session_id: body.session_id,
      action: body.action,
      item_type: body.item_type
    });
    
    return NextResponse.json({ 
      ok: true,
      message: 'Feedback recorded successfully'
    });
    
  } catch (error) {
    console.error('[Feedback] Error recording feedback:', error);
    return NextResponse.json(
      { error: 'Failed to record feedback' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Optional: Add authentication here
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const sessionId = searchParams.get('session_id');
    
    const feedbackFile = path.join(process.cwd(), 'data', 'learned', 'feedback.jsonl');
    
    // Check if file exists
    try {
      await fs.access(feedbackFile);
    } catch {
      return NextResponse.json({ feedbacks: [] });
    }
    
    // Read and parse feedback
    const content = await fs.readFile(feedbackFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    
    let feedbacks = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
    
    // Filter by session if provided
    if (sessionId) {
      feedbacks = feedbacks.filter(f => f.session_id === sessionId);
    }
    
    // Limit results
    feedbacks = feedbacks.slice(-limit);
    
    return NextResponse.json({ 
      feedbacks,
      total: feedbacks.length
    });
    
  } catch (error) {
    console.error('[Feedback] Error retrieving feedback:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve feedback' },
      { status: 500 }
    );
  }
}