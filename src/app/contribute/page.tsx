'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Github, Mail, MessageSquare, Users, Code2, BookOpen, 
  Bug, Sparkles, GitBranch, Shield, Zap, Heart, ExternalLink,
  CheckCircle2, Circle, ChevronRight, Copy, Check, FileText,
  Rocket, Target, Lightbulb, HelpCircle, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ContributePage() {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = (text: string, command: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const contributionTypes = [
    {
      icon: <Bug className="h-5 w-5" />,
      title: 'Report Bugs',
      description: 'Help us identify and fix issues to improve stability',
      link: 'https://github.com/PoliseeAI/polisee/issues/new?template=bug_report.md',
      priority: 'high',
      skills: ['Testing', 'Attention to Detail']
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: 'Request Features',
      description: 'Share your ideas for new functionality and improvements',
      link: 'https://github.com/PoliseeAI/polisee/issues/new?template=feature_request.md',
      priority: 'medium',
      skills: ['Product Thinking', 'User Experience']
    },
    {
      icon: <Code2 className="h-5 w-5" />,
      title: 'Submit Code',
      description: 'Contribute directly with pull requests for bugs or features',
      link: 'https://github.com/PoliseeAI/polisee/pulls',
      priority: 'high',
      skills: ['TypeScript', 'React', 'Next.js']
    },
    {
      icon: <BookOpen className="h-5 w-5" />,
      title: 'Improve Documentation',
      description: 'Help make our docs clearer and more comprehensive',
      link: 'https://github.com/PoliseeAI/polisee/tree/main/docs',
      priority: 'medium',
      skills: ['Technical Writing', 'Communication']
    }
  ];

  const setupSteps = [
    {
      command: 'git clone https://github.com/PoliseeAI/polisee.git',
      description: 'Clone the repository'
    },
    {
      command: 'cd polisee',
      description: 'Navigate to project directory'
    },
    {
      command: 'npm install',
      description: 'Install dependencies'
    },
    {
      command: 'cp .env.example .env.local',
      description: 'Set up environment variables'
    },
    {
      command: 'npm run dev',
      description: 'Start development server'
    }
  ];

  const techStack = [
    { name: 'Next.js 15', category: 'framework' },
    { name: 'TypeScript', category: 'language' },
    { name: 'Tailwind CSS', category: 'styling' },
    { name: 'Supabase', category: 'backend' },
    { name: 'OpenAI API', category: 'ai' },
    { name: 'Shadcn UI', category: 'components' }
  ];

  const contributionGuidelines = [
    {
      icon: <GitBranch className="h-4 w-4" />,
      title: 'Branch Naming',
      description: 'Use descriptive names: feature/*, fix/*, docs/*'
    },
    {
      icon: <CheckCircle2 className="h-4 w-4" />,
      title: 'Code Quality',
      description: 'Run linting and tests before submitting PRs'
    },
    {
      icon: <MessageSquare className="h-4 w-4" />,
      title: 'Clear Communication',
      description: 'Write descriptive commit messages and PR descriptions'
    },
    {
      icon: <Shield className="h-4 w-4" />,
      title: 'Security First',
      description: 'Never commit sensitive data or API keys'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="https://github.com/PoliseeAI/polisee/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer">
                <FileText className="mr-2 h-4 w-4" />
                Full Guidelines
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="https://github.com/PoliseeAI/polisee/blob/main/CODE_OF_CONDUCT.md" target="_blank" rel="noopener noreferrer">
                <Shield className="mr-2 h-4 w-4" />
                Code of Conduct
              </Link>
            </Button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Heart className="h-4 w-4" />
            Open Source Project
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contribute to Polisee</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join our mission to democratize access to legislative information and help citizens understand how bills affect their lives
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">100+</div>
              <p className="text-sm text-muted-foreground">Contributors</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">MIT</div>
              <p className="text-sm text-muted-foreground">License</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">1,000+</div>
              <p className="text-sm text-muted-foreground">Commits</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">Active</div>
              <p className="text-sm text-muted-foreground">Development</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="contribute" className="mb-12">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="contribute">Ways to Contribute</TabsTrigger>
            <TabsTrigger value="setup">Getting Started</TabsTrigger>
            <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
          </TabsList>

          <TabsContent value="contribute" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {contributionTypes.map((type, index) => (
                <Card key={index} className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {type.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{type.title}</CardTitle>
                          <CardDescription>{type.description}</CardDescription>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={type.link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {type.skills.map((skill, skillIndex) => (
                        <Badge key={skillIndex} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>First Time Contributing?</AlertTitle>
              <AlertDescription>
                Look for issues tagged with{' '}
                <Link 
                  href="https://github.com/PoliseeAI/polisee/labels/good%20first%20issue" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-4"
                >
                  "good first issue"
                </Link>
                {' '}for beginner-friendly tasks.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="setup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Prerequisites</CardTitle>
                <CardDescription>
                  Make sure you have these installed before starting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-primary" />
                    <span>Node.js 18+ and npm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-primary" />
                    <span>Git for version control</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-primary" />
                    <span>A code editor (VS Code recommended)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Setup</CardTitle>
                <CardDescription>
                  Get Polisee running locally in 5 minutes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {setupSteps.map((step, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 font-mono text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{index + 1}.</span>
                        <div>
                          <code className="text-primary">{step.command}</code>
                          <p className="text-xs text-muted-foreground mt-1 font-sans">
                            {step.description}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(step.command, `cmd-${index}`)}
                      >
                        {copiedCommand === `cmd-${index}` ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tech Stack</CardTitle>
                <CardDescription>
                  Familiarize yourself with our technology choices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {techStack.map((tech, index) => (
                    <Badge 
                      key={index} 
                      variant={tech.category === 'framework' ? 'default' : 'secondary'}
                    >
                      {tech.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guidelines" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {contributionGuidelines.map((guideline, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {guideline.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{guideline.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {guideline.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                All contributions must adhere to our{' '}
                <Link 
                  href="https://github.com/PoliseeAI/polisee/blob/main/CODE_OF_CONDUCT.md" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-4"
                >
                  Code of Conduct
                </Link>
                . We're committed to providing a welcoming and inclusive environment.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Pull Request Process</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">
                      1
                    </span>
                    <span className="text-sm">Fork the repository and create your branch from main</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">
                      2
                    </span>
                    <span className="text-sm">Make your changes and ensure tests pass</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">
                      3
                    </span>
                    <span className="text-sm">Update documentation if needed</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">
                      4
                    </span>
                    <span className="text-sm">Submit a pull request with a clear title and description</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">
                      5
                    </span>
                    <span className="text-sm">Address any review feedback promptly</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA Section */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Rocket className="h-12 w-12 mx-auto text-primary" />
              <h2 className="text-2xl font-semibold">Ready to Make an Impact?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Every contribution, no matter how small, helps make legislative information more accessible to citizens.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button size="lg" asChild>
                  <Link href="https://github.com/PoliseeAI/polisee" target="_blank" rel="noopener noreferrer">
                    <Github className="mr-2 h-5 w-5" />
                    View on GitHub
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="https://github.com/PoliseeAI/polisee/issues" target="_blank" rel="noopener noreferrer">
                    <Target className="mr-2 h-5 w-5" />
                    Browse Open Issues
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="mt-12 text-center space-y-4">
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link 
              href="https://github.com/PoliseeAI/polisee/discussions" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Join Discussions
            </Link>
            <Link 
              href="mailto:contact@polisee.com" 
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="h-4 w-4" />
              Contact Team
            </Link>
            <Link 
              href="https://github.com/PoliseeAI/polisee/blob/main/docs/SECURITY.md" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <Shield className="h-4 w-4" />
              Security Policy
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Thank you for helping us build a more transparent democracy 💙
          </p>
        </div>
      </div>
    </div>
  );
}