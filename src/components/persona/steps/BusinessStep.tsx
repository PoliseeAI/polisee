'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building } from 'lucide-react'
import { usePersona } from '../PersonaContext'

export function BusinessStep() {
  const { persona, updatePersona, errors } = usePersona()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="w-5 h-5 mr-2" />
            Business & Employment
          </CardTitle>
          <p className="text-sm text-gray-500">
            Tell us about your business so we can identify relevant tax credits, regulations, and policies that affect you.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Business Type */}
          <div className="space-y-2">
            <Label htmlFor="business_type">Business Type (Optional)</Label>
            <Select
              value={persona.business_type}
              onValueChange={(value) => updatePersona('business_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your business type (if applicable)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not a business owner</SelectItem>
                <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
                <SelectItem value="llc">Limited Liability Company (LLC)</SelectItem>
                <SelectItem value="corporation">Corporation</SelectItem>
                <SelectItem value="nonprofit">Nonprofit Organization</SelectItem>
                <SelectItem value="freelancer">Freelancer/Independent Contractor</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
                <SelectItem value="retail">Retail Business</SelectItem>
                <SelectItem value="restaurant">Restaurant/Food Service</SelectItem>
                <SelectItem value="professional_services">Professional Services</SelectItem>
                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                <SelectItem value="technology">Technology Company</SelectItem>
                <SelectItem value="healthcare_business">Healthcare Business</SelectItem>
                <SelectItem value="construction">Construction Company</SelectItem>
                <SelectItem value="real_estate">Real Estate</SelectItem>
                <SelectItem value="agriculture">Agriculture/Farming</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600">
                      Business owners may be affected by tax incentives, regulatory changes, and policies targeting different business sizes. We&apos;ll use this information to highlight relevant provisions.
                    </p>
          </div>

          {/* Employee Count */}
          {persona.business_type && persona.business_type !== 'none' && (
            <div className="space-y-2">
              <Label htmlFor="employee_count">Number of Employees (Optional)</Label>
              <Select
                value={persona.employee_count}
                onValueChange={(value) => updatePersona('employee_count', value)}
              >
                <SelectTrigger className={errors.employee_count ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select number of employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Just me (sole proprietor)</SelectItem>
                  <SelectItem value="1">1 employee</SelectItem>
                  <SelectItem value="2">2-5 employees</SelectItem>
                  <SelectItem value="6">6-10 employees</SelectItem>
                  <SelectItem value="11">11-25 employees</SelectItem>
                  <SelectItem value="26">26-50 employees</SelectItem>
                  <SelectItem value="51">51-100 employees</SelectItem>
                  <SelectItem value="101">101-500 employees</SelectItem>
                  <SelectItem value="501">500+ employees</SelectItem>
                </SelectContent>
              </Select>
              {errors.employee_count && (
                <p className="text-sm text-red-600">{errors.employee_count}</p>
              )}
              <p className="text-sm text-gray-500">
                Employee count helps us identify small business tax credits, regulatory requirements, and policies that apply to businesses of your size. Many policies have different rules for businesses with fewer than 50 employees, 10 employees, etc.
              </p>
            </div>
          )}

          {/* Industry-specific note */}
          {persona.business_type && persona.business_type !== 'none' && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Business Owner Benefits:</h4>
              <p className="text-sm text-yellow-800">
                As a business owner, you'll receive detailed analysis of:
              </p>
              <ul className="text-sm text-yellow-800 mt-2 space-y-1">
                <li>• Tax credits and deductions</li>
                <li>• Regulatory compliance requirements</li>
                <li>• Employee-related obligations</li>
                <li>• Industry-specific regulations</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-purple-50 p-4 rounded-lg">
        <h3 className="font-medium text-purple-900 mb-2">Why we ask for this information:</h3>
        <ul className="text-sm text-purple-800 space-y-1">
          <li>• <strong>Business Type:</strong> Different business structures have different tax and regulatory implications</li>
          <li>• <strong>Employee Count:</strong> Many laws have thresholds based on business size (e.g., 50+ employees for ACA requirements)</li>
          <li>• <strong>Industry:</strong> Some regulations are industry-specific (healthcare, financial services, etc.)</li>
        </ul>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>Note:</strong> All business information is optional. If you're not a business owner, you can skip these fields or select "Not a business owner."
        </p>
      </div>
    </div>
  )
} 