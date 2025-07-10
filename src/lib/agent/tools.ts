// src/lib/agent/tools.ts
import { PersonaRow } from '@/lib/supabase'
import { TextChunk } from '../text-chunker'

/**
 * A client-side tool to fetch the AI analysis from our secure API endpoint.
 * This function now accepts an optional webContext array.
 */
export async function fetchAnalysisFromApi(
  billTitle: string,
  persona: PersonaRow,
  textChunks: TextChunk[],
  webContext?: string[]
): Promise<any> {
  console.log(`[AgentTool] Calling /api/analyze-bill with ${textChunks.length} chunks.`);
  if (webContext && webContext.length > 0) {
      console.log(`[AgentTool] Including ${webContext.length} pieces of web context.`);
  }

  const response = await fetch('/api/analyze-bill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      textChunks,
      billTitle,
      persona,
      webContext, // Pass the context to the API
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[AgentTool] API call failed:', errorData);
    throw new Error(errorData.details || 'Failed to get analysis from server.');
  }

  return response.json();
}

/**
 * A client-side tool to search the web for external context about a topic.
 * Calls our secure server-side /api/web-search endpoint.
 */
export async function searchWebForContext(query: string): Promise<string[]> {
  console.log(`[AgentTool] Searching web for: "${query}"`);
  const response = await fetch('/api/web-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    console.error('[AgentTool] Web search API call failed.');
    // Don't throw an error; just return empty context so analysis can continue
    return [];
  }

  const data = await response.json();
  return data.results || [];
}