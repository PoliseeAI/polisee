'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, MapPin, Calendar, Briefcase, Users, DollarSign, Building, Heart, Shield, GraduationCap, School, AlertCircle } from 'lucide-react'
import { usePersona } from '../PersonaContext'

export function ReviewStep() {
  const { persona, errors } = usePersona()

  const getIncomeDisplay = (bracket: string) => {
    const incomeMap: Record<string, string> = {
      'under_25k': 'Under $25,000',
      '25k_50k': '$25,000 - $50,000',
      '50k_75k': '$50,000 - $75,000',
      '75k_100k': '$75,000 - $100,000',
      '100k_150k': '$100,000 - $150,000',
      '150k_200k': '$150,000 - $200,000',
      '200k_250k': '$200,000 - $250,000',
      '250k_500k': '$250,000 - $500,000',
      'over_500k': 'Over $500,000',
      'prefer_not_to_say': 'Prefer not to say'
    }
    return incomeMap[bracket] || bracket
  }

  const getOccupationDisplay = (occupation: string) => {
    const occupationMap: Record<string, string> = {
      'teacher': 'Teacher/Educator',
      'healthcare': 'Healthcare Professional',
      'engineer': 'Engineer',
      'business_owner': 'Business Owner',
      'lawyer': 'Lawyer',
      'government': 'Government Employee',
      'student': 'Student',
      'retired': 'Retired',
      'unemployed': 'Unemployed',
      'nonprofit': 'Nonprofit Worker',
      'consultant': 'Consultant',
      'freelancer': 'Freelancer',
      'sales': 'Sales Professional',
      'marketing': 'Marketing Professional',
      'finance': 'Finance Professional',
      'technology': 'Technology Professional',
      'construction': 'Construction Worker',
      'manufacturing': 'Manufacturing Worker',
      'agriculture': 'Agriculture Worker',
      'retail': 'Retail Worker',
      'food_service': 'Food Service Worker',
      'transportation': 'Transportation Worker',
      'other': 'Other'
    }
    return occupationMap[occupation] || occupation
  }

  const getBusinessTypeDisplay = (businessType: string) => {
    const businessMap: Record<string, string> = {
      'none': 'Not a business owner',
      'sole_proprietorship': 'Sole Proprietorship',
      'partnership': 'Partnership',
      'llc': 'Limited Liability Company (LLC)',
      'corporation': 'Corporation',
      'nonprofit': 'Nonprofit Organization',
      'freelancer': 'Freelancer/Independent Contractor',
      'consultant': 'Consultant',
      'retail': 'Retail Business',
      'restaurant': 'Restaurant/Food Service',
      'professional_services': 'Professional Services',
      'manufacturing': 'Manufacturing',
      'technology': 'Technology Company',
      'healthcare_business': 'Healthcare Business',
      'construction': 'Construction Company',
      'real_estate': 'Real Estate',
      'agriculture': 'Agriculture/Farming',
      'other': 'Other'
    }
    return businessMap[businessType] || businessType
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <div className="space-y-6">
      {hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="font-medium text-red-900">Please fix the following errors:</h3>
          </div>
          <ul className="mt-2 text-sm text-red-800">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field} className="ml-4">• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Review Your Persona
          </CardTitle>
          <CardDescription>
            Please review your information below. This persona will be used to provide personalized legislative analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Demographics */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Demographics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Location</p>
                <p className="text-sm text-blue-800">{persona.location || 'Not specified'}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Age</p>
                <p className="text-sm text-blue-800">{persona.age || 'Not specified'}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Occupation</p>
                <p className="text-sm text-blue-800">{persona.occupation ? getOccupationDisplay(persona.occupation) : 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Family & Household */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Family & Household
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-green-900">Dependents</p>
                <p className="text-sm text-green-800">{persona.dependents || '0'}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-green-900">Income Bracket</p>
                <p className="text-sm text-green-800">{persona.income_bracket ? getIncomeDisplay(persona.income_bracket) : 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Business & Employment */}
          {persona.business_type && persona.business_type !== 'none' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center">
                <Building className="w-4 h-4 mr-2" />
                Business & Employment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-purple-900">Business Type</p>
                  <p className="text-sm text-purple-800">{getBusinessTypeDisplay(persona.business_type)}</p>
                </div>
                {persona.employee_count && (
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-purple-900">Employee Count</p>
                    <p className="text-sm text-purple-800">{persona.employee_count}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Health & Benefits */}
          {(persona.has_health_insurance || persona.has_medicare || persona.has_social_security) && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center">
                <Heart className="w-4 h-4 mr-2" />
                Health & Benefits
              </h3>
              <div className="flex flex-wrap gap-2">
                {persona.has_health_insurance && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <Shield className="w-3 h-3 mr-1" />
                    Health Insurance
                  </Badge>
                )}
                {persona.has_medicare && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <Heart className="w-3 h-3 mr-1" />
                    Medicare
                  </Badge>
                )}
                {persona.has_social_security && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    <Users className="w-3 h-3 mr-1" />
                    Social Security
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Education & Community */}
          {(persona.has_higher_education || persona.school_district) && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center">
                <GraduationCap className="w-4 h-4 mr-2" />
                Education & Community
              </h3>
              <div className="space-y-2">
                {persona.has_higher_education && (
                  <div className="flex items-center">
                    <GraduationCap className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="text-sm">Higher Education Background</span>
                  </div>
                )}
                {persona.school_district && (
                  <div className="flex items-center">
                    <School className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm">School District: {persona.school_district}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personalization Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What to Expect</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Based on your persona, you'll receive personalized analysis focusing on:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Policy Areas</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {persona.location && <li>• State-specific impacts ({persona.location})</li>}
                  {persona.occupation && <li>• {getOccupationDisplay(persona.occupation)}-related policies</li>}
                  {persona.business_type && persona.business_type !== 'none' && <li>• Business regulations and tax policies</li>}
                  {persona.has_health_insurance && <li>• Healthcare and insurance policies</li>}
                  {persona.has_medicare && <li>• Medicare policy changes</li>}
                  {persona.has_social_security && <li>• Social Security benefit updates</li>}
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Impact Categories</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Financial impacts based on income bracket</li>
                  {parseInt(persona.dependents) > 0 && <li>• Family-related policies</li>}
                  {persona.has_higher_education && <li>• Education and student loan policies</li>}
                  {persona.school_district && <li>• Local education funding</li>}
                  <li>• Age-specific policy implications</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Ready to Create Your Persona?</h3>
        <p className="text-sm text-blue-800">
          Your persona will be securely stored and automatically deleted after 24 hours. 
          You can use this persona to analyze multiple bills and get personalized insights.
        </p>
      </div>
    </div>
  )
} 