# User Preferences Migration Guide

This guide explains how to apply the user preferences migration to your Supabase database.

## 📋 What This Migration Does

The migration adds a new `user_preferences` table that enables:

- **Notification Settings**: Control analysis completion, weekly digest, and feature notifications
- **Privacy Settings**: Data retention and analytics preferences
- **Profile Information**: First name, last name, and bio
- **Security**: Row Level Security (RLS) policies for data protection

## 🚀 How to Run the Migration

### Option 1: Using NPM Script (Recommended)

```bash
npm run db:migrate:user-preferences
```

### Option 2: Using Shell Script Directly

```bash
./scripts/run-migration.sh
```

### Option 3: Manual Application

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `supabase/migrations/20250109000000_add_user_preferences.sql`
4. Run the SQL query

## 📦 Migration File

The migration is located at:
```
supabase/migrations/20250109000000_add_user_preferences.sql
```

## 🔧 Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Connected to your Supabase project
- Project root directory

## ✅ Verification

After running the migration, verify it worked by:

1. Checking the `user_preferences` table exists in your Supabase dashboard
2. Testing the settings page at `/settings`
3. Verifying RLS policies are in place

## 🎯 Next Steps

Once the migration is complete:

1. **Test the Settings Page**: Navigate to `/settings` and verify all functionality works
2. **User Onboarding**: New users will have default preferences created
3. **Privacy Compliance**: Users can now control their data retention and analytics preferences

## 🆘 Troubleshooting

- **"supabase not found"**: Install Supabase CLI with `npm install -g supabase`
- **"Permission denied"**: Make sure the script is executable with `chmod +x scripts/run-migration.sh`
- **"config.toml not found"**: Run from the project root directory

## 📝 Migration Details

The migration creates:
- `user_preferences` table with proper constraints
- RLS policies for secure data access
- Indexes for optimal performance
- Triggers for automatic timestamp updates
- Functions for user preference management 