#!/bin/bash

# Script to run the signature tracking migration
# This adds the letter_signatures and letter_signature_analytics tables

echo "🚀 Running signature tracking migration..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ This doesn't appear to be a Supabase project (no config.toml found)"
    exit 1
fi

# Apply the migration
echo "📁 Applying migration: 20250115000000_add_signature_tracking.sql"

# Run the migration
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📊 New tables created:"
    echo "   - letter_signatures: Stores individual signatures"
    echo "   - letter_signature_analytics: Tracks signature campaign metrics"
    echo ""
    echo "🔄 You may want to regenerate your database types:"
    echo "   npm run db:types"
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi

echo "✨ Signature tracking system is now ready!" 