/**
 * Error Logging API
 * Receives client-side errors from ErrorBoundary and logs them
 * TODO: Integrate with Sentry, DataDog, or other monitoring service
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json();

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('===== CLIENT ERROR =====');
      console.error('Message:', errorData.error?.message);
      console.error('Stack:', errorData.error?.stack);
      console.error('Component Stack:', errorData.errorInfo?.componentStack);
      console.error('URL:', errorData.url);
      console.error('Timestamp:', errorData.timestamp);
      console.error('========================');
    }

    // In production, send to monitoring service
    // TODO: Integrate with Sentry
    // if (process.env.NODE_ENV === 'production') {
    //   await Sentry.captureException(errorData);
    // }

    // TODO: Store in database for analysis
    // await db.errors.create({
    //   data: {
    //     message: errorData.error?.message,
    //     stack: errorData.error?.stack,
    //     componentStack: errorData.errorInfo?.componentStack,
    //     url: errorData.url,
    //     userAgent: errorData.userAgent,
    //     timestamp: new Date(errorData.timestamp),
    //   },
    // });

    return NextResponse.json({
      success: true,
      message: 'Error logged successfully',
    });
  } catch (err) {
    console.error('Failed to log error:', err);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to log error',
      },
      { status: 500 }
    );
  }
}
