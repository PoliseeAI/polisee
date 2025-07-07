# Polisee

Polisee is a Next.js application built with TypeScript, featuring Supabase integration and comprehensive security measures.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + Shadcn/ui
- **Authentication**: Supabase Auth
- **Security**: Gitleaks for secret detection

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for database)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd polisee
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

4. **Set up security tools**:
   ```bash
   ./scripts/setup-gitleaks.sh
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database
- `npm run db:test` - Test database connection
- `npm run db:status` - Check database status
- `npm run db:push` - Push local migrations to Supabase
- `npm run db:pull` - Pull database schema from Supabase
- `npm run db:types` - Generate TypeScript types from database

### Security
- `npm run security:scan` - Scan entire repository for secrets
- `npm run security:scan-staged` - Scan only staged files
- `npm run security:scan-commits` - Scan commit history
- `npm run security:baseline` - Create baseline for existing secrets
- `npm run precommit` - Run pre-commit security checks

### Supabase
- `npm run supabase:status` - Check Supabase status
- `npm run supabase:start` - Start local Supabase
- `npm run supabase:stop` - Stop local Supabase

## Security

This project includes comprehensive security measures:

- **Secret Detection**: Gitleaks scans for exposed secrets
- **Automated Scanning**: GitHub Actions run security checks on PRs
- **Environment Variables**: Secure handling of sensitive data
- **Dependency Scanning**: Regular vulnerability checks

See [Security Documentation](./docs/SECURITY.md) for detailed information.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
