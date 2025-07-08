import OpenAI from 'openai';
import { Representative } from './representatives';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AnalyzedLocation {
  state: string;
  stateAbbr: string;
  city?: string;
  district?: string;
  confidence: number;
}

export interface EnhancedRepresentative extends Representative {
  photo_url?: string;
  years_served: number;
  current_term_start: string;
  current_term_end: string;
  biography?: string;
  committees?: string[];
  summary?: string;
}

/**
 * Extract JSON from OpenAI response that may contain markdown or extra text
 */
function extractJsonFromResponse(content: string): any {
  if (!content) return null;
  
  // Remove any leading/trailing whitespace
  content = content.trim();
  
  // Try parsing as direct JSON first
  try {
    return JSON.parse(content);
  } catch (e) {
    // If that fails, try extracting JSON from markdown code blocks
    const markdownPatterns = [
      /```json\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/g,
      /```\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/g,
      /`(\{[\s\S]*?\}|\[[\s\S]*?\])`/g,
    ];
    
    for (const pattern of markdownPatterns) {
      const match = content.match(pattern);
      if (match) {
        try {
          // Extract the JSON part (first capture group)
          const jsonMatch = match[0].match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                           match[0].match(/`([\s\S]*?)`/);
          if (jsonMatch && jsonMatch[1]) {
            return JSON.parse(jsonMatch[1].trim());
          }
        } catch (parseError) {
          console.log('Failed to parse markdown JSON:', parseError);
          continue;
        }
      }
    }
    
    // Try to find JSON object or array patterns in the text
    const jsonPatterns = [
      /(\{[\s\S]*?\})/,
      /(\[[\s\S]*?\])/
    ];
    
    for (const pattern of jsonPatterns) {
      const match = content.match(pattern);
      if (match) {
        try {
          let jsonStr = match[1];
          // Clean up common issues
          jsonStr = jsonStr.replace(/\]\s*[\s\S]*$/, ']'); // Remove trailing text after array
          jsonStr = jsonStr.replace(/\}\s*[\s\S]*$/, '}'); // Remove trailing text after object
          return JSON.parse(jsonStr);
        } catch (parseError) {
          console.log('Failed to parse extracted JSON:', parseError);
          continue;
        }
      }
    }
    
    console.error('No valid JSON found in response:', content);
    return null;
  }
}

/**
 * Use OpenAI to analyze and parse location text
 */
export async function analyzeLocationWithAI(locationText: string): Promise<AnalyzedLocation | null> {
  const maxRetries = 2;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`Analyzing location "${locationText}" (attempt ${attempt}/${maxRetries})`);
      
      const prompt = `Analyze this location and return geographic information with congressional district: "${locationText}"

IMPORTANT: For cities, determine the PRIMARY congressional district that covers the city center/downtown area.

Return ONLY a JSON object (no markdown, no explanations):
{
  "state": "Full state name",
  "stateAbbr": "Two-letter code",
  "city": "City name or null",
  "district": "District number or null",
  "confidence": 0.9
}

Examples:
Austin, TX → {"state": "Texas", "stateAbbr": "TX", "city": "Austin", "district": "35", "confidence": 0.95}
Denver, CO → {"state": "Colorado", "stateAbbr": "CO", "city": "Denver", "district": "1", "confidence": 0.9}
Columbus, OH → {"state": "Ohio", "stateAbbr": "OH", "city": "Columbus", "district": "3", "confidence": 0.9}
Atlanta, GA → {"state": "Georgia", "stateAbbr": "GA", "city": "Atlanta", "district": "5", "confidence": 0.9}
Nashville, TN → {"state": "Tennessee", "stateAbbr": "TN", "city": "Nashville", "district": "5", "confidence": 0.9}
Milwaukee, WI → {"state": "Wisconsin", "stateAbbr": "WI", "city": "Milwaukee", "district": "4", "confidence": 0.9}
Portland, OR → {"state": "Oregon", "stateAbbr": "OR", "city": "Portland", "district": "3", "confidence": 0.9}
Birmingham, AL → {"state": "Alabama", "stateAbbr": "AL", "city": "Birmingham", "district": "7", "confidence": 0.9}
Richmond, VA → {"state": "Virginia", "stateAbbr": "VA", "city": "Richmond", "district": "4", "confidence": 0.9}

If a city spans multiple districts, choose the district that covers the city center/downtown area.
Return null if location is invalid.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a JSON API. Return ONLY valid JSON or null. No markdown, no explanations, no text outside the JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content || content === 'null') {
        console.log('Empty or null response from OpenAI location analysis, retrying...');
        continue;
      }

      const result = extractJsonFromResponse(content);
      if (!result) {
        console.log('No valid JSON found in location analysis response, retrying...');
        continue;
      }

      // Validate the result has required fields
      if (!result.state || !result.stateAbbr || result.confidence < 0.5) {
        console.log('Invalid location analysis result, retrying...');
        continue;
      }

      console.log('Location analysis successful:', result);
      return result as AnalyzedLocation;

    } catch (error) {
      console.error(`Error analyzing location (attempt ${attempt}):`, error);
      if (attempt === maxRetries) {
        console.error('Max retries reached for location analysis');
        return null;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return null;
}

/**
 * Use OpenAI to fetch current representative information
 */
export async function fetchCurrentRepresentatives(state: string, district?: string): Promise<EnhancedRepresentative[]> {
  const maxRetries = 2;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`Fetching representatives for ${state}${district ? ` district ${district}` : ''} (attempt ${attempt}/${maxRetries})`);
      
      const districtText = district ? ` and congressional district ${district}` : '';
      const prompt = `Find the current U.S. representatives for ${state}${districtText} as of 2024.

Your task is to provide accurate, current representative information. Use your knowledge of recent elections and current officeholders.

For ${state}, provide:
- The 2 U.S. Senators for ${state}
${district ? `- The House Representative for district ${district}` : '- The House Representative for the most relevant district'}

${district ? `IMPORTANT: Focus specifically on district ${district} for the House representative.` : ''}

