# Security Documentation

## Secret Detection

We use multiple tools to detect secrets and sensitive information in our codebase:

### 1. TruffleHog (Primary - Free)
- **What it does**: Detects secrets using entropy analysis and regex patterns
- **Why we use it**: Free, no license required, very effective
- **Runs on**: Every push and pull request via GitHub Actions

### 2. Gitleaks (Secondary - Local Development)
- **What it does**: Detects secrets using configurable rules
- **Configuration**: `.gitleaks.toml` in the root directory
- **Usage**: Primarily for local development

## GitHub Actions Security Scan

Our security workflow (`.github/workflows/security.yml`) includes:

1. **Secret Detection** - Uses TruffleHog + local gitleaks
2. **Dependency Scanning** - Uses npm audit for vulnerability checking
3. **SARIF Upload** - Results are uploaded to GitHub Security tab

## Local Development

### Running Security Scans

```bash
# Run gitleaks scan
npm run security:scan

# Run TruffleHog scan (requires Docker)
npm run security:trufflehog

# Run both scans
npm run security:full

# Scan only staged files (good for pre-commit)
npm run security:scan-staged

# Create baseline file to ignore existing findings
npm run security:baseline
```

### Pre-commit Hook

The `precommit` script runs automatically before commits to check staged files:

```bash
npm run precommit
```

## Configuration

### Gitleaks Configuration (`.gitleaks.toml`)

Our configuration includes:
- Custom rules for Supabase keys
- NextAuth and JWT secret detection
- Allowlist for false positives
- Stopwords to reduce noise

### TruffleHog Configuration

TruffleHog runs with:
- `--only-verified` flag to reduce false positives
- `--debug` for detailed output in CI

## Common Issues

### 1. False Positives
- Add patterns to the allowlist in `.gitleaks.toml`
- Use the baseline file for persistent ignores

### 2. Gitleaks License Error
- **Solution**: We've switched to TruffleHog for CI/CD
- **Local use**: Gitleaks is still free for local development

### 3. Missing Dependencies
- **TruffleHog**: Requires Docker for local usage
- **Gitleaks**: Install via `brew install gitleaks` or run setup script

## Best Practices

1. **Never commit secrets** - Use environment variables
2. **Use .env.local** for local development secrets
3. **Run security scans** before committing
4. **Review scan results** carefully
5. **Update configurations** as needed

## Emergency Response

If secrets are accidentally committed:

1. **Immediately rotate** the compromised credentials
2. **Remove from git history** using `git filter-branch` or BFG
3. **Update baseline** if needed
4. **Notify team** about the incident

## Resources

- [TruffleHog Documentation](https://trufflesecurity.com/trufflehog)
- [Gitleaks Documentation](https://gitleaks.io/)
- [GitHub Security Features](https://docs.github.com/en/code-security) 