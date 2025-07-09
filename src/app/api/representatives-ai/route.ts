import { NextRequest, NextResponse } from 'next/server';
import { getRepresentativesWithAI, updateRepresentativesWithAI, generateRepresentativeSummary } from '@/lib/openai-representatives';

export async function POST(request: NextRequest) {
  try {
    const { location } = await request.json();

    if (!location) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      );
    }

    console.log('Processing AI representatives request for location:', location);

    // Use OpenAI to analyze location and fetch current representatives
    const result = await updateRepresentativesWithAI(location);

    if (!result.success) {
      console.error('Failed to fetch representatives:', result.error);
      
      // Return a proper error response with more details
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Failed to fetch representatives',
          representatives: [],
          count: 0
        },
        { status: 200 } // Changed from 404 to 200 since this is not a "not found" error
      );
    }

    // If we have representatives, generate summaries
    if (result.representatives.length > 0) {
      console.log('Generating summaries for', result.representatives.length, 'representatives');
      
      // Generate summaries for each representative on the server side
      const representativesWithSummaries = await Promise.all(
        result.representatives.map(async (rep) => {
          try {
            const summary = await generateRepresentativeSummary(rep);
            return { ...rep, summary };
          } catch (error) {
            console.error('Error generating summary for', rep.first_name, rep.last_name, error);
            return { ...rep, summary: '' };
          }
        })
      );

      console.log('Successfully processed', representativesWithSummaries.length, 'representatives');

      return NextResponse.json({
        success: true,
        representatives: representativesWithSummaries,
        count: representativesWithSummaries.length
      });
    } else {
      // No representatives found, but this is not an error - return empty success response
      console.log('No representatives found for location:', location);
      
      return NextResponse.json({
        success: true,
        representatives: [],
        count: 0,
        message: 'No representatives found for the specified location. Please check the location and try again.'
      });
    }

  } catch (error) {
    console.error('Error in representatives-ai API:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        representatives: [],
        count: 0
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const location = searchParams.get('location');

  if (!location) {
    return NextResponse.json(
      { error: 'Location parameter is required' },
      { status: 400 }
    );
  }

  try {
    console.log('Processing AI representatives GET request for location:', location);

    // Use OpenAI to get representatives
    const representatives = await getRepresentativesWithAI(location);

    if (representatives.length === 0) {
      return NextResponse.json({
        success: true,
        representatives: [],
        count: 0,
        message: 'No representatives found for the specified location. Please check the location and try again.'
      });
    }

    // Generate summaries for each representative on the server side
    const representativesWithSummaries = await Promise.all(
      representatives.map(async (rep) => {
        try {
          const summary = await generateRepresentativeSummary(rep);
          return { ...rep, summary };
        } catch (error) {
          console.error('Error generating summary for', rep.first_name, rep.last_name, error);
          return { ...rep, summary: '' };
        }
      })
    );

    return NextResponse.json({
      success: true,
      representatives: representativesWithSummaries,
      count: representativesWithSummaries.length
    });

  } catch (error) {
    console.error('Error in representatives-ai GET API:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        representatives: [],
        count: 0
      },
      { status: 500 }
    );
  }
} 