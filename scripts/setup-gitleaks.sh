#!/bin/bash
# Setup script for gitleaks

set -e

echo "🔒 Setting up Gitleaks for Polisee repository..."

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "📦 Installing gitleaks via Homebrew..."
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew is not installed. Please install Homebrew first."
        exit 1
    fi
    
    if ! command -v gitleaks &> /dev/null; then
        brew install gitleaks
    else
        echo "✅ Gitleaks is already installed"
        gitleaks version
    fi
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "📦 Installing gitleaks via package manager..."
    if command -v apt-get &> /dev/null; then
        # Ubuntu/Debian
        sudo apt-get update
        sudo apt-get install -y gitleaks
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        sudo yum install -y gitleaks
    elif command -v dnf &> /dev/null; then
        # Fedora
        sudo dnf install -y gitleaks
    else
        echo "❌ Unsupported Linux distribution"
        exit 1
    fi
else
    echo "❌ Unsupported operating system: $OSTYPE"
    exit 1
fi

echo "🔍 Running initial gitleaks scan..."
if gitleaks detect --source . --verbose; then
    echo "✅ No secrets detected in the repository!"
else
    echo "⚠️  Secrets detected! Please review the output above."
    echo "💡 You can create a baseline file to ignore existing secrets:"
    echo "   npm run security:baseline"
    echo "   Then commit the .gitleaks-baseline.json file"
fi

echo "🎉 Gitleaks setup complete!"
echo ""
echo "📝 Available commands:"
echo "  npm run security:scan          - Scan entire repository"
echo "  npm run security:scan-staged   - Scan only staged files"
echo "  npm run security:scan-commits  - Scan commit history"
echo "  npm run security:baseline      - Create baseline file"
echo "  npm run precommit              - Run pre-commit security check"
echo ""
echo "🔗 GitHub Actions will automatically run gitleaks on pull requests."
echo "📋 Configuration is in .gitleaks.toml - modify as needed." 