'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Mail, ExternalLink, MapPin, User, Calendar, Globe, Loader2, Clock } from 'lucide-react';

interface EnhancedRepresentative {
  id: string;
  bioguide_id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  title: string;
  party: string;
  state: string;
  district: string | null;
  chamber: string;
  office: string | null;
  phone: string | null;
  email: string | null;
  contact_form: string | null;
  website: string | null;
  facebook: string | null;
  twitter: string | null;
  youtube: string | null;
  image_url: string | null;
  photo_url?: string;
  years_served: number;
  current_term_start: string;
  current_term_end: string;
  biography?: string;
  committees?: string[];
  summary?: string;
  in_office: boolean;
  next_election: string | null;
  term_start: string;
  term_end: string;
  term_status?: string;
  term_end_date?: string;
  created_at: string;
  updated_at: string;
}

export default function Representatives() {
  const [location, setLocation] = useState('')
  const [representatives, setRepresentatives] = useState<EnhancedRepresentative[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedRep, setExpandedRep] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const loadRepresentatives = useCallback(async () => {
    if (!location.trim()) {
      setRepresentatives([])
      setLastUpdated(null)
      return
    }

    setLoading(true)

    try {
      console.log('Fetching representatives for location:', location)
      
      const response = await fetch('/api/representatives-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: location.trim()
        })
      })

      const data = await response.json()
      console.log('API Response:', data)

      if (data.success) {
        setRepresentatives(data.representatives || [])
        setLastUpdated(new Date().toLocaleString())
        if (data.representatives?.length === 0) {
          console.log('No representatives found for location:', location)
        }
      } else {
        console.error('Failed to fetch representatives:', data.error)
        setRepresentatives([])
        setLastUpdated(null)
      }
    } catch (error) {
      console.error('Error fetching representatives:', error)
      setRepresentatives([])
      setLastUpdated(null)
    } finally {
      setLoading(false)
    }
  }, [location])

  // Removed automatic triggering - only call when user clicks button or presses Enter

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Your Representatives
            </h1>
            <p className="text-gray-600">
              Find and contact your current U.S. Senators and Representatives
            </p>
          </div>

          {/* Location Input */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="location">Enter your location (City, State)</Label>
                  <Input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        loadRepresentatives();
                      }
                    }}
                    placeholder="e.g., Denver, CO"
                    className="mt-1"
                  />
                </div>
                <Button 
                  onClick={loadRepresentatives}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Loading...' : 'Find Representatives'}
                </Button>
              </div>
              {lastUpdated && (
                <p className="text-sm text-gray-500 mt-2">
                  Last updated: {lastUpdated}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading && (
            <Card className="mb-8">
              <CardContent className="py-12">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-spin" />
                  <h3 className="text-lg font-semibold mb-2">Analyzing your location...</h3>
                  <p className="text-gray-600">This may take 30-60 seconds</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Representatives Grid */}
          {!loading && representatives.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Found {representatives.length} Representatives
                </h2>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    AI-Powered
                  </Badge>
                  <div className="text-xs text-gray-500">
                    <span className="text-blue-500">●</span> Current • <span className="text-gray-400">●</span> Term Ended
                  </div>
                </div>
              </div>

              {representatives.map((rep) => (
                <Card key={rep.bioguide_id} className={`border-l-4 ${rep.in_office ? 'border-l-blue-500' : 'border-l-gray-400'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      {/* Photo */}
                      {rep.photo_url && (
                        <div className="flex-shrink-0">
                          <img
                            src={rep.photo_url}
                            alt={`${rep.first_name} ${rep.last_name}`}
                            className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="flex-grow">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-xl">
                                {rep.title} {rep.first_name} {rep.last_name}
                              </h3>
                              <Badge className={getPartyColor(rep.party)}>
                                {getPartyName(rep.party)}
                              </Badge>
                              {!rep.in_office && (
                                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-300">
                                  Term Ended
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-6 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {rep.state}
                                {rep.district && ` District ${rep.district}`}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {rep.chamber === 'senate' ? 'U.S. Senator' : 'U.S. Representative'}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {rep.years_served} years served
                                {!rep.in_office && (
                                  <span className="text-red-600 text-xs ml-1">(term ended)</span>
                                )}
                              </div>
                            </div>
                            
                            {/* AI Summary */}
                            {rep.summary && (
                              <p className="text-sm text-gray-700 italic mt-2">
                                {rep.summary}
                              </p>
                            )}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedRep(expandedRep === rep.bioguide_id ? null : rep.bioguide_id)}
                          >
                            {expandedRep === rep.bioguide_id ? 'Less Info' : 'More Info'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                
                  {expandedRep === rep.bioguide_id && (
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Biography */}
                        {rep.biography && (
                          <div>
                            <h4 className="font-semibold mb-1">Biography</h4>
                            <p className="text-sm text-gray-700">{rep.biography}</p>
                          </div>
                        )}

                        {/* Contact Information */}
                        <div>
                          <h4 className="font-semibold mb-2">Contact Information</h4>
                          <div className="space-y-2 text-sm">
                            {rep.office && (
                              <div>
                                <strong>Office:</strong> {rep.office}
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
                                  {rep.phone}
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
                              {rep.contact_form && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(rep.contact_form!, '_blank')}
                                >
                                  <Mail className="h-4 w-4 mr-1" />
                                  Contact Form
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Committees */}
                        {rep.committees && rep.committees.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-1">Key Committees</h4>
                            <div className="flex flex-wrap gap-1">
                              {rep.committees.map((committee, index) => (
                                <Badge key={index} variant="secondary">
                                  {committee}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Term Information */}
                        <div>
                          <h4 className="font-semibold mb-1">
                            {rep.in_office ? 'Current Term' : 'Last Term'}
                          </h4>
                          <p className="text-sm text-gray-700">
                            {new Date(rep.current_term_start).getFullYear()} - {new Date(rep.current_term_end).getFullYear()}
                            {!rep.in_office && (
                              <span className="text-red-600 font-medium ml-2">
                                (Term ended {new Date(rep.current_term_end).toLocaleDateString()})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && representatives.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Representatives Found</h3>
                  <p className="text-gray-600 mb-4">
                    We couldn't find representatives for "{location}". Please try a different location.
                  </p>
                  <Button onClick={loadRepresentatives} variant="outline">
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 