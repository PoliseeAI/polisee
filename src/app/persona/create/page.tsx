import { PersonaWizard } from '@/components/persona/PersonaWizard'
import { AuthGuard } from '@/components/auth'

export default function CreatePersona() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Create Your Persona
              </h1>
              <p className="text-gray-600 text-lg">
                Help us understand your situation so we can provide personalized legislative analysis
              </p>
            </div>
            
            <PersonaWizard />
          </div>
        </div>
      </div>
    </AuthGuard>
  )
} 