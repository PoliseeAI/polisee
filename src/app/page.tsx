import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { 
  BookOpen, 
  Users, 
  Shield, 
  Zap, 
  Search, 
  FileText, 
  Github, 
  Heart,
  ArrowRight,
  CheckCircle,
  Globe
} from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Polisee
            </h1>
            <p className="text-2xl text-gray-600 mb-4">
              Personalized Legislative Impact Analyzer
            </p>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Transform complex legislative bills into personalized impact reports. 
              Understand how proposed laws affect <em>you</em> in minutes, not hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8">
                <Link href="/persona/create">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8" asChild>
                <Link href="#how-it-works">
                  Learn More
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              The Problem We're Solving
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6">
                <FileText className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Complex Bills</h3>
                <p className="text-gray-600">
                  Legislative bills can exceed 1,000 pages, making them impossible for citizens to review manually.
                </p>
              </div>
              <div className="p-6">
                <Users className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Engagement Gap</h3>
                <p className="text-gray-600">
                  Citizens struggle to understand how policy changes will affect their personal circumstances.
                </p>
              </div>
              <div className="p-6">
                <Shield className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Misinformation Risk</h3>
                <p className="text-gray-600">
                  AI summaries risk spreading misinformation without clear references to original sources.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              How Polisee Works
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Create Your Profile</h3>
                    <p className="text-gray-600">
                      Tell us about yourself - your location, occupation, family situation, and interests.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                    <span className="text-blue-600 font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">View Available Bills</h3>
                    <p className="text-gray-600">
                      Browse bills uploaded by our team and see AI-generated analysis tailored to your profile.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Get Personalized Results</h3>
                    <p className="text-gray-600">
                      Receive organized impact cards showing exactly how the bill affects you, with source citations.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Sample Impact Cards</h3>
                <div className="space-y-3">
                  <div className="border-l-4 border-green-500 pl-4 py-2">
                    <h4 className="font-medium text-green-800">Education Funding</h4>
                    <p className="text-sm text-gray-600">+$2.3B for K-12 schools in CA</p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4 py-2">
                    <h4 className="font-medium text-blue-800">Small Business Tax Credit</h4>
                    <p className="text-sm text-gray-600">Up to $15K for businesses with &lt;10 employees</p>
                  </div>
                  <div className="border-l-4 border-purple-500 pl-4 py-2">
                    <h4 className="font-medium text-purple-800">Medicare Changes</h4>
                    <p className="text-sm text-gray-600">Prescription drug cost caps for seniors</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Key Features
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Zap className="h-8 w-8 text-blue-500 mb-2" />
                  <CardTitle>Lightning Fast</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Get personalized bill analysis in under 30 seconds using advanced AI and semantic search.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <Search className="h-8 w-8 text-green-500 mb-2" />
                  <CardTitle>Source Verified</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Every claim is backed by direct citations to the original bill text, ensuring accuracy and transparency.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <Users className="h-8 w-8 text-purple-500 mb-2" />
                  <CardTitle>Truly Personal</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Analysis tailored to your unique circumstances - location, occupation, family, and interests.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Who Benefits from Polisee?
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <h3 className="text-xl font-semibold mb-4">📚 Educators</h3>
                <p className="text-gray-600 mb-4">
                  Teachers and education professionals can quickly identify funding changes, 
                  policy updates, and reforms that affect their schools and students.
                </p>
                <div className="flex items-center text-sm text-gray-500">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Education funding • Teacher benefits • School policies
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <h3 className="text-xl font-semibold mb-4">🏢 Small Business Owners</h3>
                <p className="text-gray-600 mb-4">
                  Entrepreneurs can discover tax credits, regulatory changes, and 
                  opportunities that impact their business operations.
                </p>
                <div className="flex items-center text-sm text-gray-500">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Tax credits • Regulations • Business incentives
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <h3 className="text-xl font-semibold mb-4">🏥 Seniors & Retirees</h3>
                <p className="text-gray-600 mb-4">
                  Older adults can stay informed about Social Security, Medicare, 
                  and healthcare changes that affect their benefits.
                </p>
                <div className="flex items-center text-sm text-gray-500">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Medicare • Social Security • Healthcare
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <h3 className="text-xl font-semibold mb-4">📊 Policy Advocates</h3>
                <p className="text-gray-600 mb-4">
                  Researchers and advocates can perform deep analysis with 
                  exportable reports and detailed source citations.
                </p>
                <div className="flex items-center text-sm text-gray-500">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Detailed analysis • Export reports • Source citations
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="py-16 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-full p-4 shadow-lg">
                <Github className="h-12 w-12 text-gray-800" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Open Source & Community Driven
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Polisee is built by the community, for the community. Our code is open source, 
              transparent, and available for anyone to review, contribute to, or improve.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="flex items-center justify-center space-x-2">
                <Github className="h-5 w-5 text-gray-600" />
                <span className="text-gray-600">Open Source</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Globe className="h-5 w-5 text-gray-600" />
                <span className="text-gray-600">Community Driven</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Heart className="h-5 w-5 text-gray-600" />
                <span className="text-gray-600">Free Forever</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" size="lg" asChild>
                <Link href="https://github.com/yourusername/polisee" target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 h-5 w-5" />
                  View on GitHub
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/contribute">
                  Contribute to Polisee
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              Ready to Understand How Laws Affect You?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of citizens who are staying informed about legislation that matters to them.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild className="text-lg px-8">
                <Link href="/persona/create">
                  Start Analyzing Bills <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8 border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="#how-it-works">
                  Learn More
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
