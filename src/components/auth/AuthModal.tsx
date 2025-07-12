'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authUtils } from '@/lib/auth'
import { AlertCircle, Loader2, Eye, EyeOff, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthText } from '@/lib/password-validation'

interface AuthModalProps {
  children: React.ReactNode
  defaultMode?: 'signin' | 'signup'
}

export function AuthModal({ children, defaultMode = 'signin' }: AuthModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    confirmPassword?: string
    general?: string
  }>({})
  const [passwordValidation, setPasswordValidation] = useState(validatePassword(''))
  const router = useRouter()

  const validateForm = () => {
    const newErrors: typeof errors = {}
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else {
      const validation = validatePassword(formData.password)
      if (!validation.isValid) {
        newErrors.password = validation.errors[0] // Show the first error
      }
    }
    
    // Confirm password validation for signup
    if (mode === 'signup') {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password'
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      let result
      
      if (mode === 'signup') {
        result = await authUtils.signUp(formData.email, formData.password)
        if (result.error) {
          throw new Error(result.error.message)
        }
        toast.success('Account created successfully! Please check your email to verify your account.')
        setIsOpen(false)
      } else {
        result = await authUtils.signIn(formData.email, formData.password)
        if (result.error) {
          throw new Error(result.error.message)
        }
        toast.success('Welcome back!')
        setIsOpen(false)
        
        // Handle redirect after successful login
        const returnUrl = localStorage.getItem('returnUrl')
        if (returnUrl) {
          localStorage.removeItem('returnUrl')
          router.push(returnUrl)
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
      setErrors({
        general: error instanceof Error ? error.message : 'An unexpected error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleModeSwitch = (newMode: 'signin' | 'signup') => {
    setMode(newMode)
    setErrors({})
    setFormData({ email: '', password: '', confirmPassword: '' })
    setPasswordValidation(validatePassword(''))
  }

  const resetForm = () => {
    setFormData({ email: '', password: '', confirmPassword: '' })
    setErrors({})
    setMode(defaultMode)
    setPasswordValidation(validatePassword(''))
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetForm()
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </DialogTitle>
        </DialogHeader>
        
        <Card className="border-0 shadow-none">
          <CardHeader className="space-y-1 px-0">
            <CardTitle className="text-2xl text-center">
              {mode === 'signin' ? 'Welcome back' : 'Get started'}
            </CardTitle>
            <CardDescription className="text-center">
              {mode === 'signin' 
                ? 'Sign in to your account to continue' 
                : 'Create your account to get started with Polisee'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => {
                      const newPassword = e.target.value
                      setFormData(prev => ({ ...prev, password: newPassword }))
                      setPasswordValidation(validatePassword(newPassword))
                    }}
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* Password Strength Indicator */}
                {mode === 'signup' && formData.password && (
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4" />
                    <span className="text-gray-600">Password strength:</span>
                    <span className={getPasswordStrengthColor(passwordValidation.strength)}>
                      {getPasswordStrengthText(passwordValidation.strength)}
                    </span>
                  </div>
                )}
                
                {errors.password && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.password}
                  </p>
                )}
                
                {/* Show additional password errors for signup */}
                {mode === 'signup' && formData.password && passwordValidation.errors.length > 1 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm font-medium text-yellow-800 mb-1">Password requirements:</p>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {passwordValidation.errors.map((error, index) => (
                        <li key={index} className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm Password Field (Sign Up Only) */}
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              {/* General Error */}
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {errors.general}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  mode === 'signin' ? 'Sign In' : 'Create Account'
                )}
              </Button>
            </form>

            {/* Mode Switch */}
            <div className="mt-4 text-center text-sm">
              <span className="text-gray-600">
                {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
              </span>
              <button
                type="button"
                onClick={() => handleModeSwitch(mode === 'signin' ? 'signup' : 'signin')}
                className="ml-1 text-blue-600 hover:text-blue-500 font-medium"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
} 