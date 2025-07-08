'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, School, Users } from 'lucide-react'
import { usePersona } from '../PersonaContext'

export function EducationStep() {
  const { persona, updatePersona, errors } = usePersona()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <GraduationCap className="w-5 h-5 mr-2" />
            Education & Community
          </CardTitle>
          <CardDescription>
            Information about your educational background and community connections. This helps us identify how education policies and community programs might affect you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Higher Education */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label htmlFor="has_higher_education">Higher Education</Label>
                <p className="text-sm text-gray-600">
                  Do you have a college degree or higher education?
                </p>
              </div>
              <Switch
                id="has_higher_education"
                checked={persona.has_higher_education}
                onCheckedChange={(checked) => updatePersona('has_higher_education', checked)}
              />
            </div>

            {persona.has_higher_education && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>With higher education:</strong> You'll receive analysis of policies affecting student loans, 
                  education tax credits, and higher education funding.
                </p>
              </div>
            )}

            {!persona.has_higher_education && (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Without higher education:</strong> You'll receive analysis of policies that might help you access 
                  affordable education and training programs.
                </p>
              </div>
            )}
          </div>

          {/* School District */}
          <div className="space-y-2">
            <Label htmlFor="school_district">School District (Optional)</Label>
            <Input
              id="school_district"
              placeholder="e.g., Los Angeles USD, NYC Department of Education"
              value={persona.school_district}
              onChange={(e) => updatePersona('school_district', e.target.value)}
            />
            <p className="text-sm text-gray-600">
              If you have children in school or work in education, this helps us identify relevant local education policies.
            </p>
          </div>

          {/* Community Connection Info */}
          {(persona.has_higher_education || persona.school_district) && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Your Education Profile:</h4>
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
                    <span className="text-sm">Connected to {persona.school_district}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-indigo-50 p-4 rounded-lg">
        <h3 className="font-medium text-indigo-900 mb-2">Why we ask for this information:</h3>
        <ul className="text-sm text-indigo-800 space-y-1">
          <li>• <strong>Higher Education:</strong> Student loan policies, education tax credits, and higher education funding</li>
          <li>• <strong>School District:</strong> K-12 education funding, school choice policies, and local education initiatives</li>
          <li>• <strong>Community Connection:</strong> Local impact of federal education policies and programs</li>
        </ul>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-medium text-yellow-900 mb-2">Education Policy Examples:</h3>
        <p className="text-sm text-yellow-800 mb-2">
          Based on your education profile, you might be interested in policies affecting:
        </p>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Federal education funding and grants</li>
          <li>• Student loan forgiveness programs</li>
          <li>• K-12 school choice and voucher programs</li>
          <li>• Special education funding</li>
          <li>• Teacher training and support programs</li>
        </ul>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Optional Information:</h3>
        <p className="text-sm text-gray-700">
          All education information is optional. If you don't have connections to the education system, 
          you can skip these fields and still receive comprehensive policy analysis.
        </p>
      </div>
    </div>
  )
} 