'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import { PersonaProvider, usePersona } from '@/components/persona/PersonaContext'
import { DemographicsStep } from './steps/DemographicsStep'
import { FamilyStep } from './steps/FamilyStep'
import { BusinessStep } from './steps/BusinessStep'
import { HealthStep } from './steps/HealthStep'
import { EducationStep } from './steps/EducationStep'
import { ReviewStep } from './steps/ReviewStep'
import { toast } from 'sonner'

const STEPS = [
  { id: 'demographics', title: 'Demographics', description: 'Basic information about you' },
  { id: 'family', title: 'Family & Household', description: 'Your family situation' },
  { id: 'business', title: 'Business & Employment', description: 'Your work and business details' },
  { id: 'health', title: 'Health & Benefits', description: 'Healthcare and benefits information' },
  { id: 'education', title: 'Education & Community', description: 'Education and community details' },
  { id: 'review', title: 'Review & Confirm', description: 'Review your information' }
]

function PersonaWizardContent() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { persona, savePersona, validateCurrentStep, loadExistingPersona } = usePersona()
  const router = useRouter()

  // Load existing persona when component mounts
  useEffect(() => {
    loadExistingPersona()
  }, [loadExistingPersona])

  const progress = ((currentStep + 1) / STEPS.length) * 100

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      const isValid = await validateCurrentStep(STEPS[currentStep].id)
      if (isValid) {
        setCurrentStep(currentStep + 1)
      }
    } else {
      // Final submission
      await handleSubmit()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await savePersona()
      toast.success('Persona created successfully!')
      router.push('/analyze')
    } catch (error) {
      console.error('Failed to save persona:', error)
      toast.error('Failed to save persona. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'demographics':
        return <DemographicsStep />
      case 'family':
        return <FamilyStep />
      case 'business':
        return <BusinessStep />
      case 'health':
        return <HealthStep />
      case 'education':
        return <EducationStep />
      case 'review':
        return <ReviewStep />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-xl">
                Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
              </CardTitle>
              <p className="text-gray-600 mt-1">{STEPS[currentStep].description}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-2">
                {Math.round(progress)}% Complete
              </div>
              <Progress value={progress} className="w-32" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex space-x-2">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        <Button
          onClick={handleNext}
          disabled={isSubmitting}
          className={currentStep === STEPS.length - 1 ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {isSubmitting ? (
            'Saving...'
          ) : currentStep === STEPS.length - 1 ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Create Persona
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export function PersonaWizard() {
  return (
    <PersonaProvider>
      <PersonaWizardContent />
    </PersonaProvider>
  )
} 