import { supabase } from './supabase';
import { Database } from '@/types/database';

export type Representative = Database['public']['Tables']['representatives']['Row'];
export type ContactMessage = Database['public']['Tables']['representative_contact_messages']['Row'];
export type UserRepresentativeContact = Database['public']['Tables']['user_representative_contacts']['Row'];

export interface PersonalizedMessage {
  subject: string;
  message: string;
  representative: Representative;
  contactMethod: 'email' | 'phone' | 'form';
}

/**
 * Get representatives by state and district
 */
export async function getRepresentativesByLocation(location: string): Promise<Representative[]> {
  // Parse location to extract state - handle multiple formats
  let stateAbbr = '';
  
  if (location.includes(',')) {
    const locationParts = location.split(',').map(part => part.trim());
    
    // Try to find state abbreviation or name in any part
    for (const part of locationParts) {
      const testAbbr = getStateAbbreviation(part);
      if (testAbbr.length === 2 && testAbbr !== part.toUpperCase()) {
        // Found a valid state name that maps to abbreviation
        stateAbbr = testAbbr;
        break;
      } else if (part.length === 2 && part.toUpperCase() === part) {
        // Found what looks like a state abbreviation
        stateAbbr = part.toUpperCase();
        break;
      }
    }
  } else {
    // Single word - could be state name or abbreviation
    stateAbbr = getStateAbbreviation(location.trim());
  }
  
  // Debug logging
  console.log('Location input:', location);
  console.log('Parsed state abbreviation:', stateAbbr);
  
  if (!stateAbbr) {
    console.error('Could not parse state from location:', location);
    return [];
  }
  
  try {
    const { data: representatives, error } = await supabase
      .from('representatives')
      .select('*')
      .eq('state', stateAbbr)
      .eq('in_office', true)
      .order('chamber', { ascending: true });
    
    console.log('Database query result:', { representatives, error, stateAbbr });
    
    if (error) {
      console.error('Error fetching representatives:', error);
      return [];
    }
    
    return representatives || [];
  } catch (error) {
    console.error('Error fetching representatives:', error);
    return [];
  }
}

/**
 * Get available contact message templates
 */
export async function getContactMessageTemplates(): Promise<ContactMessage[]> {
  try {
    const { data: templates, error } = await supabase
      .from('representative_contact_messages')
      .select('*')
      .order('category');
    
    if (error) {
      console.error('Error fetching contact templates:', error);
      return [];
    }
    
    return templates || [];
  } catch (error) {
    console.error('Error fetching contact templates:', error);
    return [];
  }
}

/**
 * Generate personalized message for representative contact
 */
export function generatePersonalizedMessage(
  representative: Representative,
  template: ContactMessage,
  sentiment: 'support' | 'oppose',
  billTitle: string,
  personaData: any
): PersonalizedMessage {
  const { first_name, last_name, title, state, district, chamber } = representative;
  const fullName = `${title} ${first_name} ${last_name}`;
  
  // Personalize the message template
  let personalizedMessage = template.message_template
    .replace('{representative_name}', fullName)
    .replace('{state}', state)
    .replace('{district}', district || '')
    .replace('{chamber}', chamber)
    .replace('{bill_title}', billTitle)
    .replace('{sentiment}', sentiment)
    .replace('{location}', personaData.location)
    .replace('{age}', personaData.age)
    .replace('{occupation}', personaData.occupation);
  
  // Add specific concerns based on persona
  if (personaData.dependents > 0) {
    personalizedMessage += `\n\nAs a parent of ${personaData.dependents} child${personaData.dependents > 1 ? 'ren' : ''}, this legislation has particular importance for my family.`;
  }
  
  if (personaData.income_bracket === '$0-25k') {
    personalizedMessage += `\n\nAs someone in the ${personaData.income_bracket} income bracket, I am especially concerned about the economic impact of this legislation.`;
  }
  
  personalizedMessage += `\n\nI urge you to ${sentiment === 'support' ? 'support' : 'oppose'} this important legislation.\n\nThank you for your time and consideration.`;
  
  // Determine best contact method
  const contactMethod = representative.email ? 'email' : 
                       representative.contact_form ? 'form' : 'phone';
  
  return {
    subject: template.subject.replace('{bill_title}', billTitle),
    message: personalizedMessage,
    representative,
    contactMethod
  };
}

/**
 * Record that a user contacted their representative
 */
