# Security Guidelines for Polisee

## Overview

This document outlines the security practices and tools implemented in the Polisee project to protect against secrets leakage and maintain code security.

## Gitleaks Integration

Gitleaks is integrated into our development workflow to detect and prevent secrets from being committed to the repository.

### Setup

1. **Install Gitleaks**:
   ```bash
   # Run the setup script
   ./scripts/setup-gitleaks.sh
   
   # Or install manually on macOS
   brew install gitleaks
   ```

2. **Configuration**: 
   - Main config: `.gitleaks.toml`
   - Baseline: `.gitleaks-baseline.json` (if created)

### Usage

#### Development Commands

```bash
# Scan entire repository
npm run security:scan

# Scan only staged files (recommended before commit)
npm run security:scan-staged

# Scan commit history
npm run security:scan-commits

# Run pre-commit security check
npm run precommit
```

#### Creating a Baseline

If you have existing secrets that cannot be removed immediately:

```bash
# Create a baseline to ignore existing secrets
npm run security:baseline

# Commit the baseline file
git add .gitleaks-baseline.json
git commit -m "Add gitleaks baseline"
```

### CI/CD Integration

Gitleaks runs automatically on:
- Pull requests to `main` or `develop` branches
- Pushes to `main` or `develop` branches

The GitHub Actions workflow (`.github/workflows/security.yml`) includes:
- Secret detection with gitleaks
- Dependency vulnerability scanning with npm audit
- SARIF file upload for GitHub Security tab

### Configuration Details

#### Custom Rules

Our `.gitleaks.toml` includes specific rules for:
- Supabase API keys
- NextAuth secrets
- JWT secrets
- General API keys and tokens

#### Allowlisted Patterns

The following are allowlisted to reduce false positives:
- Documentation files (`.md`, `.txt`)
- Configuration files (`package.json`, `tsconfig.json`, etc.)
- Public directories
- Test/example/placeholder values

### Best Practices

1. **Pre-commit Scanning**: Always run `npm run security:scan-staged` before committing
2. **Environment Variables**: Use `.env.local` for local secrets (already in `.gitignore`)
3. **Supabase Keys**: 
   - Use environment variables for API keys
   - Never commit service role keys
   - Use Row Level Security (RLS) for database access
4. **Regular Scanning**: Run `npm run security:scan` periodically

### Handling Detected Secrets

If gitleaks detects a secret:

1. **Before Commit**: Remove the secret and use environment variables
2. **After Commit**: 
   - Remove the secret from code
   - Rotate/revoke the compromised secret
   - Use `git filter-branch` or BFG Repo-Cleaner to remove from history
   - Update the baseline if necessary

### Environment Variables

Store secrets in environment variables:

```bash
# .env.local (not tracked by git)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
```

### Troubleshooting

#### False Positives

If gitleaks flags a false positive:
1. Add the pattern to the allowlist in `.gitleaks.toml`
2. Or add specific file paths to the allowlist

#### Updating Rules

To modify detection rules:
1. Edit `.gitleaks.toml`
2. Test with `npm run security:scan`
3. Commit the updated configuration

### Resources

- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [Gitleaks Configuration](https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml)
- [OWASP Secrets Management](https://owasp.org/www-project-secrets-management-cheat-sheet/)

## Additional Security Measures

### Dependency Scanning

- `npm audit` runs in CI to detect vulnerable dependencies
- Regular dependency updates recommended

### Supabase Security

- Row Level Security (RLS) enabled on all tables
- Service role key used only server-side
- Anonymous key used for client-side operations

### Code Review

- All pull requests require review
- Security-focused code review guidelines
- Automated security checks must pass

---

For security issues or questions, please contact the development team. 