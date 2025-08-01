#!/bin/bash
# kam_database_diagnostic.sh
# Diagnose and fix KAM database setup issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔍 KAM Database Diagnostic Tool${NC}"
echo "======================================"

# Step 1: Check if database exists and is accessible
echo -e "\n${BLUE}Step 1: Database Connectivity${NC}"
echo "Testing database connection..."

TABLES_RESULT=$(wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --command="SELECT name FROM sqlite_master WHERE type='table';" --remote 2>&1)

if echo "$TABLES_RESULT" | grep -q "Error\|error"; then
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Error: $TABLES_RESULT"
    echo ""
    echo -e "${YELLOW}Possible fixes:${NC}"
    echo "1. Check that KEY_ACCOUNT_MANAGEMENT_DB exists in wrangler.toml"
    echo "2. Verify database was created: wrangler d1 list"
    echo "3. Check wrangler authentication: wrangler auth list"
    exit 1
else
    echo -e "${GREEN}✅ Database connection successful${NC}"
    echo "Existing tables:"
    echo "$TABLES_RESULT"
fi

# Step 2: Check if required tables exist
echo -e "\n${BLUE}Step 2: Required Tables Check${NC}"

REQUIRED_TABLES=("clients" "users" "user_sessions")
MISSING_TABLES=()

for table in "${REQUIRED_TABLES[@]}"; do
    if echo "$TABLES_RESULT" | grep -q "$table"; then
        echo -e "${GREEN}✅ Table '$table' exists${NC}"
    else
        echo -e "${RED}❌ Table '$table' missing${NC}"
        MISSING_TABLES+=("$table")
    fi
done

# Step 3: Apply schema if tables are missing
if [ ${#MISSING_TABLES[@]} -gt 0 ]; then
    echo -e "\n${YELLOW}⚠️ Missing tables detected. Applying schema...${NC}"
    
    if [ -f "schema_extension_unified.sql" ]; then
        echo "Applying schema_extension_unified.sql..."
        SCHEMA_RESULT=$(wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --file=schema_extension_unified.sql --remote 2>&1)
        
        if echo "$SCHEMA_RESULT" | grep -q "Error\|error"; then
            echo -e "${RED}❌ Schema application failed${NC}"
            echo "Error: $SCHEMA_RESULT"
        else
            echo -e "${GREEN}✅ Schema applied successfully${NC}"
        fi
    else
        echo -e "${RED}❌ schema_extension_unified.sql file not found${NC}"
        echo "Please create the schema file first."
        exit 1
    fi
fi

# Step 4: Check if default admin user exists
echo -e "\n${BLUE}Step 4: Default Admin User Check${NC}"

ADMIN_CHECK=$(wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --command="SELECT user_id, email, role FROM users WHERE email='admin@company.com';" --remote 2>&1)

if echo "$ADMIN_CHECK" | grep -q "admin@company.com"; then
    echo -e "${GREEN}✅ Default admin user exists${NC}"
    echo "$ADMIN_CHECK"
else
    echo -e "${RED}❌ Default admin user missing${NC}"
    echo "Creating default admin user..."
    
    # Create admin user with correct password hash
    CREATE_ADMIN=$(wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --command="
    INSERT OR REPLACE INTO users (
        user_id, username, email, password_hash, role, full_name, status, created_at
    ) VALUES (
        'admin_001',
        'admin',
        'admin@company.com',
        'YWRtaW4xMjNzYWx0',
        'admin',
        'System Administrator',
        'active',
        datetime('now')
    );" --remote 2>&1)
    
    if echo "$CREATE_ADMIN" | grep -q "Error\|error"; then
        echo -e "${RED}❌ Failed to create admin user${NC}"
        echo "Error: $CREATE_ADMIN"
    else
        echo -e "${GREEN}✅ Admin user created successfully${NC}"
    fi
fi

# Step 5: Test password hashing
echo -e "\n${BLUE}Step 5: Password Hash Verification${NC}"

echo "Testing password hash for 'admin123'..."
# The hash should be base64('admin123salt') = 'YWRtaW4xMjNzYWx0'
EXPECTED_HASH="YWRtaW4xMjNzYWx0"

# Verify what's in the database
STORED_HASH=$(wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --command="SELECT password_hash FROM users WHERE email='admin@company.com';" --remote 2>&1)

echo "Expected hash: $EXPECTED_HASH"
echo "Stored hash: $STORED_HASH"

if echo "$STORED_HASH" | grep -q "$EXPECTED_HASH"; then
    echo -e "${GREEN}✅ Password hash matches${NC}"
else
    echo -e "${YELLOW}⚠️ Password hash mismatch. Updating...${NC}"
    
    UPDATE_HASH=$(wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --command="
    UPDATE users 
    SET password_hash = '$EXPECTED_HASH' 
    WHERE email = 'admin@company.com';" --remote 2>&1)
    
    if echo "$UPDATE_HASH" | grep -q "Error\|error"; then
        echo -e "${RED}❌ Failed to update password hash${NC}"
        echo "Error: $UPDATE_HASH"
    else
        echo -e "${GREEN}✅ Password hash updated${NC}"
    fi
fi

# Step 6: Create sample client if none exist
echo -e "\n${BLUE}Step 6: Sample Data Check${NC}"

CLIENT_COUNT=$(wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --command="SELECT COUNT(*) as count FROM clients;" --remote 2>&1)

if echo "$CLIENT_COUNT" | grep -q "0"; then
    echo -e "${YELLOW}⚠️ No clients found. Creating sample client...${NC}"
    
    CREATE_CLIENT=$(wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --command="
    INSERT INTO clients (
        client_id, company_name, primary_contact_name, primary_contact_email,
        subscription_tier, account_status, monthly_budget_usd, used_budget_current_month,
        industry, company_size, created_at,
        address
    ) VALUES (
        'client_sample_001',
        'TechCorp Solutions',
        'John Smith',
        'john@techcorp.com',
        'premium',
        'active',
        1000,
        450,
        'Technology',
        '50-200 employees',
        datetime('now'),
        '{\"street\":\"123 Tech Street\",\"city\":\"San Francisco\",\"state\":\"CA\",\"zip\":\"94105\",\"country\":\"United States\"}'
    );" --remote 2>&1)
    
    if echo "$CREATE_CLIENT" | grep -q "Error\|error"; then
        echo -e "${RED}❌ Failed to create sample client${NC}"
        echo "Error: $CREATE_CLIENT"
    else
        echo -e "${GREEN}✅ Sample client created${NC}"
    fi
else
    echo -e "${GREEN}✅ Clients exist in database${NC}"
fi

# Step 7: Final verification
echo -e "\n${BLUE}Step 7: Final Database State${NC}"

echo "Users in database:"
wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --command="SELECT user_id, username, email, role, status FROM users;" --remote

echo -e "\nClients in database:"
wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --command="SELECT client_id, company_name, primary_contact_email, account_status FROM clients LIMIT 3;" --remote

# Step 8: Test authentication
echo -e "\n${BLUE}Step 8: Authentication Test${NC}"

echo "Testing login with corrected data..."
curl -s -X POST "https://bitware-key-account-manager.jhaladik.workers.dev/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@company.com","password":"admin123","expected_role":"admin"}' | jq .

echo -e "\n${YELLOW}======================================"
echo "🏁 Database Diagnostic Complete"
echo "======================================${NC}"
echo ""
echo -e "${GREEN}✅ Database should now be ready for authentication${NC}"
echo ""
echo "Try running your test script again:"
echo "./test_complete_api.sh"
