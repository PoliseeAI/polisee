'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin } from 'lucide-react'
import { usePersona } from '../PersonaContext'

export function DemographicsStep() {
  const { persona, updatePersona, errors } = usePersona()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Basic Demographics
          </CardTitle>
          <CardDescription>
            Tell us about your basic demographic information. This helps us understand your perspective and circumstances.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              placeholder="e.g., California, New York, Texas"
              value={persona.location}
              onChange={(e) => updatePersona('location', e.target.value)}
              className={errors.location ? 'border-red-500' : ''}
            />
            {errors.location && (
              <p className="text-sm text-red-600">{errors.location}</p>
            )}
            <p className="text-sm text-gray-600">
              Your state or region - this helps us understand how laws might affect you locally.
            </p>
          </div>

          {/* Age */}
          <div className="space-y-2">
            <Label htmlFor="age">Age *</Label>
            <Input
              id="age"
              type="number"
              placeholder="e.g., 35"
              min="18"
              max="120"
              value={persona.age}
              onChange={(e) => updatePersona('age', e.target.value)}
              className={errors.age ? 'border-red-500' : ''}
            />
            {errors.age && (
              <p className="text-sm text-red-600">{errors.age}</p>
            )}
            <p className="text-sm text-gray-600">
              Your age helps us understand which life stage considerations apply to you.
            </p>
          </div>

          {/* Occupation */}
          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation *</Label>
            <Select
              value={persona.occupation}
              onValueChange={(value) => updatePersona('occupation', value)}
            >
              <SelectTrigger className={errors.occupation ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select your occupation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teacher">Teacher/Educator</SelectItem>
                <SelectItem value="healthcare">Healthcare Professional</SelectItem>
                <SelectItem value="engineer">Engineer</SelectItem>
                <SelectItem value="business_owner">Business Owner</SelectItem>
                <SelectItem value="lawyer">Lawyer</SelectItem>
                <SelectItem value="government">Government Employee</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
                <SelectItem value="unemployed">Unemployed</SelectItem>
                <SelectItem value="nonprofit">Nonprofit Worker</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
                <SelectItem value="freelancer">Freelancer</SelectItem>
                <SelectItem value="sales">Sales Professional</SelectItem>
                <SelectItem value="marketing">Marketing Professional</SelectItem>
                <SelectItem value="finance">Finance Professional</SelectItem>
                <SelectItem value="technology">Technology Professional</SelectItem>
                <SelectItem value="construction">Construction Worker</SelectItem>
                <SelectItem value="manufacturing">Manufacturing Worker</SelectItem>
                <SelectItem value="agriculture">Agriculture Worker</SelectItem>
                <SelectItem value="retail">Retail Worker</SelectItem>
                <SelectItem value="food_service">Food Service Worker</SelectItem>
                <SelectItem value="transportation">Transportation Worker</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.occupation && (
              <p className="text-sm text-red-600">{errors.occupation}</p>
            )}
            <p className="text-sm text-gray-600">
              Your occupation helps us identify workplace-related impacts and industry-specific regulations.
            </p>
          </div>

          {/* Custom occupation input for "Other" */}
          {persona.occupation === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="custom_occupation">Specify your occupation</Label>
              <Input
                id="custom_occupation"
                placeholder="Enter your occupation"
                value={persona.business_type || ''}
                onChange={(e) => updatePersona('business_type', e.target.value)}
              />
              <p className="text-sm text-gray-600">
                Please specify your occupation to help us provide more accurate analysis.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Why we ask for this information:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Location:</strong> Laws affect different states and regions differently</li>
          <li>• <strong>Age:</strong> Many policies have age-based eligibility or impacts</li>
          <li>• <strong>Occupation:</strong> Professional regulations and industry-specific impacts</li>
        </ul>
      </div>
    </div>
  )
} 