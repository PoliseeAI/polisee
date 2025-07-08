'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, ExternalLink, User, MapPin, Calendar, Sparkles, Clock, Globe2 } from 'lucide-react';
import { 
  Representative, 
  ContactMessage, 
  PersonalizedMessage,
  getRepresentativesByLocation,
  getContactMessageTemplates,
  generatePersonalizedMessage,
  recordRepresentativeContact,
  initializeRepresentativesData
} from '@/lib/representatives';
import { EnhancedRepresentative } from '@/lib/openai-representatives';

interface RepresentativeContactProps {
  sentiment: 'support' | 'oppose';
  billId: string;
  billTitle: string;
  personaData: any;
  onMessageSent?: (representative: Representative, message: PersonalizedMessage) => void;
}

export default function RepresentativeContact({ 
  sentiment, 
  billId, 
  billTitle, 
  personaData, 
  onMessageSent 
}: RepresentativeContactProps) {
  // Generate unique component ID for debugging
  const componentId = useRef(Math.random().toString(36).substr(2, 9));
  const router = useRouter();
  
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [enhancedRepresentatives, setEnhancedRepresentatives] = useState<EnhancedRepresentative[]>([]);
  const [contactTemplates, setContactTemplates] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);
  const [expandedRep, setExpandedRep] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [useAI, setUseAI] = useState(false);
  const [repSummaries, setRepSummaries] = useState<Record<string, string>>({});
  const [forceRender, setForceRender] = useState(0);

  console.log(`🏷️ RepresentativeContact component [${componentId.current}] rendered`);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Initialize data first
        await initializeRepresentativesData();
        
        // Load representatives and templates
        const [reps, templates] = await Promise.all([
          getRepresentativesByLocation(personaData.location),
          getContactMessageTemplates()
        ]);
        
        setRepresentatives(reps);
        setContactTemplates(templates);
      } catch (error) {
        console.error('Error loading representative data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [personaData.location]);

  // Monitor enhanced representatives state changes
  useEffect(() => {
    console.log(`[${componentId.current}] Enhanced representatives state changed:`, {
      count: enhancedRepresentatives.length,
      useAI,
      representatives: enhancedRepresentatives.map(rep => ({
        name: `${rep.first_name} ${rep.last_name}`,
        bioguide_id: rep.bioguide_id
      }))
    });
  }, [enhancedRepresentatives, useAI]);

  // Track component lifecycle
  useEffect(() => {
    console.log(`[${componentId.current}] 🔄 Component MOUNTED`);
    return () => {
      console.log(`[${componentId.current}] 🗑️ Component UNMOUNTING`);
    };
  }, []);

  // Track persona data changes
  useEffect(() => {
    console.log(`[${componentId.current}] 📍 Persona data changed:`, {
      location: personaData.location,
      age: personaData.age,
      occupation: personaData.occupation
    });
  }, [personaData]);

  const loadAIRepresentatives = async () => {
    setLoadingAI(true);
    try {
      console.log(`[${componentId.current}] Starting AI representatives request...`);
      console.log(`[${componentId.current}] Persona data:`, personaData);
      console.log(`[${componentId.current}] Location being sent:`, personaData.location);
      
      // Create AbortController for timeout control
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch('/api/representatives-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location: personaData.location }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('AI representatives response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Server error: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
      }

      const data = await response.json();
      console.log('AI representatives data:', data);
      
      if (data.success) {
        setEnhancedRepresentatives(data.representatives);
        
        // Set summaries from server response
        const summaries: Record<string, string> = {};
        for (const rep of data.representatives) {
          summaries[rep.bioguide_id] = rep.summary || '';
        }
        setRepSummaries(summaries);
        
        if (data.representatives.length === 0) {
          console.log('No representatives found - this is normal, not an error');
          // Don't show alert for empty results - this is expected sometimes
        } else {
          console.log(`[${componentId.current}] Successfully loaded`, data.representatives.length, 'AI representatives');
          console.log(`[${componentId.current}] Enhanced representatives state updated:`, data.representatives);
          console.log(`[${componentId.current}] Rep summaries updated:`, summaries);
          
          // Alert to confirm data was loaded
          alert(`✅ Successfully loaded ${data.representatives.length} representatives:\n${data.representatives.map((rep: any) => `• ${rep.first_name} ${rep.last_name} (${rep.party})`).join('\n')}`);
          
          // Force a re-render to ensure UI updates
          setTimeout(() => {
            console.log(`[${componentId.current}] 🔄 Forcing component re-render...`);
            setForceRender(prev => prev + 1);
          }, 100);
        }
      } else {
        // Handle API errors that still return success: false
        console.error('API returned error:', data.error);
        
        // Don't throw error for "no representatives found" - treat as empty result
        if (data.error && data.error.includes('No representatives found')) {
          console.log('No representatives found - treating as empty result');
          setEnhancedRepresentatives([]);
          setRepSummaries({});
        } else {
          throw new Error(data.error || 'Failed to load representatives');
        }
      }
    } catch (error) {
      console.error('Error loading AI representatives:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        alert('Request timed out. The AI analysis is taking longer than expected. Please try again.');
      } else {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        alert(`Error loading current representatives: ${message}. Please try again.`);
      }
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSendMessage = async (representative: Representative | EnhancedRepresentative, template: ContactMessage) => {
    const repKey = 'bioguide_id' in representative ? representative.bioguide_id : (representative as Representative).id;
    setSendingMessage(repKey);
    
    try {
      const personalizedMessage = generatePersonalizedMessage(
        representative,
        template,
        sentiment,
        billTitle,
        personaData
      );

      // Record the contact in the database
      await recordRepresentativeContact(
        null, // userId - assuming no auth for now
        null, // sessionId - assuming no session for now
        repKey,
        billId,
        template.id,
        sentiment,
        customMessage || undefined
      );

      // Open email client or show message
      if (personalizedMessage.contactMethod === 'email' && representative.email) {
        const emailUrl = `mailto:${representative.email}?subject=${encodeURIComponent(personalizedMessage.subject)}&body=${encodeURIComponent(personalizedMessage.message)}`;
        window.open(emailUrl, '_blank');
      } else if (personalizedMessage.contactMethod === 'form' && representative.contact_form) {
        window.open(representative.contact_form, '_blank');
      } else {
        // Show the message for copying
        alert(`Here's your message to copy:\n\nSubject: ${personalizedMessage.subject}\n\nMessage:\n${personalizedMessage.message}`);
      }

      if (onMessageSent) {
        onMessageSent(representative, personalizedMessage);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
    } finally {
      setSendingMessage(null);
    }
  };

  const getPartyColor = (party: string) => {
    switch (party) {
      case 'D': return 'bg-blue-100 text-blue-800';
      case 'R': return 'bg-red-100 text-red-800';
      case 'I': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPartyName = (party: string) => {
    switch (party) {
      case 'D': return 'Democratic';
      case 'R': return 'Republican';
      case 'I': return 'Independent';
      default: return party;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  const currentRepresentatives = useAI ? enhancedRepresentatives : representatives;

  // Debug logging
  console.log('Render state:', {
    componentId: componentId.current,
    useAI,
    representativesCount: representatives.length,
    enhancedRepresentativesCount: enhancedRepresentatives.length,
    currentRepresentativesCount: currentRepresentatives.length,
    loadingAI
  });

  if (!useAI && representatives.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact Your Representatives
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              No representatives found for your location in our database. Try using AI to get current representatives:
            </p>
            <Button 
              onClick={() => router.push('/representatives')}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Get Current Representatives with AI
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show message when AI mode is active but no representatives found
  if (useAI && enhancedRepresentatives.length === 0 && !loadingAI) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact Your Representatives
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI-Powered
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              The AI couldn't find current representatives for your location "{personaData.location}". This can happen if:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• The location format needs adjustment</li>
              <li>• The AI service is temporarily unavailable</li>
              <li>• The location is outside the US</li>
            </ul>
            <div className="flex gap-2">
              <Button 
                onClick={() => router.push('/representatives')}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Get Current Representatives with AI
              </Button>
              {representatives.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setUseAI(false)}
                  className="flex items-center gap-2"
                >
                  Use Database Instead
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find the appropriate template based on bill type and sentiment
  const relevantTemplate = contactTemplates.find(t => 
    t.category === 'economic' && t.title.toLowerCase().includes(sentiment)
  ) || contactTemplates.find(t => 
    t.title.toLowerCase().includes(sentiment)
  ) || contactTemplates[0];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Your Representatives
            {useAI && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI-Powered
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Based on your location: {personaData.location}
            </p>
            <div className="flex items-center gap-2">
              {representatives.length > 0 && (
                <Button
                  variant={useAI ? "outline" : "default"}
                  size="sm"
                  onClick={() => setUseAI(false)}
                >
                  Database
                </Button>
              )}
              <Button
                variant={useAI ? "default" : "outline"}
                size="sm"
                onClick={async () => {
                  // Always load AI representatives when this button is clicked
                  console.log(`[${componentId.current}] 🚀 AI Current button clicked!`);
                  if (!loadingAI) {
                    console.log(`[${componentId.current}] 🔄 Setting AI mode and clearing existing data...`);
                    setUseAI(true); // Set AI mode first
                    // Clear existing data to show loading state
                    setEnhancedRepresentatives([]);
                    setRepSummaries({});
                    console.log(`[${componentId.current}] 📡 Starting AI representatives request...`);
                    await loadAIRepresentatives(); // Then load the data
                    console.log(`[${componentId.current}] ✅ AI representatives request completed!`);
                  }
                }}
                disabled={loadingAI}
                className="flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" />
                {loadingAI ? 'Analyzing with AI... (may take 30-60s)' : 'AI Current'}
              </Button>
              
              {/* Debug test button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log(`[${componentId.current}] 🧪 TEST: Current state:`, {
                    useAI,
                    enhancedRepsLength: enhancedRepresentatives.length,
                    enhancedRepsData: enhancedRepresentatives,
                    currentRepsLength: currentRepresentatives.length,
                    currentRepsData: currentRepresentatives
                  });
                  alert(`TEST STATE:\nuseAI: ${useAI}\nenhancedReps: ${enhancedRepresentatives.length}\ncurrentReps: ${currentRepresentatives.length}\n\nCheck console for full data.`);
                }}
                className="text-xs"
              >
                🧪 Test State
              </Button>
              
              {/* Manual override button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log(`[${componentId.current}] 🔧 Manual override: Setting fake data...`);
                  setUseAI(true);
                  setEnhancedRepresentatives([
                    {
                      id: 'test-1',
                      bioguide_id: 'TEST001',
                      first_name: 'Test',
                      last_name: 'Representative',
                      middle_name: null,
                      title: 'Sen.',
                      party: 'D',
                      state: 'CO',
                      district: null,
                      chamber: 'senate',
                      office: 'Test Office',
                      phone: '555-0123',
                      email: null,
                      contact_form: null,
                      website: 'https://test.gov',
                      facebook: null,
                      twitter: null,
                      youtube: null,
                      image_url: null,
                      photo_url: undefined,
                      years_served: 5,
                      current_term_start: '2021-01-03',
                      current_term_end: '2027-01-03',
                      biography: 'This is a test representative.',
                      committees: ['Test Committee'],
                      in_office: true,
                      next_election: null,
                      term_start: '2021-01-03',
                      term_end: '2027-01-03',
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    }
                  ] as EnhancedRepresentative[]);
                  console.log(`[${componentId.current}] 🔧 Manual override complete!`);
                }}
                className="text-xs"
              >
                🔧 Force Test
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Debug info */}
            {useAI && (
              <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
                Debug: useAI={useAI.toString()}, enhancedReps={enhancedRepresentatives.length}, currentReps={currentRepresentatives.length}, loadingAI={loadingAI.toString()}
                
                {/* Raw data display */}
                {enhancedRepresentatives.length > 0 && (
                  <div className="mt-2 p-2 bg-white rounded text-xs">
                    <strong>Raw Enhanced Reps Data:</strong>
                    <pre className="mt-1 text-xs overflow-auto max-h-32">
                      {JSON.stringify(enhancedRepresentatives.map(rep => ({
                        name: `${rep.first_name} ${rep.last_name}`,
                        party: rep.party,
                        state: rep.state,
                        bioguide_id: rep.bioguide_id
                      })), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
            
            {currentRepresentatives.length === 0 && useAI && !loadingAI && (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">🤔 AI mode is active but no representatives are showing.</p>
                <p className="text-sm text-gray-500">This might be a state management issue. Check the browser console for logs.</p>
                <Button 
                  onClick={async () => {
                    console.log('🔄 Retry button clicked, forcing reload...');
                    setEnhancedRepresentatives([]);
                    setRepSummaries({});
                    await loadAIRepresentatives();
                  }}
                  className="mt-2"
                >
                  🔄 Retry Loading AI Representatives
                </Button>
              </div>
            )}
            
            {currentRepresentatives.map((rep) => {
              const repKey = 'bioguide_id' in rep ? rep.bioguide_id : (rep as Representative).id;
              const isEnhanced = 'years_served' in rep;
              
              return (
                <Card key={repKey} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      {/* Photo for AI-enhanced representatives */}
                      {isEnhanced && (rep as EnhancedRepresentative).photo_url && (
                        <div className="flex-shrink-0">
                          <img
                            src={(rep as EnhancedRepresentative).photo_url}
                            alt={`${rep.first_name} ${rep.last_name}`}
                            className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="flex-grow">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">
                                {rep.title} {rep.first_name} {rep.last_name}
                              </h3>
                              <Badge className={getPartyColor(rep.party)}>
                                {getPartyName(rep.party)}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {rep.state}
                                {rep.district && ` District ${rep.district}`}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {rep.chamber === 'senate' ? 'Senator' : 'Representative'}
                              </div>
                              {isEnhanced && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {(rep as EnhancedRepresentative).years_served} years served
                                </div>
                              )}
                            </div>
                            
                            {/* AI-generated summary */}
                            {isEnhanced && repSummaries[repKey] && (
                              <p className="text-sm text-gray-700 mt-2 italic">
                                {repSummaries[repKey]}
                              </p>
                            )}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedRep(expandedRep === repKey ? null : repKey)}
                          >
                            {expandedRep === repKey ? 'Less Info' : 'More Info'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                
                {expandedRep === repKey && (
                  <CardContent className="pt-0">
                    <div className="space-y-3 text-sm">
                      {rep.office && (
                        <div>
                          <strong>Office:</strong> {rep.office}
                        </div>
                      )}
                      
                      {/* Enhanced AI information */}
                      {isEnhanced && (
                        <div className="space-y-2">
                          {(rep as EnhancedRepresentative).biography && (
                            <div>
                              <strong>Biography:</strong> {(rep as EnhancedRepresentative).biography}
                            </div>
                          )}
                          
                          {(rep as EnhancedRepresentative).committees && (rep as EnhancedRepresentative).committees!.length > 0 && (
                            <div>
                              <strong>Key Committees:</strong> {(rep as EnhancedRepresentative).committees!.join(', ')}
                            </div>
                          )}
                          
                          {(rep as EnhancedRepresentative).current_term_start && (rep as EnhancedRepresentative).current_term_end && (
                            <div>
                              <strong>Current Term:</strong> {new Date((rep as EnhancedRepresentative).current_term_start).getFullYear()} - {new Date((rep as EnhancedRepresentative).current_term_end).getFullYear()}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2">
                        {rep.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`tel:${rep.phone}`, '_blank')}
                          >
                            <Phone className="h-4 w-4 mr-1" />
                            Call
                          </Button>
                        )}
                        {rep.website && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(rep.website!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Website
                          </Button>
                        )}
                      </div>
                      
                      {!isEnhanced && rep.term_start && rep.term_end && (
                        <div>
                          <strong>Term:</strong> {new Date(rep.term_start).getFullYear()} - {new Date(rep.term_end).getFullYear()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
                
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">
                        {sentiment === 'support' ? 'Support' : 'Oppose'} {billTitle}
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Send a pre-written message expressing your {sentiment} for this legislation:
                      </p>
                      
                      {relevantTemplate && (
                        <div className="space-y-3">
                          <div className="text-sm">
                            <strong>Subject:</strong> {relevantTemplate.subject.replace('{bill_title}', billTitle)}
                          </div>
                          
                          <div className="text-sm">
                            <strong>Message Preview:</strong>
                            <div className="mt-1 p-2 bg-white rounded border text-xs max-h-20 overflow-y-auto">
                              {generatePersonalizedMessage(
                                rep,
                                relevantTemplate,
                                sentiment,
                                billTitle,
                                personaData
                              ).message.substring(0, 200)}...
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Add your personal message (optional):
                            </label>
                            <Textarea
                              value={customMessage}
                              onChange={(e) => setCustomMessage(e.target.value)}
                              placeholder="Add any additional personal thoughts..."
                              className="h-20"
                            />
                          </div>
                          
                          <Button
                            onClick={() => handleSendMessage(rep as Representative, relevantTemplate)}
                            disabled={sendingMessage === repKey}
                            className="w-full"
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            {sendingMessage === repKey ? 'Sending...' : 'Send Message'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 