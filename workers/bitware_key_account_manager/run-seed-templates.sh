#!/bin/bash

echo "🌱 Seeding pipeline templates into KAM database..."

# Run the seed SQL file
wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --file=./seed-templates.sql

echo "✅ Templates seeded successfully!"

# Verify the templates were inserted
echo ""
echo "📋 Verifying templates..."
wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --command="SELECT template_name, display_name, category FROM pipeline_template_cache ORDER BY category, display_name;"