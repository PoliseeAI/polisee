# Contributing to Polisee

First off, thank you for considering contributing to Polisee! It's people like you that make Polisee such a great tool for democratizing access to legislative information.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [What Should I Know Before I Get Started?](#what-should-i-know-before-i-get-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Process](#development-process)
- [Style Guides](#style-guides)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@polisee.com](mailto:conduct@polisee.com).

### Our Standards

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

## What Should I Know Before I Get Started?

### Project Architecture

Polisee is built with:
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, and Shadcn UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI Integration**: OpenAI API for analysis generation
- **Data Source**: Congress.gov API for legislative data

### Key Concepts

1. **Personas**: User profiles that define demographic information for personalized analysis
2. **Bill Analysis**: AI-generated impact reports based on user personas
3. **Source Citations**: Verifiable links between analysis claims and bill text
4. **Admin Flow**: [[memory:2518544]] Administrators upload and manage bills while users consume analysis

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Screenshots** (if applicable)
- **Environment details** (OS, browser, Node.js version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Step-by-step description** of the suggested enhancement
- **Specific examples** to demonstrate the steps
- **Explanation of why** this enhancement would be useful

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:

- `good first issue` - Simple issues for beginners
- `help wanted` - Issues where we need community help
- `documentation` - Documentation improvements

## Development Process

### Setting Up Your Development Environment

1. **Fork and clone** the repository
   ```bash
   git clone https://github.com/your-username/polisee.git
   cd polisee
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && pip install -r requirements.txt && cd ..
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Add your API keys and configuration
   ```

4. **Set up the database**
   - Create a Supabase project
   - Run migrations from `supabase/migrations/` in SQL editor
   - Configure Storage bucket for bills

5. **Run development server**
   ```bash
   npm run dev
   ```

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, self-documenting code
   - Add comments for complex logic
   - Update tests as needed
   - Update documentation

3. **Test your changes**
   ```bash
   npm run lint
   npm run test
   npm run build
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

### Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only changes
- `style:` Code style changes (formatting, missing semicolons, etc)
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Changes to build process or auxiliary tools

Examples:
```
feat: add PDF annotation feature
fix: resolve persona creation validation error
docs: update API documentation for bill search
```

## Style Guides

### TypeScript Style Guide

- Use TypeScript for all new code
- Define interfaces for all data structures
- Use meaningful variable and function names
- Prefer `const` over `let`
- Use async/await over promises when possible

### React/Next.js Style Guide

- Use functional components with hooks
- Keep components small and focused
- Use proper TypeScript types for props
- Implement error boundaries for critical components
- Use Suspense for async components

### CSS/Tailwind Style Guide

- Use Tailwind utility classes
- Keep custom CSS minimal
- Use Shadcn UI components when available
- Ensure responsive design
- Test on mobile devices

### Database Guidelines

- Always use Row Level Security (RLS)
- Create proper indexes for performance
- Document schema changes
- Test migrations thoroughly

## Pull Request Process

1. **Update documentation** for any changed functionality
2. **Add tests** for new features
3. **Ensure all tests pass** locally
4. **Update the README.md** if needed
5. **Request review** from maintainers

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No console.log statements
- [ ] No exposed secrets or API keys

### Review Process

1. At least one maintainer approval required
2. All CI checks must pass
3. No merge conflicts
4. Up-to-date with main branch

## Testing

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

### Writing Tests

- Write tests for all new features
- Aim for >80% code coverage
- Test edge cases
- Use meaningful test descriptions
- Mock external services

## Documentation

### Where to Add Documentation

- **Code comments**: For complex logic
- **README.md**: For major features or setup changes
- **docs/**: For detailed guides
- **API documentation**: In `docs/API.md`
- **JSDoc comments**: For all public functions

### Documentation Style

- Use clear, concise language
- Include code examples
- Keep it up-to-date
- Add diagrams where helpful

## Community

### Getting Help

- **Discord**: [Join our Discord](https://discord.gg/polisee)
- **GitHub Discussions**: For general questions
- **Stack Overflow**: Tag questions with `polisee`

### Staying Updated

- Watch the repository for updates
- Subscribe to our newsletter
- Follow [@poliseeai](https://twitter.com/poliseeai) on Twitter

## Recognition

Contributors will be:
- Listed in our CONTRIBUTORS.md file
- Mentioned in release notes
- Given credit in our documentation

## Questions?

Don't hesitate to ask questions! The Polisee community is here to help. Reach out through:
- GitHub issues
- Discord community
- Email: contribute@polisee.com

Thank you for contributing to Polisee! 🎉 