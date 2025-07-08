'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/lib/auth'
import { PersonaInsert } from '@/lib/supabase'
import { toast } from 'sonner'

interface PersonaData {
  // Demographics
  location: string
  age: string
  occupation: string
  
  // Family & Household
  dependents: string
  income_bracket: string
  
  // Business & Employment
  business_type: string
  employee_count: string
  
  // Health & Benefits
  has_health_insurance: boolean
  has_medicare: boolean
  has_social_security: boolean
  
  // Education & Community
  school_district: string
  has_higher_education: boolean
}

interface PersonaContextType {
  persona: PersonaData
  updatePersona: (field: keyof PersonaData, value: any) => void
  updateMultipleFields: (fields: Partial<PersonaData>) => void
  validateCurrentStep: (stepId: string) => Promise<boolean>
  savePersona: () => Promise<void>
  loadExistingPersona: () => Promise<void>
  errors: Record<string, string>
  clearErrors: () => void
}

const initialPersonaData: PersonaData = {
  location: '',
  age: '',
  occupation: '',
  dependents: '0',
  income_bracket: '',
  business_type: '',
  employee_count: '',
  has_health_insurance: false,
  has_medicare: false,
  has_social_security: false,
  school_district: '',
  has_higher_education: false
}

const PersonaContext = createContext<PersonaContextType | undefined>(undefined)

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersona] = useState<PersonaData>(initialPersonaData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { user } = useAuthContext()

  const updatePersona = useCallback((field: keyof PersonaData, value: any) => {
    setPersona(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }, [errors])

  const updateMultipleFields = useCallback((fields: Partial<PersonaData>) => {
    setPersona(prev => ({
      ...prev,
      ...fields
    }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const validateCurrentStep = useCallback(async (stepId: string): Promise<boolean> => {
    const newErrors: Record<string, string> = {}

    switch (stepId) {
      case 'demographics':
        if (!persona.location.trim()) newErrors.location = 'Location is required'
        if (!persona.age.trim()) newErrors.age = 'Age is required'
        else if (parseInt(persona.age) < 18 || parseInt(persona.age) > 120) {
          newErrors.age = 'Age must be between 18 and 120'
        }
        if (!persona.occupation.trim()) newErrors.occupation = 'Occupation is required'
        break

      case 'family':
        if (!persona.income_bracket.trim()) newErrors.income_bracket = 'Income bracket is required'
        if (!persona.dependents.trim()) newErrors.dependents = 'Number of dependents is required'
        else if (parseInt(persona.dependents) < 0) {
          newErrors.dependents = 'Number of dependents cannot be negative'
        }
        break

      case 'business':
        // Business fields are optional, but if employee_count is provided, it should be valid
        if (persona.employee_count && parseInt(persona.employee_count) <= 0) {
          newErrors.employee_count = 'Employee count must be greater than 0'
        }
        break

      case 'health':
        // Health fields are all optional checkboxes
        break

      case 'education':
        // Education fields are optional
        break

      case 'review':
        // Final validation - check all required fields
        if (!persona.location.trim()) newErrors.location = 'Location is required'
        if (!persona.age.trim()) newErrors.age = 'Age is required'
        if (!persona.occupation.trim()) newErrors.occupation = 'Occupation is required'
        if (!persona.income_bracket.trim()) newErrors.income_bracket = 'Income bracket is required'
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [persona])

  const savePersona = useCallback(async () => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      const personaData = {
        user_id: user.id,
        location: persona.location,
        age: parseInt(persona.age),
        occupation: persona.occupation,
        dependents: parseInt(persona.dependents),
        income_bracket: persona.income_bracket,
        business_type: persona.business_type || null,
        employee_count: persona.employee_count ? parseInt(persona.employee_count) : null,
        has_health_insurance: persona.has_health_insurance,
        has_medicare: persona.has_medicare,
        has_social_security: persona.has_social_security,
        school_district: persona.school_district || null,
        has_higher_education: persona.has_higher_education
      }

      // Check if persona already exists
      const { data: existingPersona } = await supabase
        .from('personas')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      let error
      if (existingPersona) {
        // Update existing persona
        const result = await supabase
          .from('personas')
          .update(personaData)
          .eq('user_id', user.id)
        error = result.error
      } else {
        // Create new persona
        const result = await supabase
          .from('personas')
          .insert(personaData)
        error = result.error
      }

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error saving persona:', error)
      throw error
    }
  }, [persona, user, supabase])

  const loadExistingPersona = useCallback(async () => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error loading persona:', error)
        return
      }

      if (data) {
        setPersona({
          location: data.location,
          age: data.age.toString(),
          occupation: data.occupation,
          dependents: data.dependents.toString(),
          income_bracket: data.income_bracket,
          business_type: data.business_type || '',
          employee_count: data.employee_count ? data.employee_count.toString() : '',
          has_health_insurance: data.has_health_insurance,
          has_medicare: data.has_medicare,
          has_social_security: data.has_social_security,
          school_district: data.school_district || '',
          has_higher_education: data.has_higher_education
        })
      }
    } catch (error) {
      console.error('Error loading persona:', error)
    }
  }, [user, supabase])

  const contextValue: PersonaContextType = {
    persona,
    updatePersona,
    updateMultipleFields,
    validateCurrentStep,
    savePersona,
    loadExistingPersona,
    errors,
    clearErrors
  }

  return (
    <PersonaContext.Provider value={contextValue}>
      {children}
    </PersonaContext.Provider>
  )
}

export function usePersona() {
  const context = useContext(PersonaContext)
  if (!context) {
    throw new Error('usePersona must be used within a PersonaProvider')
  }
  return context
} 