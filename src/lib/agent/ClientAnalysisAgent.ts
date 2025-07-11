// src/lib/agent/ClientAnalysisAgent.ts
import { Tables } from '@/types/database'
import { PersonaRow } from '@/lib/supabase'
import { PersonalImpact } from '@/components/ui/enhanced-impact-card'
import { chunkTextByParagraph, TextChunk } from '../text-chunker'
import { fetchAnalysisFromApi, searchWebForContext } from './tools'
import {
    Briefcase,
    DollarSign,
    GraduationCap,
    HeartPulse,
    HelpCircle,
    LucideIcon,
    Users,
  } from 'lucide-react'

// Define the structure for status updates
export interface AgentStatus {
  step: number;
  message: string;
  isComplete: boolean;
  error?: string;
}

export type BillRow = Tables<'bills'>;
type StatusCallback = (status: AgentStatus) => void;

// Helper to map a category string to a Lucide icon component
const getIconForCategory = (category: string): LucideIcon => {
    switch (category.toLowerCase()) {
      case 'business':
      case 'small business':
        return Briefcase;
      case 'taxation':
      case 'financial':
        return DollarSign;
      case 'education':
        return GraduationCap;
      case 'healthcare':
      case 'health':
        return HeartPulse;
      case 'family':
        return Users;
      default:
        return HelpCircle;
    }
  };

export class ClientAnalysisAgent {
  private bill: BillRow;
  private persona: PersonaRow;
  private onStatusUpdate: StatusCallback;

  constructor(bill: BillRow, persona: PersonaRow, onStatusUpdate: StatusCallback) {
    this.bill = bill;
    this.persona = persona;
    this.onStatusUpdate = onStatusUpdate;
  }

  async analyze(): Promise<PersonalImpact[]> {
    try {
      // Step 1: Initialize
      this.onStatusUpdate({ step: 1, message: 'Initializing analysis...', isComplete: false });
      const billText = this.bill.text;
      if (!billText) {
        throw new Error('Bill text is not available.');
      }

      // Step 2: Chunk bill text
      this.onStatusUpdate({ step: 2, message: 'Breaking down bill text...', isComplete: false });
      const textChunks = chunkTextByParagraph(billText);
      if (textChunks.length === 0) {
        throw new Error('Bill text could not be processed.');
      }

      // Step 3: Search the web for context
      this.onStatusUpdate({ step: 3, message: 'Searching web for recent news and context...', isComplete: false });
      const webContext = await searchWebForContext(`News and analysis about the bill "${this.bill.title}"`);

      // Step 4: Call the main analysis API
      const statusMessage = webContext.length > 0 
        ? 'Sending bill text and web context to AI for analysis...'
        : 'Sending bill text to AI for analysis...';
      this.onStatusUpdate({ step: 4, message: statusMessage, isComplete: false });
      
      const result = await fetchAnalysisFromApi(this.bill.title || 'Untitled Bill', this.persona, textChunks, webContext);

      // Step 5: Format and complete
      this.onStatusUpdate({ step: 5, message: 'Formatting final report...', isComplete: false });
      const formattedImpacts = this.formatApiResponse(result.impacts, textChunks);

      this.onStatusUpdate({ step: 6, message: 'Analysis complete.', isComplete: true });
      return formattedImpacts;

    } catch (error: any) {
      console.error('[ClientAgent] Analysis failed:', error);
      this.onStatusUpdate({
        step: 0,
        message: 'An error occurred during analysis.',
        isComplete: true,
        error: error.message,
      });
      // Re-throw the error to be caught by the calling component
      throw error;
    }
  }

  private formatApiResponse(apiImpacts: any[], textChunks: TextChunk[]): PersonalImpact[] {
    if (!apiImpacts) return [];
    return apiImpacts.map((impact: any) => {
        const category = impact.category || 'General';
        return {
        // --- Fields from API ---
        title: impact.title || 'Untitled Impact',
        description: impact.description || '',
        details: impact.details || [],
        severity: impact.severity || 'low',
        category: category,
        impact: impact.impact || 'neutral',
        icon: getIconForCategory(category), // Use the helper function here

        // --- Derived/Legacy fields ---
        summary: impact.description, // Re-using description for summary
        explanation: Array.isArray(impact.details) ? impact.details.join('\n') : '',

        // --- Source mapping ---
        source: {
            text: textChunks.find(c => c.id === impact.source_chunk_id)?.content || 'Source text not found.',
            sectionTitle: 'Referenced from the bill text',
        },
        };
    });
  }
}