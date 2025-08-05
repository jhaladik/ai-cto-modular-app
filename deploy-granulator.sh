#!/bin/bash

echo "🚀 Deploying Content Granulator to Production"
echo "============================================"
echo ""
echo "This script will guide you through the deployment process."
echo ""

# Step 1: Create D1 Database
echo "📊 Step 1: Create D1 Database"
echo "Run the following command to create the database:"
echo ""
echo "wrangler d1 create content-granulator-db"
echo ""
echo "Copy the database_id from the output and update wrangler.toml"
echo "Press Enter when done..."
read

# Step 2: Create KV Namespaces
echo ""
echo "🗄️ Step 2: Create KV Namespaces"
echo "Run these commands to create the KV namespaces:"
echo ""
echo "wrangler kv:namespace create TEMPLATE_CACHE"
echo "wrangler kv:namespace create JOB_CACHE"
echo ""
echo "Copy the namespace IDs and update wrangler.toml"
echo "Press Enter when done..."
read

# Step 3: Create R2 Bucket
echo ""
echo "📦 Step 3: Create R2 Bucket"
echo "Run this command to create the R2 bucket:"
echo ""
echo "wrangler r2 bucket create granulator-structures"
echo ""
echo "Press Enter when done..."
read

# Step 4: Deploy the Worker
echo ""
echo "🔧 Step 4: Deploy the Worker"
echo "Now we'll deploy the worker with secrets..."
echo ""

cd workers/bitware_content_granulator

# Install dependencies
echo "Installing dependencies..."
npm install

# Deploy the worker
echo "Deploying worker..."
./deploy.sh

# Initialize database
echo ""
echo "📊 Initializing database..."
echo "Run: npm run db:init"
echo "Press Enter when done..."
read

# Seed database
echo ""
echo "🌱 Seeding database with templates..."
echo "Run: npm run db:seed"
echo "Press Enter when done..."
read

cd ../..

# Step 5: Deploy Frontend
echo ""
echo "🎨 Step 5: Deploy Frontend"
echo "Now we'll deploy the updated frontend..."
echo ""

cd Pages
echo "Deploying Pages..."
wrangler pages deploy public --project-name=ai-factory-frontend

cd ..

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📝 Important URLs:"
echo "- Granulator Worker: https://bitware-content-granulator.YOUR_SUBDOMAIN.workers.dev"
echo "- Frontend: https://ai-factory-frontend.pages.dev"
echo ""
echo "🧪 Test the integration:"
echo "1. Login to the admin dashboard"
echo "2. Navigate to AI Workers > Content Granulator"
echo "3. Create a test granulation job"
echo ""
echo "📋 Checklist:"
echo "[ ] D1 Database created and ID in wrangler.toml"
echo "[ ] KV namespaces created and IDs in wrangler.toml"
echo "[ ] R2 bucket created"
echo "[ ] Worker deployed with secrets"
echo "[ ] Database initialized and seeded"
echo "[ ] Frontend deployed"
echo "[ ] Proxy endpoint working"