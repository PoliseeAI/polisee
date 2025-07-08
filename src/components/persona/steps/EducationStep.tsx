'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, School } from 'lucide-react'
import { usePersona } from '../PersonaContext'

export function EducationStep() {
  const { persona, updatePersona } = usePersona()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <GraduationCap className="h-5 w-5 mr-2" />
            Education & Community
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* School District */}
          <div className="space-y-2">
            <Label htmlFor="school_district">School District (Optional)</Label>
            <Input
              id="school_district"
              type="text"
              placeholder="e.g., Springfield USD, Chicago Public Schools"
              value={persona.school_district || ''}
              onChange={(e) => updatePersona('school_district', e.target.value)}
            />
            <p className="text-sm text-gray-500">
              Your local school district helps us identify education funding, policy changes, and other provisions that affect your community&apos;s schools.
            </p>
          </div>

          {/* Higher Education */}
          <div className="space-y-2">
            <Label htmlFor="has_higher_education">Higher Education Experience</Label>
            <Select
              value={persona.has_higher_education ? 'true' : 'false'}
              onValueChange={(value) => updatePersona('has_higher_education', value === 'true')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes, I have higher education experience</SelectItem>
                <SelectItem value="false">No higher education experience</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              Higher education experience helps us identify student loan policies, education tax credits, and workforce development programs that may affect you.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <School className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-gray-500">
                Education and community involvement helps us understand policies that affect your local area and interests.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 