Guidelines:
- Provide representatives who are currently serving (2025-2027 term for House, varies for Senate)
- For House representatives, use term dates: "current_term_start": "2025-01-03", "current_term_end": "2027-01-03"
- For Senators, use their actual 6-year term dates
- Use realistic bioguide IDs (typically Last name + year format like "S001234")
- Include accurate office buildings, phone numbers, and committee information
- If you know recent election results or current officeholders, use that information
- Provide your best knowledge rather than returning empty results

Return a JSON array with this exact structure:
[
  {
    "bioguide_id": "B001267",
    "first_name": "Michael",
    "last_name": "Bennet",
    "title": "Sen.",
    "party": "D",
    "state": "${state.length === 2 ? state : state.substring(0, 2).toUpperCase()}",
    "district": ${district ? `"${district}"` : 'null'},
    "chamber": "${district ? 'house' : 'senate'}",
    "office": "261 Russell Senate Office Building",
    "phone": "202-224-5852",
    "email": null,
    "website": "https://bennet.senate.gov",
    "photo_url": null,
    "years_served": 15,
    "current_term_start": "2021-01-03",
    "current_term_end": "2027-01-03",
    "biography": "Senator from ${state} since 2009, focusing on economic policy and healthcare.",
    "committees": ["Finance", "Agriculture"]
  }
]

