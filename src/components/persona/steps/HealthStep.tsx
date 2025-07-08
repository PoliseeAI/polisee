'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, Shield, Users } from 'lucide-react'
import { usePersona } from '../PersonaContext'

export function HealthStep() {
  const { persona, updatePersona } = usePersona()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Heart className="w-5 h-5 mr-2" />
            Health & Benefits
          </CardTitle>
          <CardDescription>
            Information about your healthcare and government benefits. This helps us identify how healthcare policies and benefit programs might affect you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Health Insurance */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label htmlFor="has_health_insurance">Health Insurance</Label>
                <p className="text-sm text-gray-500">
                  Health insurance status helps us identify healthcare policies, insurance regulations, and medical tax provisions that affect you.
                </p>
              </div>
              <Switch
                id="has_health_insurance"
                checked={persona.has_health_insurance}
                onCheckedChange={(checked) => updatePersona('has_health_insurance', checked)}
              />
            </div>

            {persona.has_health_insurance && (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>With health insurance:</strong> You'll receive analysis of how policies might affect your coverage, premiums, and benefits.
                </p>
              </div>
            )}

            {!persona.has_health_insurance && (
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>Without health insurance:</strong> You'll receive analysis of policies that might help you access affordable healthcare coverage.
                </p>
              </div>
            )}
          </div>

          {/* Medicare */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label htmlFor="has_medicare">Medicare</Label>
                <p className="text-sm text-gray-500">
                  Medicare enrollment affects how healthcare legislation impacts you, including prescription drug costs and benefit changes.
                </p>
              </div>
              <Switch
                id="has_medicare"
                checked={persona.has_medicare}
                onCheckedChange={(checked) => updatePersona('has_medicare', checked)}
              />
            </div>

            {persona.has_medicare && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Medicare recipient:</strong> You'll receive detailed analysis of Medicare policy changes, including Parts A, B, C, and D coverage.
                </p>
              </div>
            )}
          </div>

          {/* Social Security */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Label htmlFor="has_social_security">Social Security</Label>
                <p className="text-sm text-gray-500">
                  Social Security status helps us identify retirement, disability, and benefit policies that affect you.
                </p>
              </div>
              <Switch
                id="has_social_security"
                checked={persona.has_social_security}
                onCheckedChange={(checked) => updatePersona('has_social_security', checked)}
              />
            </div>

            {persona.has_social_security && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-800">
                  <strong>Social Security recipient:</strong> You'll receive analysis of how policies might affect your benefits, including retirement, disability, and survivor benefits.
                </p>
              </div>
            )}
          </div>

          {/* Benefits Summary */}
          {(persona.has_health_insurance || persona.has_medicare || persona.has_social_security) && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Your Benefits Profile:</h4>
              <div className="space-y-2">
                {persona.has_health_insurance && (
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm">Health Insurance Coverage</span>
                  </div>
                )}
                {persona.has_medicare && (
                  <div className="flex items-center">
                    <Heart className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="text-sm">Medicare Benefits</span>
                  </div>
                )}
                {persona.has_social_security && (
                  <div className="flex items-center">
                    <Users className="w-4 h-4 text-purple-600 mr-2" />
                    <span className="text-sm">Social Security Benefits</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-red-50 p-4 rounded-lg">
        <h3 className="font-medium text-red-900 mb-2">Why we ask for this information:</h3>
        <ul className="text-sm text-red-800 space-y-1">
          <li>• <strong>Health Insurance:</strong> Healthcare reforms, ACA changes, and insurance regulations</li>
          <li>• <strong>Medicare:</strong> Medicare policy changes, prescription drug coverage, and benefit modifications</li>
          <li>• <strong>Social Security:</strong> Benefit adjustments, eligibility changes, and program modifications</li>
        </ul>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Privacy Note:</h3>
        <p className="text-sm text-gray-700">
          Your health and benefits information is used solely for policy analysis and is not shared with any healthcare providers, 
          government agencies, or third parties. All data is automatically deleted after 24 hours.
        </p>
      </div>
    </div>
  )
} 