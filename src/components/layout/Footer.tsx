import Link from 'next/link'
import { Github, Twitter, Mail } from 'lucide-react'

const footerLinks = {
  product: [
    { name: 'Bills', href: '/bills' },
    { name: 'Feed', href: '/feed' },
    { name: 'Analysis', href: '/analyze' },
  ],
  company: [
    { name: 'About', href: '/about' },
    { name: 'Representatives', href: '/representatives' },
    { name: 'Propose', href: '/propose' },
  ],
  support: [
    { name: 'Settings', href: '/settings' },
    { name: 'Contact', href: 'mailto:support@poliseeai.com' },
    { name: 'Help', href: '/help' },
  ],
  legal: [
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms', href: '/terms' },
    { name: 'Security', href: '/security' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t bg-gray-50/50">
      <div className="container mx-auto py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-bold">Polisee</span>
            </Link>
            <p className="mt-4 text-sm text-gray-600 max-w-md">
              Transform complex legislation into personalized impact reports. 
              Understand how bills affect you personally with AI-powered analysis.
            </p>
            <div className="mt-6 flex space-x-4">
              <Link
                href="https://github.com/PoliseeAI/polisee"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <Github className="h-5 w-5" />
              </Link>
              <Link
                href="https://twitter.com/PoliseeAI"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="mailto:contact@poliseeai.com"
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <Mail className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Support</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} Polisee. All rights reserved.
            </p>
            <p className="text-sm text-gray-600 mt-2 md:mt-0">
              Built with ❤️ for democratic transparency
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
} 