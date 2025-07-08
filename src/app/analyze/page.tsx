'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, FileText, ArrowRight, CheckCircle, Edit, MapPin, Calendar, Briefcase } from 'lucide-react'
import { AuthGuard } from '@/components/auth'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAuthContext } from '@/lib/auth'
import { personaUtils, PersonaRow } from '@/lib/supabase'

export default function Analyze() {
  const { user } = useAuthContext()
  const [hasPersona, setHasPersona] = useState<boolean | null>(null)
  const [persona, setPersona] = useState<PersonaRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkPersona = async () => {
      if (!user) return
      
      setLoading(true)
      try {
        const personaExists = await personaUtils.hasPersona(user.id)
        setHasPersona(personaExists)
        
        if (personaExists) {
          const personaData = await personaUtils.getPersona(user.id)
          setPersona(personaData)
        }
      } catch (error) {
        console.error('Error checking persona:', error)
      } finally {
        setLoading(false)
      }
    }

    checkPersona()
  }, [user])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    
    // Parse the date string correctly to avoid timezone issues
    // The database stores dates as YYYY-MM-DD format
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day) // month is 0-indexed
    
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Analyze Legislation</h1>
            <p className="text-gray-600 mt-2">Loading your profile...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Analyze Legislation</h1>
        <p className="text-gray-600 mt-2">
          {hasPersona 
            ? "Your persona is ready! View personalized analysis of available bills" 
            : "Create your persona and view personalized analysis of available bills"
          }
        </p>
      </div>

      {/* Persona Status */}
      {hasPersona && persona ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Your Persona
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link href="/persona/create">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Location</p>
                  <p className="text-sm text-gray-600">{persona.location}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <Calendar className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Age</p>
                  <p className="text-sm text-gray-600">{persona.age} years old</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-2 rounded-full">
                  <Briefcase className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Occupation</p>
                  <p className="text-sm text-gray-600">{persona.occupation}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Ready for Analysis:</strong> Your persona is set up and ready to receive personalized legislative impact analysis.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* No Persona - Show Creation Steps */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Create Your Persona
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                To get started with personalized bill analysis, you'll need to create a persona that tells us about your circumstances and interests.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">What we'll ask you:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Basic demographics (location, age, occupation)</li>
                  <li>• Family and household information</li>
                  <li>• Business and employment details</li>
                  <li>• Health and benefits status</li>
                  <li>• Education and community connections</li>
                </ul>
              </div>
              <Button size="lg" className="w-full md:w-auto" asChild>
                <Link href="/persona/create">
                  <User className="h-4 w-4 mr-2" />
                  Create Persona (5-10 minutes)
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              View Available Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              We&apos;re working hard to bring you personalized bill analysis. This feature will help you understand how proposed legislation affects your specific situation.
            </p>
            <p className="text-gray-600 mb-6">
              Once we&apos;ve processed more bills in our database, you&apos;ll be able to get AI-powered insights tailored to your demographics, occupation, and interests.
            </p>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/bills">
                <FileText className="h-4 w-4 mr-2" />
                Browse Bills
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Process Overview */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              Get personalized bill analysis in four simple steps:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium">Create your persona</p>
                  <p className="text-sm text-gray-600">Takes 5-10 minutes</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-green-600">2</span>
                </div>
                <div>
                  <p className="font-medium">View available bills</p>
                  <p className="text-sm text-gray-600">Browse bills uploaded by our team</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-purple-600">3</span>
                </div>
                <div>
                  <p className="font-medium">Get personalized analysis</p>
                  <p className="text-sm text-gray-600">AI analyzes each bill for you</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-orange-600">4</span>
                </div>
                <div>
                  <p className="font-medium">Provide feedback</p>
                  <p className="text-sm text-gray-600">Share your sentiment on bill impacts</p>
                </div>
              </div>
            </div>
            {!hasPersona && (
              <div className="flex justify-center pt-4">
                <Button size="lg" asChild>
                  <Link href="/persona/create">
                    Start Analysis
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </AuthGuard>
  )
} 