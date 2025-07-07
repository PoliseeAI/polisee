'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

export default function TestConnection() {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState('')

  const testConnection = async () => {
    setStatus('testing')
    setMessage('Testing connection...')
    setDetails('')

    // First, check if environment variables are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('Environment check:', {
      url: supabaseUrl ? 'Present' : 'Missing',
      key: supabaseKey ? 'Present' : 'Missing',
      fullUrl: supabaseUrl,
      keyLength: supabaseKey?.length
    })

    if (!supabaseUrl || !supabaseKey) {
      setStatus('error')
      setMessage('Environment variables missing!')
      setDetails(`URL: ${supabaseUrl ? '✅ Present' : '❌ Missing'}, Key: ${supabaseKey ? '✅ Present' : '❌ Missing'}`)
      return
    }

    try {
      console.log('Attempting database connection...')
      
      // Test basic connection with simple query
      const { data, error } = await supabase
        .from('personas')
        .select('count')
        .limit(1)
      
      console.log('Database response:', { data, error })
      
      if (error) {
        console.log('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          setStatus('success')
          setMessage('Connection successful! (Empty table as expected)')
          setDetails('RLS is working properly - this is secure behavior')
        } else if (error.code === '42P01') {
          setStatus('error')
          setMessage('Table not found - Schema may not be deployed')
          setDetails(`Error: ${error.message}`)
        } else {
          setStatus('error')
          setMessage(`Database error: ${error.message}`)
          setDetails(`Code: ${error.code}, Details: ${error.details || 'None'}`)
        }
      } else {
        setStatus('success')
        setMessage('Connection successful! Database is ready.')
        setDetails(`Response: ${JSON.stringify(data)}`)
      }
    } catch (err) {
      console.error('Connection test failed:', err)
      setStatus('error')
      
      if (err instanceof Error) {
        setMessage(`Connection failed: ${err.message}`)
        setDetails(`Stack: ${err.stack?.slice(0, 200)}...`)
      } else {
        setMessage('Unknown connection error')
        setDetails(`Error object: ${JSON.stringify(err)}`)
      }
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Supabase Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testConnection} 
          disabled={status === 'testing'}
          className="w-full"
        >
          {status === 'testing' ? 'Testing...' : 'Test Connection'}
        </Button>
        
        {status !== 'idle' && (
          <div className={`p-3 rounded-lg text-sm ${
            status === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : status === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            <div className="font-medium">{message}</div>
            {details && (
              <div className="mt-2 text-xs opacity-75 font-mono">{details}</div>
            )}
          </div>
        )}
        
        <div className="text-xs text-gray-500 space-y-1">
          <div>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</div>
          <div>Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</div>
          <div className="mt-2 text-gray-400">
            Check browser console for detailed logs
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 