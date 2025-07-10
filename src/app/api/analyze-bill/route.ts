// src/app/api/analyze-bill/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PersonaRow } from '@/lib/supabase'
import { TextChunk } from '@/lib/text-chunker'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface AIImpact {
  category: string;
  impact: 'positive' | 'negative' | 'neutral';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  details: string[];
  relevance_score: number;
  source_chunk_id?: string;
}

interface AIAnalysisResponse {
  impacts: AIImpact[];
}

function cleanJsonResponse(content: string): string {
  // Remove markdown code blocks if present
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = content.match(codeBlockRegex);
  
  if (match) {
    return match[1].trim();
  }
  
  // If no code blocks found, return the content as-is
  return content.trim();
}

async function callOpenAI(prompt: string): Promise<any> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: 'You are an expert policy analyst who explains complex legislation in simple, personal terms. Always respond with valid JSON only, without markdown formatting.' }, { role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API Error:', { status: response.status, error: errorText });
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in AI response');
  }
  
  // Clean the JSON response before parsing
  const cleanedContent = cleanJsonResponse(content);
  
  try {
    return JSON.parse(cleanedContent);
  } catch (parseError) {
    console.error('JSON Parse Error:', parseError);
    console.error('Raw content:', content);
    console.error('Cleaned content:', cleanedContent);
    throw new Error(`Failed to parse JSON response: ${parseError}`);
  }
}

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  try {
    // UPDATED: Accept 'webContext' from the request body
    const { textChunks, billTitle, persona, webContext } = await request.json();

    if (!textChunks || textChunks.length === 0 || !billTitle || !persona) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`Starting two-step analysis for "${billTitle}" with ${textChunks.length} chunks.`);
    if (webContext && webContext.length > 0) {
      console.log(`Using ${webContext.length} pieces of web context.`);
    }

    // Step 1: Map - Analyze the bill in sections
    const CHUNK_GROUP_SIZE = 100;
    const chunkGroups: TextChunk[][] = [];
    for (let i = 0; i < textChunks.length; i += CHUNK_GROUP_SIZE) {
      chunkGroups.push(textChunks.slice(i, i + CHUNK_GROUP_SIZE));
    }

    const personaSummary = createPersonaSummary(persona);
    const mapPromises = chunkGroups.map((group, index) => {
      console.log(`Analyzing section ${index + 1} of ${chunkGroups.length}...`);
      const mapPrompt = createMapPrompt(group, billTitle, personaSummary);
      return callOpenAI(mapPrompt);
    });

    const mapResults = await Promise.all(mapPromises);
    const allPotentialImpacts = mapResults.flatMap(result => result.potential_impacts || []);

    console.log(`Found ${allPotentialImpacts.length} potential impacts across all sections.`);

    if (allPotentialImpacts.length === 0) {
      return NextResponse.json({ impacts: [] });
    }

    // Step 2: Reduce - Synthesize the final report
    console.log('Synthesizing final report...');
    // UPDATED: Pass webContext to the prompt creator
    const reducePrompt = createReducePrompt(allPotentialImpacts, personaSummary, webContext);
    const finalResult: AIAnalysisResponse = await callOpenAI(reducePrompt);

    console.log(`Analysis complete. Final report has ${finalResult.impacts.length} impacts.`);
    return NextResponse.json(finalResult);

  } catch (error: any) {
    console.error('Error in analyze-bill API:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

function createPersonaSummary(persona: PersonaRow): string {
    return `
  - Age: ${persona.age}, Location: ${persona.location}, Occupation: ${persona.occupation}
  - Income: ${persona.income_bracket}, Dependents: ${persona.dependents}
  - Health: ${persona.has_health_insurance ? 'Insured' : 'Uninsured'}, ${persona.has_medicare ? 'Medicare' : 'No Medicare'}
  - Business: ${persona.business_type || 'None'}`;
}

function createMapPrompt(chunks: TextChunk[], billTitle: string, personaSummary: string): string {
  const formattedChunks = chunks.map(c => `--- Chunk ID: ${c.id} ---\n${c.content}`).join('\n\n');
  return `
You are a policy research assistant. Your task is to read a section of a bill and identify ANY potential ways it might impact a user based on their profile.

BILL TITLE: ${billTitle}
USER PROFILE: ${personaSummary}
BILL SECTION TEXT:
${formattedChunks}

TASK: Identify all potential impacts in this section. For each, describe it and cite the source chunk ID.

Return ONLY valid JSON in this format:
{
  "potential_impacts": [
    {
      "description": "A brief summary of the potential impact.",
      "source_chunk_id": "p-123" 
    }
  ]
}
`;
}

// UPDATED: Function now accepts an optional webContext array
function createReducePrompt(potentialImpacts: any[], personaSummary: string, webContext?: string[]): string {
  const formattedImpacts = potentialImpacts.map(impact => 
    `- (Source: ${impact.source_chunk_id}): ${impact.description}`
  ).join('\n');

  // Conditionally add the web context to the prompt if it exists
  const webContextSection = webContext && webContext.length > 0
    ? `
ADDITIONAL WEB CONTEXT:
Here is some recent news and analysis from the web. Use this to inform your analysis, especially regarding public opinion or recent developments.
- ${webContext.join('\n- ')}
`
    : '';

  return `
You are an expert policy analyst. You have a list of potential impacts identified from a large bill by your research assistants. Your job is to synthesize these raw notes into a final, polished report for the user.${webContextSection}

USER PROFILE: ${personaSummary}
POTENTIAL IMPACTS LIST:
${formattedImpacts}

TASK: Synthesize the list into 1-4 specific, personalized impacts. Consolidate duplicates and rank by importance.

IMPORTANT GUIDELINES:
1.  Focus on the most direct and significant impacts for this user.
2.  Combine related notes into a single, coherent impact.
3.  Use clear, non-technical language.
4.  For each final impact, select the BEST source chunk ID from the list.

For each impact, provide:
- category: (Education, Healthcare, Business, etc.)
- impact: (positive, negative, or neutral)
- severity: (low, medium, high)
- title: Brief, clear title (max 60 chars)
- description: One sentence explaining why this affects the user (max 120 chars)
- details: 3-4 bullet points with specific effects.
- relevance_score: 1-10 of relevance to the user.
- source_chunk_id: The single best source chunk ID from the list.

Return ONLY valid JSON in this format:
{
  "impacts": [
    {
      "category": "Taxation",
      "impact": "positive",
      "severity": "medium",
      "title": "New Tax Deduction for Small Businesses",
      "description": "As a small business owner, you may be eligible for a new tax deduction.",
      "details": [
        "A new deduction for businesses with under 50 employees.",
        "Potentially lowers your annual tax liability.",
        "Effective for the next fiscal year."
      ],
      "relevance_score": 8,
      "source_chunk_id": "p-45"
    }
  ]
}
`;
}