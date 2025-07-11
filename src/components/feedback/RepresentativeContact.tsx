'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Mail, ExternalLink, MapPin, User, Building, Calendar, Globe, Loader2, Search, AlertCircle, Sparkles, Clock } from 'lucide-react';
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

interface PersonaData {
  location: string
  age: number
  occupation: string
  income_bracket: string
  dependents: number
  business_type?: string | null
}

interface RepresentativeContactProps {
  sentiment: 'support' | 'oppose'
  billId: string
  billTitle: string
  personaData: PersonaData
  onMessageSent?: (representative: Representative, message: string) => void
}

interface GeneratedMessage {
  id: string;
  message: string;
  subject: string;
  representative: Representative | EnhancedRepresentative;
  sentiment: 'support' | 'oppose';
  signatures: string[];
  isSignedByUser: boolean;
  created_at: string;
}

export default function RepresentativeContact({
  sentiment,
  billId,
  billTitle,
  personaData,
  onMessageSent
}: RepresentativeContactProps) {
  const [location, setLocation] = useState(personaData.location || '')
  const [representatives, setRepresentatives] = useState<Representative[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedRep, setExpandedRep] = useState<string | null>(null)
  const [selectedRepresentative, setSelectedRepresentative] = useState<Representative | null>(null)
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [generatingMessage, setGeneratingMessage] = useState(false)
  const [showMessageForm, setShowMessageForm] = useState(false)
  
  // Add back essential missing state variables
  const [useAI, setUseAI] = useState(false)
  const [enhancedRepresentatives, setEnhancedRepresentatives] = useState<any[]>([])
  const [loadingAI, setLoadingAI] = useState(false)
  const [repSummaries, setRepSummaries] = useState<Record<string, string>>({})
  const [selectedRepresentatives, setSelectedRepresentatives] = useState<Set<string>>(new Set())
  const [generatedMessages, setGeneratedMessages] = useState<GeneratedMessage[]>([])
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false)
  const [showSigningModal, setShowSigningModal] = useState<GeneratedMessage | null>(null)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [contactTemplates, setContactTemplates] = useState<any[]>([])
  const [forceRender, setForceRender] = useState(0)
  const [sendingMessage, setSendingMessage] = useState<string | null>(null)
  const [customMessage, setCustomMessage] = useState('')
  
  const componentId = useRef(`rep-contact-${Date.now()}`)
  const router = useRouter()

  // Initialize location from persona data
  useEffect(() => {
    if (personaData.location && !location) {
      setLocation(personaData.location)
    }
  }, [personaData.location, location])

  // Auto cleanup component when unmounted
  useEffect(() => {
    return () => {
      console.log(`Cleaning up component ${componentId.current}`)
    }
  }, [])

  // Monitor enhanced representatives state changes
  useEffect(() => {
    console.log(`[${componentId.current}] 🔄 Enhanced representatives updated:`, {
      representatives: []
    });
  }, []);

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
        setUseAI(true); // Make sure to set useAI to true
        
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

  const handleRepresentativeSelection = (repKey: string, isSelected: boolean) => {
    setSelectedRepresentatives(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(repKey);
      } else {
        newSet.delete(repKey);
      }
      return newSet;
    });
  };

  const generateAIMessageForRepresentative = async (representative: Representative | EnhancedRepresentative) => {
    setIsGeneratingMessage(true);
    
    try {
      console.log(`Generating message for ${representative.first_name} ${representative.last_name}...`);
      
      const response = await fetch('/api/generate-representative-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          representative,
          sentiment,
          billId,
          billTitle,
          personaData
        }),
      });

      if (!response.ok) {
        console.error(`Failed to generate message for ${representative.first_name} ${representative.last_name}:`, response.status);
        throw new Error(`Failed to generate message for ${representative.first_name} ${representative.last_name}`);
      }

      const data = await response.json();
      console.log(`Response for ${representative.first_name} ${representative.last_name}:`, data);
      
      if (data.success && data.message && data.subject) {
        const newMessage = {
          id: `${representative.bioguide_id || (representative as Representative).id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          message: data.message,
          subject: data.subject,
          representative,
          sentiment,
          signatures: [],
          isSignedByUser: false,
          created_at: new Date().toISOString()
        };
        
        setGeneratedMessages(prev => [...prev, newMessage]);
        console.log(`Successfully created message for ${representative.first_name} ${representative.last_name}`);
      } else {
        console.error(`Invalid response data for ${representative.first_name} ${representative.last_name}:`, data);
        throw new Error(`Invalid response data for ${representative.first_name} ${representative.last_name}`);
      }
    } catch (error) {
      console.error('Error generating AI message:', error);
      alert(`Error generating AI message for ${representative.first_name} ${representative.last_name}. Please try again.`);
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const generateAIMessageForRepresentativeWithSentiment = async (representative: Representative | EnhancedRepresentative, messageSentiment: 'support' | 'oppose') => {
    setIsGeneratingMessage(true);
    
    try {
      console.log(`Generating ${messageSentiment} message for ${representative.first_name} ${representative.last_name}...`);
      
      const response = await fetch('/api/generate-representative-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          representative,
          sentiment: messageSentiment,
          billId,
          billTitle,
          personaData
        }),
      });

      if (!response.ok) {
        console.error(`Failed to generate ${messageSentiment} message for ${representative.first_name} ${representative.last_name}:`, response.status);
        throw new Error(`Failed to generate ${messageSentiment} message for ${representative.first_name} ${representative.last_name}`);
      }

      const data = await response.json();
      console.log(`Response for ${representative.first_name} ${representative.last_name}:`, data);
      
      if (data.success && data.message && data.subject) {
        const newMessage = {
          id: `${representative.bioguide_id || (representative as Representative).id}-${messageSentiment}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          message: data.message,
          subject: data.subject,
          representative,
          sentiment: messageSentiment,
          signatures: [],
          isSignedByUser: false,
          created_at: new Date().toISOString()
        };
        
        setGeneratedMessages(prev => [...prev, newMessage]);
        console.log(`Successfully created ${messageSentiment} message for ${representative.first_name} ${representative.last_name}`);
      } else {
        console.error(`Invalid response data for ${representative.first_name} ${representative.last_name}:`, data);
        throw new Error(`Invalid response data for ${representative.first_name} ${representative.last_name}`);
      }
    } catch (error) {
      console.error('Error generating AI message:', error);
      alert(`Error generating ${messageSentiment} message for ${representative.first_name} ${representative.last_name}. Please try again.`);
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const generateAIMessage = async () => {
    setIsGeneratingMessage(true);
    
    try {
      // First, try to load representatives using the same logic as the representatives page
      let targetRepresentatives = currentRepresentatives.length > 0 ? currentRepresentatives : representatives;
      
      if (targetRepresentatives.length === 0) {
        console.log('No representatives found, loading from AI...');
        
        // Use the same representative loading logic as the representatives page
        const repResponse = await fetch('/api/representatives-ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ location: personaData.location }),
        });

        if (repResponse.ok) {
          const repData = await repResponse.json();
          if (repData.success && repData.representatives && repData.representatives.length > 0) {
            targetRepresentatives = repData.representatives;
            setEnhancedRepresentatives(repData.representatives);
            setUseAI(true);
            console.log('Successfully loaded representatives from AI:', repData.representatives.length);
          }
        }
      }
      
      // If still no representatives, create mock ones for testing
      if (targetRepresentatives.length === 0) {
        console.log('No representatives available, using mock representatives for testing');
        targetRepresentatives = [
          {
            id: 'mock-rep-1',
            bioguide_id: 'MOCK001',
            first_name: 'John',
            last_name: 'Smith',
            middle_name: null,
            title: 'Sen.',
            party: 'D',
            state: 'CO',
            district: null,
            chamber: 'senate',
            office: 'Denver Office',
            phone: '555-0123',
            email: 'john.smith@senate.gov',
            contact_form: 'https://example.com/contact',
            website: 'https://example.com',
            facebook: null,
            twitter: null,
            youtube: null,
            image_url: null,
            in_office: true,
            next_election: null,
            term_start: '2021-01-03',
            term_end: '2027-01-03',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'mock-rep-2',
            bioguide_id: 'MOCK002',
            first_name: 'Jane',
            last_name: 'Johnson',
            middle_name: null,
            title: 'Rep.',
            party: 'R',
            state: 'CO',
            district: '1',
            chamber: 'house',
            office: 'Denver Office',
            phone: '555-0124',
            email: 'jane.johnson@house.gov',
            contact_form: 'https://example.com/contact',
            website: 'https://example.com',
            facebook: null,
            twitter: null,
            youtube: null,
            image_url: null,
            in_office: true,
            next_election: null,
            term_start: '2023-01-03',
            term_end: '2025-01-03',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
      }

      // Filter to only generate messages for selected representatives
      const selectedReps = targetRepresentatives.filter(rep => {
        const repKey = 'bioguide_id' in rep ? rep.bioguide_id : (rep as Representative).id;
        return selectedRepresentatives.has(repKey);
      });

      if (selectedReps.length === 0) {
        alert('Please select at least one representative to generate AI messages for.');
        return;
      }

      // Generate AI message for each selected representative
      const messages: GeneratedMessage[] = [];
      
      console.log('Generating AI messages for', selectedReps.length, 'selected representatives');
      
      for (const rep of selectedReps) {
        console.log(`Generating message for ${rep.first_name} ${rep.last_name}...`);
        
        const response = await fetch('/api/generate-representative-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            representative: rep,
            sentiment,
            billId,
            billTitle,
            personaData
          }),
        });

        if (!response.ok) {
          console.error(`Failed to generate message for ${rep.first_name} ${rep.last_name}:`, response.status);
          continue; // Skip this representative but continue with others
        }

        const data = await response.json();
        console.log(`Response for ${rep.first_name} ${rep.last_name}:`, data);
        
        if (data.success && data.message && data.subject) {
          const newMessage = {
            id: `${rep.bioguide_id || rep.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            message: data.message,
            subject: data.subject,
            representative: rep,
            sentiment,
            signatures: [],
            isSignedByUser: false,
            created_at: new Date().toISOString()
          };
          
          messages.push(newMessage);
          console.log(`Successfully created message for ${rep.first_name} ${rep.last_name}`);
        } else {
          console.error(`Invalid response data for ${rep.first_name} ${rep.last_name}:`, data);
        }
      }

      console.log('Generated messages:', messages.length);
      setGeneratedMessages(messages);
      
      if (messages.length > 0) {
        console.log('✅ Successfully generated', messages.length, 'AI messages!');
      } else {
        console.error('❌ No messages were generated');
        alert('No AI messages were generated. Please check the console for details and try again.');
      }
    } catch (error) {
      console.error('Error generating AI message:', error);
      alert('Error generating AI message. Please try again.');
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleSignMessage = (message: GeneratedMessage) => {
    setShowSigningModal(message);
  };

  const submitSignature = async () => {
    if (!showSigningModal || !userName.trim()) {
      alert('Please enter your name to sign the message');
      return;
    }

    try {
      // Send the formal letter directly via email (same as community letters)
      const emailResponse = await fetch('/api/send-representative-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: showSigningModal.id,
          representative: showSigningModal.representative,
          subject: showSigningModal.subject,
          messageContent: showSigningModal.message,
          signatures: [userName.trim()],
          senderName: userName.trim(),
          senderEmail: userEmail.trim() || '',
          sendFormalEmail: true // Flag to send formal email to benny.yang@gauntletai.com
        }),
      });

      if (!emailResponse.ok) {
        throw new Error('Failed to send message');
      }

      const emailData = await emailResponse.json();
      
      if (emailData.success) {
        // Update the message with signature and mark as sent
        setGeneratedMessages(prev => 
          prev.map(msg => 
            msg.id === showSigningModal.id 
              ? { 
                  ...msg, 
                  signatures: [...msg.signatures, userName.trim()],
                  isSignedByUser: true
                }
              : msg
          )
        );
        
        setShowSigningModal(null);
        setUserName('');
        setUserEmail('');
        
        alert('✅ Message signed and sent successfully! A formal letter has been sent to your representative.');
      }
    } catch (error) {
      console.error('Error signing message:', error);
      alert('Error signing message. Please try again.');
    }
  };

  const sendMessage = async (message: GeneratedMessage) => {
    try {
      const response = await fetch('/api/send-representative-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: message.id,
          representative: message.representative,
          subject: message.subject,
          messageContent: message.message,
          signatures: message.signatures
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      if (data.success) {
        alert('✅ Message sent successfully to your representative!');
        
        // Remove the message from the list since it's been sent
        setGeneratedMessages(prev => prev.filter(msg => msg.id !== message.id));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
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
        onMessageSent(representative, personalizedMessage.message);
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

  if (!useAI && representatives.length === 0 && enhancedRepresentatives.length === 0) {
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
              Based on your sentiment feedback, send a personalized message to your representatives about how you feel about this legislation.
            </p>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2">
                  If you {sentiment === 'support' ? 'Support' : 'Oppose'} this bill:
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  We'll find your representatives for your location: <strong>{personaData.location}</strong>
                </p>
                <Button 
                  onClick={loadAIRepresentatives}
                  disabled={loadingAI}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {loadingAI ? 'Finding Representatives...' : 'Find My Representatives'}
                </Button>
                
                {loadingAI && (
                  <div className="mt-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      This may take 30-60 seconds while we find your representatives...
                    </div>
                  </div>
                )}
              </div>
            </div>
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
      {/* Generated Messages Section */}
      {generatedMessages.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-600" />
              AI-Generated Messages Ready for Signing
            </CardTitle>
            <p className="text-sm text-gray-600">
              Review and sign these AI-generated messages to send to your representatives
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatedMessages.map((message) => (
                <Card key={message.id} className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">
                            To: {message.representative.title} {message.representative.first_name} {message.representative.last_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {message.representative.state} • {getPartyName(message.representative.party)}
                          </p>
                        </div>
                        <Badge className={message.sentiment === 'support' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {message.sentiment === 'support' ? 'Support' : 'Oppose'}
                        </Badge>
                      </div>
                      
                      <div className="p-3 bg-white rounded border">
                        <div className="text-sm mb-2">
                          <strong>Subject:</strong> {message.subject}
                        </div>
                        <div className="text-sm">
                          <strong>Message:</strong>
                          <div className="mt-1 text-gray-700 whitespace-pre-wrap">
                            {message.message}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {message.signatures.length > 0 && (
                            <span>{message.signatures.length} signature(s) collected</span>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          {!message.isSignedByUser && (
                            <Button
                              onClick={() => handleSignMessage(message)}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <User className="h-4 w-4" />
                              Sign Message
                            </Button>
                          )}
                          
                          {message.isSignedByUser && (
                            <Button
                              onClick={() => sendMessage(message)}
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <Mail className="h-4 w-4" />
                              Send to Representative
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signing Modal */}
      {showSigningModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Sign Your Message</CardTitle>
              <p className="text-sm text-gray-600">
                Add your signature to this message to {showSigningModal.representative.title} {showSigningModal.representative.first_name} {showSigningModal.representative.last_name}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Enter your email address"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowSigningModal(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={submitSignature}
                    disabled={!userName.trim()}
                  >
                    Sign Message
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Original Representatives Section */}
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
                onClick={loadAIRepresentatives}
                disabled={loadingAI}
                className="flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" />
                {loadingAI ? 'Loading...' : 'Load Current Representatives'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Show message if no representatives available */}
            {currentRepresentatives.length === 0 && !loadingAI && (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  {useAI 
                    ? 'No AI representatives loaded yet' 
                    : 'No representatives found in database'
                  }
                </p>
                <Button 
                  onClick={loadAIRepresentatives}
                  disabled={loadingAI}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {loadingAI ? 'Loading Representatives...' : 'Load Current Representatives'}
                </Button>
              </div>
            )}

            {/* Rest of the original representatives display code */}
            {currentRepresentatives.map((rep) => {
              const repKey = 'bioguide_id' in rep ? rep.bioguide_id : (rep as Representative).id;
              const isEnhanced = 'years_served' in rep;
              
              return (
                <Card key={repKey} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      {/* Photo for AI-enhanced representatives */}
                      {isEnhanced && (rep as EnhancedRepresentative).image_url && (
                        <div className="flex-shrink-0">
                          <img
                            src={(rep as EnhancedRepresentative).image_url || undefined}
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
                              <strong>Current Term:</strong> {new Date((rep as EnhancedRepresentative).current_term_start!).getFullYear()} - {new Date((rep as EnhancedRepresentative).current_term_end!).getFullYear()}
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
                        Generate AI Message for {billTitle}
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Generate an AI-powered message expressing your position on this legislation:
                      </p>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`select-${repKey}`}
                            checked={selectedRepresentatives.has(repKey)}
                            onChange={(e) => handleRepresentativeSelection(repKey, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`select-${repKey}`} className="text-sm font-medium text-gray-700">
                            Enable AI message generation for this representative
                          </label>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => generateAIMessageForRepresentativeWithSentiment(rep, 'support')}
                            disabled={isGeneratingMessage || !selectedRepresentatives.has(repKey)}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                          >
                            <Sparkles className="h-4 w-4" />
                            {isGeneratingMessage ? 'Generating...' : 'Generate Support Message'}
                          </Button>
                          
                          <Button
                            onClick={() => generateAIMessageForRepresentativeWithSentiment(rep, 'oppose')}
                            disabled={isGeneratingMessage || !selectedRepresentatives.has(repKey)}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                          >
                            <Sparkles className="h-4 w-4" />
                            {isGeneratingMessage ? 'Generating...' : 'Generate Oppose Message'}
                          </Button>
                        </div>
                      </div>
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