Key requirements:
- Use real bioguide IDs when possible (format: Last name + year pattern)
- Include both current Senators for the state
- Provide realistic office addresses, phone numbers, and websites
- DO NOT return an empty array unless you absolutely cannot provide any information
- If uncertain about exact details, provide reasonable estimates based on typical congressional information`;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a congressional information API. Your job is to provide current U.S. representative information in JSON format for any location. Use your knowledge of recent elections, current officeholders, and congressional districts. When a specific district is requested, focus on that district. Provide your best knowledge of current representatives (2023-2025 term) rather than returning empty results. Include realistic details like office buildings, phone numbers, and committee assignments. Be helpful and informative."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        console.log('Empty response from OpenAI, retrying...');
        continue;
      }

      console.log('Raw OpenAI response:', content);

      // Extract JSON from response
      const jsonData = extractJsonFromResponse(content);
      
      if (!jsonData) {
        console.log('No valid JSON found in OpenAI response, retrying...');
        continue;
      }

      // Check if we got an empty array - allow it on the last attempt
      if (Array.isArray(jsonData) && jsonData.length === 0) {
        if (attempt < maxRetries) {
          console.log('OpenAI returned empty array, retrying...');
          continue;
        } else {
          console.log('OpenAI returned empty array on final attempt, accepting empty result');
          return [];
        }
      }

      // Ensure we have an array
      const representatives = Array.isArray(jsonData) ? jsonData : [jsonData];
      
      // Filter out example data and validate current representatives
      const validRepresentatives = representatives.filter(rep => {
        // Skip if missing required fields
        if (!rep.first_name || !rep.last_name || !rep.party || !rep.state) {
          console.warn('Skipping representative with missing required fields:', rep);
          return false;
        }
        
        // Skip if it's clearly example data
        if (rep.first_name.includes('Example') || rep.last_name.includes('Example') || 
            rep.bioguide_id.includes('Example') || 
            (rep.first_name === 'John' && rep.last_name === 'Doe') ||
            (rep.first_name === 'Jane' && rep.last_name === 'Smith')) {
          console.warn('Skipping example representative data:', rep);
          return false;
        }
        
        // Skip known outdated representatives
        const outdatedReps = [
          'Mitt Romney', 'Chris Stewart', 'Rob Bishop', 'Feinstein', 'Boxer',
          'McCain', 'Flake', 'Orrin Hatch', 'Jason Chaffetz'
        ];
        const fullName = `${rep.first_name} ${rep.last_name}`;
        if (outdatedReps.some(name => fullName.includes(name))) {
          console.warn('Skipping outdated representative:', fullName);
          return false;
        }
        
        // Only filter representatives who left office more than 3 years ago (clearly outdated)
        if (rep.current_term_end) {
          const termEnd = new Date(rep.current_term_end);
          const now = new Date();
          const threeYearsAgo = new Date(now.getTime() - (3 * 365 * 24 * 60 * 60 * 1000));
          if (termEnd < threeYearsAgo) {
            console.warn('Skipping representative from 3+ years ago:', fullName, 'ended:', rep.current_term_end);
            return false;
          }
        }
        
        return true;
      });

      if (validRepresentatives.length === 0) {
        console.log('No valid representatives found after filtering, retrying...');
        continue;
      }

      // Add calculated fields
      const enhancedRepresentatives = validRepresentatives.map(rep => {
        // Convert years_served from string format if needed
        let yearsServed = rep.years_served;
        if (typeof yearsServed === 'string') {
          if (yearsServed.includes('since')) {
            const year = parseInt(yearsServed.replace(/\D/g, ''));
            if (year) {
              yearsServed = new Date().getFullYear() - year;
            }
          } else {
            yearsServed = parseInt(yearsServed) || 0;
          }
        }

        // Determine if term has ended
        const now = new Date();
        const termEnd = rep.current_term_end ? new Date(rep.current_term_end) : null;
        const termHasEnded = termEnd && termEnd < now;
        const isCurrentlyServing = !termHasEnded;

        return {
          ...rep,
          // Ensure all required database fields are present
          id: rep.bioguide_id, // Use bioguide_id as the id if not present
          middle_name: rep.middle_name || null,
          contact_form: rep.contact_form || null,
          facebook: rep.facebook || null,
          twitter: rep.twitter || null,
          youtube: rep.youtube || null,
          image_url: rep.image_url || null,
          next_election: rep.next_election || null,
          years_served: yearsServed,
          in_office: isCurrentlyServing,
          term_start: rep.current_term_start,
          term_end: rep.current_term_end,
          term_status: termHasEnded ? 'ended' : 'current',
          term_end_date: rep.current_term_end,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      console.log(`Successfully fetched ${enhancedRepresentatives.length} representatives`);
      return enhancedRepresentatives;

    } catch (error) {
      console.error(`Error fetching representatives (attempt ${attempt}):`, error);
      if (attempt === maxRetries) {
        console.error('Max retries reached for fetching representatives');
        return [];
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return [];
}

/**
 * Alternative API approach using ProPublica Congress API
 * This is a more reliable source for current congressional data
 */
async function fetchRepresentativesFromAPI(state: string, district?: string): Promise<EnhancedRepresentative[]> {
  // Note: This requires a ProPublica API key in environment variables
  const apiKey = process.env.PROPUBLICA_API_KEY;
  
  if (!apiKey) {
    console.log('ProPublica API key not found, skipping API fetch');
    return [];
  }
  
  try {
    const representatives: EnhancedRepresentative[] = [];
    
    // Fetch Senators
    const senateResponse = await fetch(`https://api.propublica.org/congress/v1/members/senate/${state}/current.json`, {
      headers: {
        'X-API-Key': apiKey
      }
    });
    
    if (senateResponse.ok) {
      const senateData = await senateResponse.json();
      for (const member of senateData.results) {
        representatives.push({
          id: `rep-${state.toLowerCase()}-${member.id}`,
          bioguide_id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          middle_name: member.middle_name,
          title: member.short_title,
          party: member.party,
          state: member.state,
          district: null,
          chamber: 'senate',
          office: member.office,
          phone: member.phone,
          email: null,
          contact_form: member.contact_form,
          website: member.url,
          facebook: member.facebook_account,
          twitter: member.twitter_account,
          youtube: member.youtube_account,
          image_url: null,
          photo_url: undefined,
          years_served: new Date().getFullYear() - new Date(member.seniority_date).getFullYear(),
          current_term_start: member.date_of_birth, // This would need proper mapping
          current_term_end: member.date_of_birth, // This would need proper mapping
          biography: `${member.short_title} ${member.first_name} ${member.last_name} from ${member.state}`,
          committees: [],
          in_office: member.in_office,
          next_election: member.next_election,
          term_start: member.date_of_birth,
          term_end: member.date_of_birth,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
    
    // Fetch House Representative if district provided
    if (district) {
      const houseResponse = await fetch(`https://api.propublica.org/congress/v1/members/house/${state}/${district}/current.json`, {
        headers: {
          'X-API-Key': apiKey
        }
      });
      
      if (houseResponse.ok) {
        const houseData = await houseResponse.json();
        for (const member of houseData.results) {
          representatives.push({
            id: `rep-${state.toLowerCase()}-${member.id}`,
            bioguide_id: member.id,
            first_name: member.first_name,
            last_name: member.last_name,
            middle_name: member.middle_name,
            title: member.short_title,
            party: member.party,
            state: member.state,
            district: member.district,
            chamber: 'house',
            office: member.office,
            phone: member.phone,
            email: null,
            contact_form: member.contact_form,
            website: member.url,
            facebook: member.facebook_account,
            twitter: member.twitter_account,
            youtube: member.youtube_account,
            image_url: null,
            photo_url: undefined,
            years_served: new Date().getFullYear() - new Date(member.seniority_date).getFullYear(),
            current_term_start: member.date_of_birth,
            current_term_end: member.date_of_birth,
            biography: `${member.short_title} ${member.first_name} ${member.last_name} from ${member.state} District ${member.district}`,
            committees: [],
            in_office: member.in_office,
            next_election: member.next_election,
            term_start: member.date_of_birth,
            term_end: member.date_of_birth,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
    }
    
    return representatives;
  } catch (error) {
    console.error('Error fetching from ProPublica API:', error);
    return [];
  }
}

/**
 * City-specific fallback representative data for accurate district representation
 */
const getCitySpecificFallbackRepresentatives = (analyzedLocation: AnalyzedLocation): EnhancedRepresentative[] => {
  const stateAbbr = analyzedLocation.stateAbbr;
  const city = analyzedLocation.city?.toLowerCase();
  
  // City-specific representatives with accurate district information
  const citySpecificData: Record<string, Record<string, EnhancedRepresentative[]>> = {
    'TX': {
             'austin': [
         {
           id: 'rep-tx-cornyn',
           bioguide_id: 'C001056',
           first_name: 'John',
           last_name: 'Cornyn',
           middle_name: null,
           title: 'Sen.',
           party: 'R',
           state: 'TX',
           district: null,
           chamber: 'senate',
           office: '517 Hart Senate Office Building',
           phone: '202-224-2934',
           email: null,
           contact_form: null,
           website: 'https://www.cornyn.senate.gov',
           facebook: null,
           twitter: null,
           youtube: null,
           image_url: null,
           photo_url: undefined,
           years_served: 22,
           current_term_start: '2021-01-03',
           current_term_end: '2027-01-03',
           biography: 'U.S. Senator from Texas since 2002.',
           committees: ['Finance', 'Intelligence'],
           in_office: true,
           next_election: null,
           term_start: '2021-01-03',
           term_end: '2027-01-03',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         },
         {
           id: 'rep-tx-cruz',
           bioguide_id: 'C001098',
           first_name: 'Ted',
           last_name: 'Cruz',
           middle_name: null,
           title: 'Sen.',
           party: 'R',
           state: 'TX',
           district: null,
           chamber: 'senate',
           office: '127A Russell Senate Office Building',
           phone: '202-224-5922',
           email: null,
           contact_form: null,
           website: 'https://www.cruz.senate.gov',
           facebook: null,
           twitter: null,
           youtube: null,
           image_url: null,
           photo_url: undefined,
           years_served: 11,
           current_term_start: '2019-01-03',
           current_term_end: '2025-01-03',
           biography: 'U.S. Senator from Texas since 2013.',
           committees: ['Commerce', 'Foreign Relations'],
           in_office: true,
           next_election: null,
           term_start: '2019-01-03',
           term_end: '2025-01-03',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         },
         {
           id: 'rep-tx-35-doggett',
           bioguide_id: 'D000399',
           first_name: 'Lloyd',
           last_name: 'Doggett',
           middle_name: null,
           title: 'Rep.',
           party: 'D',
           state: 'TX',
           district: '35',
           chamber: 'house',
           office: '2307 Rayburn House Office Building',
           phone: '202-225-4865',
           email: null,
           contact_form: null,
           website: 'https://doggett.house.gov',
           facebook: null,
           twitter: null,
           youtube: null,
           image_url: null,
           photo_url: undefined,
           years_served: 29,
           current_term_start: '2023-01-03',
           current_term_end: '2025-01-03',
           biography: 'U.S. Representative for Texas 35th district, which includes central Austin and extends to San Antonio.',
           committees: ['Ways and Means', 'Budget'],
           in_office: true,
           next_election: null,
           term_start: '2023-01-03',
           term_end: '2025-01-03',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         },
         {
           id: 'rep-tx-21-roy',
           bioguide_id: 'R000614',
           first_name: 'Chip',
           last_name: 'Roy',
           middle_name: null,
           title: 'Rep.',
           party: 'R',
           state: 'TX',
           district: '21',
           chamber: 'house',
           office: '1005 Longworth House Office Building',
           phone: '202-225-4236',
           email: null,
           contact_form: null,
           website: 'https://roy.house.gov',
           facebook: null,
           twitter: null,
           youtube: null,
           image_url: null,
           photo_url: undefined,
           years_served: 5,
           current_term_start: '2023-01-03',
           current_term_end: '2025-01-03',
           biography: 'U.S. Representative for Texas 21st district, which includes parts of Austin and surrounding areas.',
           committees: ['Budget', 'Judiciary'],
           in_office: true,
           next_election: null,
           term_start: '2023-01-03',
           term_end: '2025-01-03',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         },
         {
           id: 'rep-tx-10-mccaul',
           bioguide_id: 'M001157',
           first_name: 'Michael',
           last_name: 'McCaul',
           middle_name: null,
           title: 'Rep.',
           party: 'R',
           state: 'TX',
           district: '10',
           chamber: 'house',
           office: '2001 Rayburn House Office Building',
           phone: '202-225-2401',
           email: null,
           contact_form: null,
           website: 'https://mccaul.house.gov',
           facebook: null,
           twitter: null,
           youtube: null,
           image_url: null,
           photo_url: undefined,
           years_served: 19,
           current_term_start: '2023-01-03',
           current_term_end: '2025-01-03',
           biography: 'U.S. Representative for Texas 10th district, which includes parts of Austin and surrounding counties.',
           committees: ['Foreign Affairs', 'Homeland Security'],
           in_office: true,
           next_election: null,
           term_start: '2023-01-03',
           term_end: '2025-01-03',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         }
       ],
      'houston': [
        {
          id: 'rep-tx-cornyn',
          bioguide_id: 'C001056',
          first_name: 'John',
          last_name: 'Cornyn',
          middle_name: null,
          title: 'Sen.',
          party: 'R',
          state: 'TX',
          district: null,
          chamber: 'senate',
          office: '517 Hart Senate Office Building',
          phone: '202-224-2934',
          email: null,
          contact_form: null,
          website: 'https://www.cornyn.senate.gov',
          facebook: null,
          twitter: null,
          youtube: null,
          image_url: null,
          photo_url: undefined,
          years_served: 22,
          current_term_start: '2021-01-03',
          current_term_end: '2027-01-03',
          biography: 'U.S. Senator from Texas since 2002.',
          committees: ['Finance', 'Intelligence'],
          in_office: true,
          next_election: null,
          term_start: '2021-01-03',
          term_end: '2027-01-03',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'rep-tx-cruz',
          bioguide_id: 'C001098',
          first_name: 'Ted',
          last_name: 'Cruz',
          middle_name: null,
          title: 'Sen.',
          party: 'R',
          state: 'TX',
          district: null,
          chamber: 'senate',
          office: '127A Russell Senate Office Building',
          phone: '202-224-5922',
          email: null,
          contact_form: null,
          website: 'https://www.cruz.senate.gov',
          facebook: null,
          twitter: null,
          youtube: null,
          image_url: null,
          photo_url: undefined,
          years_served: 11,
          current_term_start: '2019-01-03',
          current_term_end: '2025-01-03',
          biography: 'U.S. Senator from Texas since 2013.',
          committees: ['Commerce', 'Foreign Relations'],
          in_office: true,
          next_election: null,
          term_start: '2019-01-03',
          term_end: '2025-01-03',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'rep-tx-18-jackson-lee',
          bioguide_id: 'J000032',
          first_name: 'Sheila',
          last_name: 'Jackson Lee',
          middle_name: null,
          title: 'Rep.',
          party: 'D',
          state: 'TX',
          district: '18',
          chamber: 'house',
          office: '2079 Rayburn House Office Building',
          phone: '202-225-3816',
          email: null,
          contact_form: null,
          website: 'https://jacksonlee.house.gov',
          facebook: null,
          twitter: null,
          youtube: null,
          image_url: null,
          photo_url: undefined,
          years_served: 28,
          current_term_start: '2023-01-03',
          current_term_end: '2025-01-03',
          biography: 'U.S. Representative for Texas 18th district, which includes central Houston.',
          committees: ['Judiciary', 'Homeland Security'],
          in_office: true,
          next_election: null,
          term_start: '2023-01-03',
          term_end: '2025-01-03',
          created_at: new Date().toISOString(),
                     updated_at: new Date().toISOString()
         }
       ]
     },
     'UT': {
       'salt lake city': [
         {
           id: 'rep-ut-lee',
           bioguide_id: 'L000577',
           first_name: 'Mike',
           last_name: 'Lee',
           middle_name: null,
           title: 'Sen.',
           party: 'R',
           state: 'UT',
           district: null,
           chamber: 'senate',
           office: '361A Russell Senate Office Building',
           phone: '202-224-5444',
           email: null,
           contact_form: null,
           website: 'https://www.lee.senate.gov',
           facebook: null,
           twitter: null,
           youtube: null,
           image_url: null,
           photo_url: undefined,
           years_served: 14,
           current_term_start: '2023-01-03',
           current_term_end: '2029-01-03',
           biography: 'U.S. Senator from Utah since 2011.',
           committees: ['Judiciary', 'Energy and Natural Resources'],
           in_office: true,
           next_election: null,
           term_start: '2023-01-03',
           term_end: '2029-01-03',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         },
         {
           id: 'rep-ut-curtis',
           bioguide_id: 'C001114',
           first_name: 'John',
           last_name: 'Curtis',
           middle_name: null,
           title: 'Sen.',
           party: 'R',
           state: 'UT',
           district: null,
           chamber: 'senate',
           office: '124 Russell Senate Office Building',
           phone: '202-224-5251',
           email: null,
           contact_form: null,
           website: 'https://www.curtis.senate.gov',
           facebook: null,
           twitter: null,
           youtube: null,
           image_url: null,
           photo_url: undefined,
           years_served: 1,
           current_term_start: '2025-01-03',
           current_term_end: '2031-01-03',
           biography: 'U.S. Senator from Utah since 2025, won special election to replace Romney.',
           committees: ['Energy and Natural Resources', 'Environment'],
           in_office: true,
           next_election: null,
           term_start: '2025-01-03',
           term_end: '2031-01-03',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         },
         {
           id: 'rep-ut-2-moore',
           bioguide_id: 'M001225',
           first_name: 'Celeste',
           last_name: 'Maloy',
           middle_name: null,
           title: 'Rep.',
           party: 'R',
           state: 'UT',
           district: '2',
           chamber: 'house',
           office: '1039 Longworth House Office Building',
           phone: '202-225-9730',
           email: null,
           contact_form: null,
           website: 'https://maloy.house.gov',
           facebook: null,
           twitter: null,
           youtube: null,
           image_url: null,
           photo_url: undefined,
           years_served: 1,
           current_term_start: '2023-01-03',
           current_term_end: '2025-01-03',
           biography: 'U.S. Representative for Utah 2nd district, which includes Salt Lake City.',
           committees: ['Oversight and Reform', 'Natural Resources'],
           in_office: true,
           next_election: null,
           term_start: '2023-01-03',
           term_end: '2025-01-03',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         }
       ]
     },
     'CA': {
       'los angeles': [
         {
           id: 'rep-ca-schiff',
           bioguide_id: 'S001150',
           first_name: 'Adam',
           last_name: 'Schiff',
           middle_name: null,
           title: 'Sen.',
           party: 'D',
           state: 'CA',
           district: null,
           chamber: 'senate',
           office: '331 Hart Senate Office Building',
           phone: '202-224-3841',
           email: null,
           contact_form: null,
           website: 'https://www.schiff.senate.gov',
           facebook: null,
           twitter: null,
           youtube: null,
           image_url: null,
           photo_url: undefined,
           years_served: 1,
           current_term_start: '2025-01-03',
           current_term_end: '2031-01-03',
           biography: 'U.S. Senator from California since 2025.',
           committees: ['Judiciary', 'Intelligence'],
           in_office: true,
           next_election: null,
           term_start: '2025-01-03',
           term_end: '2031-01-03',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         },
         {
           id: 'rep-ca-padilla',
           bioguide_id: 'P000145',
           first_name: 'Alex',
           last_name: 'Padilla',
           middle_name: null,
           title: 'Sen.',
           party: 'D',
           state: 'CA',
           district: null,
           chamber: 'senate',
           office: '112 Hart Senate Office Building',
           phone: '202-224-3553',
           email: null,
           contact_form: null,
           website: 'https://www.padilla.senate.gov',
           facebook: null,
           twitter: null,
           youtube: null,
           image_url: null,
           photo_url: undefined,
           years_served: 4,
           current_term_start: '2021-01-20',
           current_term_end: '2027-01-03',
           biography: 'U.S. Senator from California since 2021.',
           committees: ['Environment', 'Judiciary'],
           in_office: true,
           next_election: null,
           term_start: '2021-01-20',
           term_end: '2027-01-03',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         }
       ],
       'columbus': [
         {
           id: 'rep-oh-brown',
           bioguide_id: 'B000944',
           first_name: 'Sherrod',
           last_name: 'Brown',
           middle_name: null,
           title: 'Sen.',
           party: 'D',
           state: 'OH',
           district: null,
           chamber: 'senate',
           office: '503 Hart Senate Office Building',
           phone: '202-224-2315',
           email: null,
           contact_form: null,
           website: 'https://www.brown.senate.gov',
           facebook: null,
           twitter: null,
           youtube: null,
           image_url: null,
           photo_url: undefined,
           years_served: 18,
           current_term_start: '2019-01-03',
           current_term_end: '2025-01-03',
           biography: 'U.S. Senator from Ohio since 2007.',
           committees: ['Banking', 'Finance'],
           in_office: true,
           next_election: null,
           term_start: '2019-01-03',
           term_end: '2025-01-03',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         },
         {
           id: 'rep-oh-vance',
           bioguide_id: 'V000137',
           first_name: 'J.D.',
           last_name: 'Vance',
           middle_name: null,
           title: 'Sen.',
           party: 'R',
           state: 'OH',
           district: null,
           chamber: 'senate',
           office: 'B40D Dirksen Senate Office Building',
           phone: '202-224-3353',
           email: null,
           contact_form: null,
           website: 'https://www.vance.senate.gov',
           facebook: null,
           twitter: null,
           youtube: null,
           image_url: null,
           photo_url: undefined,
           years_served: 2,
           current_term_start: '2023-01-03',
           current_term_end: '2029-01-03',
           biography: 'U.S. Senator from Ohio since 2023.',
           committees: ['Commerce', 'Banking'],
           in_office: true,
           next_election: null,
           term_start: '2023-01-03',
           term_end: '2029-01-03',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         },
         {
           id: 'rep-oh-3-beatty',
           bioguide_id: 'B001281',
           first_name: 'Joyce',
           last_name: 'Beatty',
           middle_name: null,
           title: 'Rep.',
           party: 'D',
           state: 'OH',
           district: '3',
           chamber: 'house',
           office: '2303 Rayburn House Office Building',
           phone: '202-225-4324',
           email: null,
           contact_form: null,
           website: 'https://beatty.house.gov',
           facebook: null,
           twitter: null,
           youtube: null,
           image_url: null,
           photo_url: undefined,
           years_served: 11,
           current_term_start: '2023-01-03',
           current_term_end: '2025-01-03',
           biography: 'U.S. Representative for Ohio 3rd district, which includes Columbus.',
           committees: ['Financial Services', 'Joint Economic'],
           in_office: true,
           next_election: null,
           term_start: '2023-01-03',
           term_end: '2025-01-03',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         }
       ]
     },
     'FL': {
       'miami': [
         {
           id: 'rep-fl-rubio',
           bioguide_id: 'R000595',
           first_name: 'Marco',
           last_name: 'Rubio',
           middle_name: null,
           title: 'Sen.',
           party: 'R',
           state: 'FL',
           district: null,
           chamber: 'senate',
           office: '284 Russell Senate Office Building',
           phone: '202-224-3041',
           email: null,
           contact_form: null,
           website: 'https://www.rubio.senate.gov',
           facebook: null,
           twitter: null,
           youtube: null,
           image_url: null,
           photo_url: undefined,
           years_served: 14,
           current_term_start: '2023-01-03',
           current_term_end: '2029-01-03',
           biography: 'U.S. Senator from Florida since 2011.',
           committees: ['Foreign Relations', 'Intelligence'],
           in_office: true,
           next_election: null,
           term_start: '2023-01-03',
           term_end: '2029-01-03',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         },
         {
           id: 'rep-fl-scott',
           bioguide_id: 'S001217',
           first_name: 'Rick',
           last_name: 'Scott',
           middle_name: null,
           title: 'Sen.',
           party: 'R',
           state: 'FL',
           district: null,
           chamber: 'senate',
           office: '502 Hart Senate Office Building',
           phone: '202-224-5274',
           email: null,
           contact_form: null,
           website: 'https://www.rickscott.senate.gov',
           facebook: null,
           twitter: null,
           youtube: null,
           image_url: null,
           photo_url: undefined,
           years_served: 6,
           current_term_start: '2019-01-03',
           current_term_end: '2025-01-03',
           biography: 'U.S. Senator from Florida since 2019.',
           committees: ['Commerce', 'Budget'],
           in_office: true,
           next_election: null,
           term_start: '2019-01-03',
           term_end: '2025-01-03',
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString()
         }
       ]
     }
   };
  
  // Try to get city-specific data first
  if (city && citySpecificData[stateAbbr]?.[city]) {
    return citySpecificData[stateAbbr][city];
  }
  
  // Fall back to state-level data
  return [];
};

/**
 * Fallback representative data for common locations when OpenAI fails
 */
const getFallbackRepresentatives = (analyzedLocation: AnalyzedLocation): EnhancedRepresentative[] => {
  // Try city-specific data first
  const citySpecific = getCitySpecificFallbackRepresentatives(analyzedLocation);
  if (citySpecific.length > 0) {
    return citySpecific;
  }
  
  const stateAbbr = analyzedLocation.stateAbbr;
  
  // Basic fallback data for common states
  const fallbackData: Record<string, EnhancedRepresentative[]> = {
    'CO': [
      {
        id: 'rep-co-bennet',
        bioguide_id: 'B001267',
        first_name: 'Michael',
        last_name: 'Bennet',
        middle_name: null,
        title: 'Sen.',
        party: 'D',
        state: 'CO',
        district: null,
        chamber: 'senate',
        office: '261 Russell Senate Office Building',
        phone: '202-224-5852',
        email: null,
        contact_form: null,
        website: 'https://www.bennet.senate.gov',
        facebook: null,
        twitter: null,
        youtube: null,
        image_url: null,
        photo_url: undefined,
        years_served: 15,
        current_term_start: '2023-01-03',
        current_term_end: '2029-01-03',
        biography: 'U.S. Senator from Colorado since 2009.',
        committees: ['Finance', 'Agriculture'],
        in_office: true,
        next_election: null,
        term_start: '2023-01-03',
        term_end: '2029-01-03',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'rep-co-hickenlooper',
        bioguide_id: 'H001077',
        first_name: 'John',
        last_name: 'Hickenlooper',
        middle_name: null,
        title: 'Sen.',
        party: 'D',
        state: 'CO',
        district: null,
        chamber: 'senate',
        office: '374 Russell Senate Office Building',
        phone: '202-224-5941',
        email: null,
        contact_form: null,
        website: 'https://www.hickenlooper.senate.gov',
        facebook: null,
        twitter: null,
        youtube: null,
        image_url: null,
        photo_url: undefined,
        years_served: 4,
        current_term_start: '2021-01-03',
        current_term_end: '2027-01-03',
        biography: 'U.S. Senator from Colorado since 2021.',
        committees: ['Energy', 'Commerce'],
        in_office: true,
        next_election: null,
        term_start: '2021-01-03',
        term_end: '2027-01-03',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    'CA': [
      {
        id: 'rep-ca-schiff',
        bioguide_id: 'S001150',
        first_name: 'Adam',
        last_name: 'Schiff',
        middle_name: null,
        title: 'Sen.',
        party: 'D',
        state: 'CA',
        district: null,
        chamber: 'senate',
        office: '331 Hart Senate Office Building',
        phone: '202-224-3841',
        email: null,
        contact_form: null,
        website: 'https://www.schiff.senate.gov',
        facebook: null,
        twitter: null,
        youtube: null,
        image_url: null,
        photo_url: undefined,
        years_served: 1,
        current_term_start: '2025-01-03',
        current_term_end: '2031-01-03',
        biography: 'U.S. Senator from California since 2025.',
        committees: ['Judiciary', 'Intelligence'],
        in_office: true,
        next_election: null,
        term_start: '2025-01-03',
        term_end: '2031-01-03',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'rep-ca-padilla',
        bioguide_id: 'P000145',
        first_name: 'Alex',
        last_name: 'Padilla',
        middle_name: null,
        title: 'Sen.',
        party: 'D',
        state: 'CA',
        district: null,
        chamber: 'senate',
        office: '112 Hart Senate Office Building',
        phone: '202-224-3553',
        email: null,
        contact_form: null,
        website: 'https://www.padilla.senate.gov',
        facebook: null,
        twitter: null,
        youtube: null,
        image_url: null,
        photo_url: undefined,
        years_served: 4,
        current_term_start: '2021-01-20',
        current_term_end: '2027-01-03',
        biography: 'U.S. Senator from California since 2021.',
        committees: ['Environment', 'Judiciary'],
        in_office: true,
        next_election: null,
        term_start: '2021-01-20',
        term_end: '2027-01-03',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    'FL': [
      {
        id: 'rep-fl-rubio',
        bioguide_id: 'R000595',
        first_name: 'Marco',
        last_name: 'Rubio',
        middle_name: null,
        title: 'Sen.',
        party: 'R',
        state: 'FL',
        district: null,
        chamber: 'senate',
        office: '284 Russell Senate Office Building',
        phone: '202-224-3041',
        email: null,
        contact_form: null,
        website: 'https://www.rubio.senate.gov',
        facebook: null,
        twitter: null,
        youtube: null,
        image_url: null,
        photo_url: undefined,
        years_served: 14,
        current_term_start: '2023-01-03',
        current_term_end: '2029-01-03',
        biography: 'U.S. Senator from Florida since 2011.',
        committees: ['Foreign Relations', 'Intelligence'],
        in_office: true,
        next_election: null,
        term_start: '2023-01-03',
        term_end: '2029-01-03',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'rep-fl-scott',
        bioguide_id: 'S001217',
        first_name: 'Rick',
        last_name: 'Scott',
        middle_name: null,
        title: 'Sen.',
        party: 'R',
        state: 'FL',
        district: null,
        chamber: 'senate',
        office: '502 Hart Senate Office Building',
        phone: '202-224-5274',
        email: null,
        contact_form: null,
        website: 'https://www.rickscott.senate.gov',
        facebook: null,
        twitter: null,
        youtube: null,
        image_url: null,
        photo_url: undefined,
        years_served: 6,
        current_term_start: '2019-01-03',
        current_term_end: '2025-01-03',
        biography: 'U.S. Senator from Florida since 2019.',
        committees: ['Commerce', 'Budget'],
        in_office: true,
        next_election: null,
        term_start: '2019-01-03',
        term_end: '2025-01-03',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    'TX': [
      {
        id: 'rep-tx-cornyn',
        bioguide_id: 'C001056',
        first_name: 'John',
        last_name: 'Cornyn',
        middle_name: null,
        title: 'Sen.',
        party: 'R',
        state: 'TX',
        district: null,
        chamber: 'senate',
        office: '517 Hart Senate Office Building',
        phone: '202-224-2934',
        email: null,
        contact_form: null,
        website: 'https://www.cornyn.senate.gov',
        facebook: null,
        twitter: null,
        youtube: null,
        image_url: null,
        photo_url: undefined,
        years_served: 22,
        current_term_start: '2021-01-03',
        current_term_end: '2027-01-03',
        biography: 'U.S. Senator from Texas since 2002.',
        committees: ['Finance', 'Intelligence'],
        in_office: true,
        next_election: null,
        term_start: '2021-01-03',
        term_end: '2027-01-03',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'rep-tx-cruz',
        bioguide_id: 'C001098',
        first_name: 'Ted',
        last_name: 'Cruz',
        middle_name: null,
        title: 'Sen.',
        party: 'R',
        state: 'TX',
        district: null,
        chamber: 'senate',
        office: '127A Russell Senate Office Building',
        phone: '202-224-5922',
        email: null,
        contact_form: null,
        website: 'https://www.cruz.senate.gov',
        facebook: null,
        twitter: null,
        youtube: null,
        image_url: null,
        photo_url: undefined,
        years_served: 11,
        current_term_start: '2019-01-03',
        current_term_end: '2025-01-03',
        biography: 'U.S. Senator from Texas since 2013.',
        committees: ['Commerce', 'Foreign Relations'],
        in_office: true,
        next_election: null,
        term_start: '2019-01-03',
        term_end: '2025-01-03',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    'UT': [
      {
        id: 'rep-ut-lee',
        bioguide_id: 'L000577',
        first_name: 'Mike',
        last_name: 'Lee',
        middle_name: null,
        title: 'Sen.',
        party: 'R',
        state: 'UT',
        district: null,
        chamber: 'senate',
        office: '361A Russell Senate Office Building',
        phone: '202-224-5444',
        email: null,
        contact_form: null,
        website: 'https://www.lee.senate.gov',
        facebook: null,
        twitter: null,
        youtube: null,
        image_url: null,
        photo_url: undefined,
        years_served: 14,
        current_term_start: '2023-01-03',
        current_term_end: '2029-01-03',
        biography: 'U.S. Senator from Utah since 2011.',
        committees: ['Judiciary', 'Energy and Natural Resources'],
        in_office: true,
        next_election: null,
        term_start: '2023-01-03',
        term_end: '2029-01-03',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'rep-ut-curtis',
        bioguide_id: 'C001114',
        first_name: 'John',
        last_name: 'Curtis',
        middle_name: null,
        title: 'Sen.',
        party: 'R',
        state: 'UT',
        district: null,
        chamber: 'senate',
        office: '124 Russell Senate Office Building',
        phone: '202-224-5251',
        email: null,
        contact_form: null,
        website: 'https://www.curtis.senate.gov',
        facebook: null,
        twitter: null,
        youtube: null,
        image_url: null,
        photo_url: undefined,
        years_served: 1,
        current_term_start: '2025-01-03',
        current_term_end: '2031-01-03',
        biography: 'U.S. Senator from Utah since 2025, won special election to replace Romney.',
        committees: ['Energy and Natural Resources', 'Environment'],
        in_office: true,
        next_election: null,
        term_start: '2025-01-03',
        term_end: '2031-01-03',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    'NY': [
      {
        id: 'rep-ny-schumer',
        bioguide_id: 'S000148',
        first_name: 'Charles',
        last_name: 'Schumer',
        middle_name: 'E.',
        title: 'Sen.',
        party: 'D',
        state: 'NY',
        district: null,
        chamber: 'senate',
        office: '322 Hart Senate Office Building',
        phone: '202-224-6542',
        email: null,
        contact_form: null,
        website: 'https://www.schumer.senate.gov',
        facebook: null,
        twitter: null,
        youtube: null,
        image_url: null,
        photo_url: undefined,
        years_served: 25,
        current_term_start: '2023-01-03',
        current_term_end: '2029-01-03',
        biography: 'U.S. Senator from New York since 1999, Senate Majority Leader.',
        committees: ['Banking', 'Finance'],
        in_office: true,
        next_election: null,
        term_start: '2023-01-03',
        term_end: '2029-01-03',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'rep-ny-gillibrand',
        bioguide_id: 'G000555',
        first_name: 'Kirsten',
        last_name: 'Gillibrand',
        middle_name: 'E.',
        title: 'Sen.',
        party: 'D',
        state: 'NY',
        district: null,
        chamber: 'senate',
        office: '478 Russell Senate Office Building',
        phone: '202-224-4451',
        email: null,
        contact_form: null,
        website: 'https://www.gillibrand.senate.gov',
        facebook: null,
        twitter: null,
        youtube: null,
        image_url: null,
        photo_url: undefined,
        years_served: 15,
        current_term_start: '2019-01-03',
        current_term_end: '2025-01-03',
        biography: 'U.S. Senator from New York since 2009.',
        committees: ['Armed Services', 'Agriculture'],
        in_office: true,
        next_election: null,
        term_start: '2019-01-03',
        term_end: '2025-01-03',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
             }
     ],
     'OH': [
       {
         id: 'rep-oh-brown',
         bioguide_id: 'B000944',
         first_name: 'Sherrod',
         last_name: 'Brown',
         middle_name: null,
         title: 'Sen.',
         party: 'D',
         state: 'OH',
         district: null,
         chamber: 'senate',
         office: '503 Hart Senate Office Building',
         phone: '202-224-2315',
         email: null,
         contact_form: null,
         website: 'https://www.brown.senate.gov',
         facebook: null,
         twitter: null,
         youtube: null,
         image_url: null,
         photo_url: undefined,
         years_served: 18,
         current_term_start: '2019-01-03',
         current_term_end: '2025-01-03',
         biography: 'U.S. Senator from Ohio since 2007.',
         committees: ['Banking', 'Finance'],
         in_office: true,
         next_election: null,
         term_start: '2019-01-03',
         term_end: '2025-01-03',
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString()
       },
       {
         id: 'rep-oh-vance',
         bioguide_id: 'V000137',
         first_name: 'J.D.',
         last_name: 'Vance',
         middle_name: null,
         title: 'Sen.',
         party: 'R',
         state: 'OH',
         district: null,
         chamber: 'senate',
         office: 'B40D Dirksen Senate Office Building',
         phone: '202-224-3353',
         email: null,
         contact_form: null,
         website: 'https://www.vance.senate.gov',
         facebook: null,
         twitter: null,
         youtube: null,
         image_url: null,
         photo_url: undefined,
         years_served: 2,
         current_term_start: '2023-01-03',
         current_term_end: '2029-01-03',
         biography: 'U.S. Senator from Ohio since 2023.',
         committees: ['Commerce', 'Banking'],
         in_office: true,
         next_election: null,
         term_start: '2023-01-03',
         term_end: '2029-01-03',
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString()
       }
     ]
   };
   
   return fallbackData[stateAbbr] || [];
};

/**
 * Enhanced representative lookup using multiple sources
 */
export async function getRepresentativesWithAI(locationText: string): Promise<EnhancedRepresentative[]> {
  try {
    console.log('Analyzing location with AI:', locationText);
    
    // First, analyze the location
    const analyzedLocation = await analyzeLocationWithAI(locationText);
    if (!analyzedLocation || analyzedLocation.confidence < 0.5) {
      console.log('Location analysis failed or low confidence');
      return [];
    }

    console.log('Location analysis result:', analyzedLocation);

    // Always try AI first for dynamic location analysis

    // Try OpenAI first
    const openAIReps = await fetchCurrentRepresentatives(
      analyzedLocation.state,
      analyzedLocation.district
    );

    console.log('Fetched representatives from OpenAI:', openAIReps.length);
    
          if (openAIReps.length > 0) {
        return openAIReps;
      }

    // If OpenAI failed, try ProPublica API
    console.log('OpenAI failed, trying ProPublica API...');
    const apiReps = await fetchRepresentativesFromAPI(
      analyzedLocation.stateAbbr,
      analyzedLocation.district
    );

    console.log('Fetched representatives from API:', apiReps.length);
    
    if (apiReps.length > 0) {
      return apiReps;
    }

    // If both AI methods failed, try a broader AI search without district specificity
    if (analyzedLocation.district) {
      console.log('Trying broader state-level search without district specificity...');
      const broadReps = await fetchCurrentRepresentatives(analyzedLocation.state);
      if (broadReps.length > 0) {
        console.log('Found representatives with broader search:', broadReps.length);
        return broadReps;
      }
    }

    // As a last resort, use basic fallback data if available
    console.log('All AI methods failed, trying basic fallback data...');
    const fallbackReps = getFallbackRepresentatives(analyzedLocation);
    if (fallbackReps.length > 0) {
      console.log('Using fallback representatives:', fallbackReps.length);
      return fallbackReps;
    }

    // If everything failed, return empty array
    console.log('All methods failed to get representatives');
    return [];

  } catch (error) {
    console.error('Error in getRepresentativesWithAI:', error);
    return [];
  }
}

/**
 * Generate enhanced representative summary with AI insights
 */
export async function generateRepresentativeSummary(representative: EnhancedRepresentative): Promise<string> {
  try {
    const prompt = `
    Generate a brief, informative summary for this representative:
    
    Name: ${representative.title} ${representative.first_name} ${representative.last_name}
    Party: ${representative.party}
    State: ${representative.state}
    District: ${representative.district || 'Statewide (Senator)'}
    Years Served: ${representative.years_served}
    Committees: ${representative.committees?.join(', ') || 'Information not available'}
    
    Create a 2-3 sentence summary highlighting their role, experience, and key focus areas.
    Be factual, balanced, and informative.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a political information assistant. Provide factual, balanced summaries of elected officials."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 150
    });

    return response.choices[0]?.message?.content?.trim() || '';

  } catch (error) {
    console.error('Error generating representative summary:', error);
    return '';
  }
}

/**
 * Update database with AI-fetched representative data
 */
export async function updateRepresentativesWithAI(locationText: string): Promise<{
  success: boolean;
  representatives: EnhancedRepresentative[];
  error?: string;
}> {
  try {
    const representatives = await getRepresentativesWithAI(locationText);
    
    if (representatives.length === 0) {
      return {
        success: false,
        representatives: [],
        error: 'No representatives found for the specified location'
      };
    }

    // Here you could save to database if needed
    // For now, we'll return the enhanced data for immediate use
    
    return {
      success: true,
      representatives
    };

  } catch (error) {
    console.error('Error updating representatives with AI:', error);
    return {
      success: false,
      representatives: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 