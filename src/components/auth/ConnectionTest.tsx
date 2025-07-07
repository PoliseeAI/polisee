'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ConnectionTest() {
  const [showDetails, setShowDetails] = useState(false)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🔍 Environment Variables Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Current Status:</h4>
          <div className="space-y-2 text-sm">
            <div className={`flex items-center space-x-2 ${supabaseUrl ? 'text-green-600' : 'text-red-600'}`}>
              <span>{supabaseUrl ? '✅' : '❌'}</span>
              <span>NEXT_PUBLIC_SUPABASE_URL: {supabaseUrl ? 'Set' : 'Missing'}</span>
            </div>
            <div className={`flex items-center space-x-2 ${supabaseKey ? 'text-green-600' : 'text-red-600'}`}>
              <span>{supabaseKey ? '✅' : '❌'}</span>
              <span>NEXT_PUBLIC_SUPABASE_ANON_KEY: {supabaseKey ? 'Set' : 'Missing'}</span>
            </div>
          </div>
        </div>

        <Button 
          onClick={() => setShowDetails(!showDetails)}
          variant="outline"
          className="w-full"
        >
          {showDetails ? 'Hide' : 'Show'} Environment Details
        </Button>

        {showDetails && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Environment Values:</h4>
            <div className="space-y-2 text-sm font-mono">
              <div>
                <strong>URL:</strong> 
                <span className="ml-2 text-blue-600">
                  {supabaseUrl || 'Not set'}
                </span>
              </div>
              <div>
                <strong>Key:</strong> 
                <span className="ml-2 text-blue-600">
                  {supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'Not set'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">🛠️ Troubleshooting:</h4>
          <div className="text-sm space-y-1">
            <p>• Check your <code>.env.local</code> file exists in project root</p>
            <p>• Ensure variables start with <code>NEXT_PUBLIC_</code></p>
            <p>• Restart development server after changes</p>
            <p>• Verify Supabase project URL and anon key are correct</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 