import { NextResponse } from 'next/server';
import { 
  seedContactMessageTemplates, 
  seedRepresentativesData, 
  checkIfDataSeeded 
} from '@/lib/representatives';

export async function POST() {
  try {
    // Check if data is already seeded
    const isSeeded = await checkIfDataSeeded();
    
    if (isSeeded) {
      return NextResponse.json({ 
        message: 'Representatives data already seeded',
        seeded: false 
      });
    }

    // Seed the data
    await Promise.all([
      seedContactMessageTemplates(),
      seedRepresentativesData()
    ]);

    return NextResponse.json({ 
      message: 'Representatives data seeded successfully',
      seeded: true 
    });
  } catch (error) {
    console.error('Error seeding representatives data:', error);
    return NextResponse.json(
      { error: 'Failed to seed representatives data' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const isSeeded = await checkIfDataSeeded();
    
    return NextResponse.json({ 
      seeded: isSeeded,
      message: isSeeded ? 'Data is already seeded' : 'Data needs to be seeded'
    });
  } catch (error) {
    console.error('Error checking seeded data:', error);
    return NextResponse.json(
      { error: 'Failed to check seeded data' },
      { status: 500 }
    );
  }
} 