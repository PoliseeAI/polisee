'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, DollarSign } from 'lucide-react'
import { usePersona } from '../PersonaContext'

export function FamilyStep() {
  const { persona, updatePersona, errors } = usePersona()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Family & Household
          </CardTitle>
          <CardDescription>
            Information about your family situation and household finances. This helps us understand how policies might affect your family.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Number of Dependents */}
          <div className="space-y-2">
            <Label htmlFor="dependents">Number of Dependents *</Label>
            <Select
              value={persona.dependents}
              onValueChange={(value) => updatePersona('dependents', value)}
            >
              <SelectTrigger className={errors.dependents ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select number of dependents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 - No dependents</SelectItem>
                <SelectItem value="1">1 dependent</SelectItem>
                <SelectItem value="2">2 dependents</SelectItem>
                <SelectItem value="3">3 dependents</SelectItem>
                <SelectItem value="4">4 dependents</SelectItem>
                <SelectItem value="5">5 dependents</SelectItem>
                <SelectItem value="6">6+ dependents</SelectItem>
              </SelectContent>
            </Select>
            {errors.dependents && (
              <p className="text-sm text-red-600">{errors.dependents}</p>
            )}
            <p className="text-sm text-gray-600">
              Include children, elderly parents, or other family members you financially support.
            </p>
          </div>

          {/* Income Bracket */}
          <div className="space-y-2">
            <Label htmlFor="income_bracket">Household Income Bracket *</Label>
            <Select
              value={persona.income_bracket}
              onValueChange={(value) => updatePersona('income_bracket', value)}
            >
              <SelectTrigger className={errors.income_bracket ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select your income bracket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="under_25k">Under $25,000</SelectItem>
                <SelectItem value="25k_50k">$25,000 - $50,000</SelectItem>
                <SelectItem value="50k_75k">$50,000 - $75,000</SelectItem>
                <SelectItem value="75k_100k">$75,000 - $100,000</SelectItem>
                <SelectItem value="100k_150k">$100,000 - $150,000</SelectItem>
                <SelectItem value="150k_200k">$150,000 - $200,000</SelectItem>
                <SelectItem value="200k_250k">$200,000 - $250,000</SelectItem>
                <SelectItem value="250k_500k">$250,000 - $500,000</SelectItem>
                <SelectItem value="over_500k">Over $500,000</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
            {errors.income_bracket && (
              <p className="text-sm text-red-600">{errors.income_bracket}</p>
            )}
            <p className="text-sm text-gray-600">
              Your household income helps us understand which tax brackets and economic policies affect you.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="font-medium text-green-900 mb-2">Why we ask for this information:</h3>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• <strong>Dependents:</strong> Many policies have different impacts based on family size</li>
          <li>• <strong>Income:</strong> Tax policies, benefits, and subsidies are often income-based</li>
          <li>• <strong>Household size:</strong> Programs like healthcare and education funding consider family size</li>
        </ul>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Your Privacy:</h3>
        <p className="text-sm text-gray-700">
          This information is used solely to provide personalized analysis and is not shared with third parties. 
          All data is automatically deleted after 24 hours for your privacy.
        </p>
      </div>
    </div>
  )
} 