export async function recordRepresentativeContact(
  userId: string | null,
  sessionId: string | null,
  representativeId: string,
  billId: string,
  messageId: string,
  sentiment: 'support' | 'oppose',
  customMessage?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_representative_contacts')
      .insert({
        user_id: userId,
        session_id: sessionId,
        representative_id: representativeId,
        bill_id: billId,
        message_id: messageId,
        sentiment,
        custom_message: customMessage,
        contact_method: 'email',
        contacted_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error recording representative contact:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error recording representative contact:', error);
    return false;
  }
}

/**
 * Check if data has been seeded already
 */
export async function checkIfDataSeeded(): Promise<boolean> {
  try {
    const [templatesResult, repsResult] = await Promise.all([
      supabase.from('representative_contact_messages').select('id').limit(1),
      supabase.from('representatives').select('id').limit(1)
    ]);
    
    return (templatesResult.data?.length ?? 0) > 0 || 
           (repsResult.data?.length ?? 0) > 0;
  } catch (error) {
    console.error('Error checking seeded data:', error);
    return false;
  }
}

/**
 * Seed the database with sample contact message templates
 */
export async function seedContactMessageTemplates(): Promise<void> {
  // Check if already seeded
  const { data: existing } = await supabase
    .from('representative_contact_messages')
    .select('id')
    .limit(1);
  
  if (existing && existing.length > 0) {
    console.log('Contact message templates already seeded');
    return;
  }

  const templates = [
    {
      title: 'Support Economic Legislation',
      subject: 'Please Support {bill_title}',
      category: 'economic',
      bill_type: 'economic',
      message_template: `Dear {representative_name},

I am writing as your constituent from {location} to express my strong support for {bill_title}.

As a {age}-year-old {occupation}, this legislation would have a significant positive impact on my life and the lives of many others in {state}. The economic benefits outlined in this bill are crucial for our community's prosperity.

I urge you to vote YES on this important legislation.

Thank you for your consideration.

Sincerely,
A concerned constituent from {location}`
    },
    {
      title: 'Oppose Economic Legislation',
      subject: 'Please Oppose {bill_title}',
      category: 'economic',
      bill_type: 'economic',
      message_template: `Dear {representative_name},

I am writing as your constituent from {location} to express my concerns about {bill_title}.

As a {age}-year-old {occupation}, I believe this legislation could have unintended negative consequences for hardworking families in {state}. The economic impacts worry me, and I believe there are better alternatives to address these issues.

I urge you to vote NO on this legislation.

Thank you for your consideration.

Sincerely,
A concerned constituent from {location}`
    },
    {
      title: 'Support Healthcare Legislation',
      subject: 'Please Support {bill_title}',
      category: 'healthcare',
      bill_type: 'healthcare',
      message_template: `Dear {representative_name},

I am writing as your constituent from {location} to express my strong support for {bill_title}.

Access to affordable healthcare is crucial for families like mine in {state}. This legislation would help ensure that more people can receive the medical care they need without facing financial hardship.

I urge you to vote YES on this vital healthcare legislation.

Thank you for your consideration.

Sincerely,
A concerned constituent from {location}`
    },
    {
      title: 'Support Education Legislation',
      subject: 'Please Support {bill_title}',
      category: 'education',
      bill_type: 'education',
      message_template: `Dear {representative_name},

I am writing as your constituent from {location} to express my strong support for {bill_title}.

Education is the foundation of our society, and this legislation would provide crucial support for students and families in {state}. As a {occupation}, I understand the importance of accessible, quality education.

I urge you to vote YES on this important education legislation.

Thank you for your consideration.

Sincerely,
A concerned constituent from {location}`
    }
  ];
  
  try {
    const { error } = await supabase
      .from('representative_contact_messages')
      .insert(templates);
    
    if (error) {
      console.error('Error seeding contact message templates:', error);
    } else {
      console.log('Contact message templates seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding contact message templates:', error);
  }
}

/**
 * Get state abbreviation from state name or abbreviation
 */
function getStateAbbreviation(stateName: string): string {
  const stateMap: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
  };
  
  const normalizedInput = stateName.trim();
  
  // Check if it's already a valid state abbreviation
  const validAbbreviations = Object.values(stateMap);
  if (validAbbreviations.includes(normalizedInput.toUpperCase())) {
    return normalizedInput.toUpperCase();
  }
  
  // Check if it's a full state name
  return stateMap[normalizedInput] || normalizedInput.toUpperCase();
}

/**
 * Scrape representatives data from Congress.gov (placeholder implementation)
 * In a real implementation, this would use a proper API or scraping service
 */
export async function scrapeRepresentativesData(): Promise<Representative[]> {
  // This is a placeholder implementation
  // In a real application, you would implement web scraping or use an API
  
  // For now, return sample data for Colorado (since the persona is from Denver)
  const sampleRepresentatives: Partial<Representative>[] = [
    {
      bioguide_id: 'B001267',
      first_name: 'Michael',
      last_name: 'Bennet',
      title: 'Sen.',
      party: 'D',
      state: 'CO',
      chamber: 'senate',
      office: '261 Russell Senate Office Building',
      phone: '(202) 224-5852',
      email: 'contact@bennet.senate.gov',
      website: 'https://bennet.senate.gov',
      in_office: true,
      term_start: '2009-01-21',
      term_end: '2029-01-03'
    },
    {
      bioguide_id: 'H001046',
      first_name: 'John',
      last_name: 'Hickenlooper',
      title: 'Sen.',
      party: 'D',
      state: 'CO',
      chamber: 'senate',
      office: '374 Russell Senate Office Building',
      phone: '(202) 224-5941',
      email: 'contact@hickenlooper.senate.gov',
      website: 'https://hickenlooper.senate.gov',
      in_office: true,
      term_start: '2021-01-03',
      term_end: '2027-01-03'
    }
  ];
  
  return sampleRepresentatives as Representative[];
}

/**
 * Seed representatives data
 */
export async function seedRepresentativesData(): Promise<void> {
  // Check if already seeded
  const { data: existing } = await supabase
    .from('representatives')
    .select('id')
    .limit(1);
  
  if (existing && existing.length > 0) {
    console.log('Representatives already seeded');
    return;
  }

  const representatives = await scrapeRepresentativesData();
  
  if (representatives.length > 0) {
    try {
      const { error } = await supabase
        .from('representatives')
        .insert(representatives);
      
      if (error) {
        console.error('Error seeding representatives:', error);
      } else {
        console.log('Representatives seeded successfully');
      }
    } catch (error) {
      console.error('Error seeding representatives:', error);
    }
  }
}

/**
 * Initialize representatives data in the database (controlled seeding)
 */
export async function initializeRepresentativesData(): Promise<void> {
  try {
    // Check if data is already seeded
    const isSeeded = await checkIfDataSeeded();
    
    if (!isSeeded) {
      console.log('Initializing representatives data...');
      await Promise.all([
        seedContactMessageTemplates(),
        seedRepresentativesData()
      ]);
      console.log('Representatives data initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing representatives data:', error);
  }
} 