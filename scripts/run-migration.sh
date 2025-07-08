#!/bin/bash

# Polisee - Run User Preferences Migration
# This script applies the user preferences migration to Supabase

set -e

echo "🚀 Running User Preferences Migration..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Run the migration
echo "📦 Applying migration: 20250109000000_add_user_preferences.sql"
supabase db push

echo "✅ Migration completed successfully!"
echo ""
echo "📋 What was added:"
echo "   • user_preferences table with notification, privacy, and profile settings"
echo "   • RLS policies for secure access"
echo "   • Automatic timestamp updates"
echo "   • Proper indexes for performance"
echo ""
echo "🔧 Next steps:"
echo "   1. The settings page is now fully functional"
echo "   2. Users can manage their notification preferences"
echo "   3. Privacy settings are available"
echo "   4. Profile information can be updated"
echo ""
echo "🎯 Test the settings page at: http://localhost:3000/settings" 