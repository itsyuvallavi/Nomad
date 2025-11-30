/**
 * Images API Route
 * Server-side endpoint for fetching destination images
 * Keeps API keys secure by handling requests server-side
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchUnsplashImages } from '@/services/api/media/unsplash';
import { logger } from '@/lib/monitoring/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const destination = searchParams.get('destination');
    const count = parseInt(searchParams.get('count') || '3');

    console.log('🖼️ [API/IMAGES] Request received:', {
      destination,
      count,
      hasApiKey: !!process.env.UNSPLASH_API_ACCESS_KEY,
      keyLength: process.env.UNSPLASH_API_ACCESS_KEY?.length || 0
    });

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination parameter is required' },
        { status: 400 }
      );
    }

    logger.info('API', `Fetching images for: ${destination}`);

    const images = await searchUnsplashImages(destination, count);

    console.log('🖼️ [API/IMAGES] Response:', {
      destination,
      imageCount: images.length,
      success: images.length > 0
    });

    return NextResponse.json({
      success: true,
      destination,
      images,
      count: images.length
    });

  } catch (error: any) {
    logger.error('API', 'Error in images route', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to fetch images', details: error.message },
      { status: 500 }
    );
  }
}
