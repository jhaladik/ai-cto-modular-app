#!/bin/bash

echo "Testing Orchestrator v2 Database..."

# Check if tables exist
echo "Checking tables..."
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"

# Check stage_executions specifically
echo -e "\nChecking stage_executions table..."
wrangler d1 execute orchestrator-v2-db --remote --command="PRAGMA table_info(stage_executions)"

# Check for any existing stage executions
echo -e "\nChecking existing stage executions..."
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT COUNT(*) as count FROM stage_executions"

echo -e "\nDone!"