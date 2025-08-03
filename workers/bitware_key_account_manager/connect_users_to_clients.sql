-- Connect existing users to clients and create new client users
-- Run: wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --file=connect_users_to_clients.sql --remote

-- First, let's update the existing client user to connect to a client
UPDATE users 
SET client_id = 'client_demo_001' 
WHERE user_id = 'client_001' AND role = 'client';

-- Create additional client users for existing clients
INSERT OR IGNORE INTO users (
    user_id, username, email, password_hash, role, full_name, status, client_id, created_at
) VALUES 
-- User for TechCorp Solutions
('user_techcorp_001', 'john.techcorp', 'john@techcorp.com', 'Y2xpZW50MTIzc2FsdA==', 'client', 'John Smith', 'active', 'client_demo_001', datetime('now')),

-- User for GreenEnergy Innovations  
('user_green_001', 'sarah.green', 'sarah@greenenergy.com', 'Y2xpZW50MTIzc2FsdA==', 'client', 'Sarah Johnson', 'active', 'client_demo_002', datetime('now')),

-- User for FinanceFirst Consulting
('user_finance_001', 'michael.finance', 'michael@financefirst.com', 'Y2xpZW50MTIzc2FsdA==', 'client', 'Michael Chen', 'active', 'client_demo_003', datetime('now')),

-- User for StartupBoost
('user_startup_001', 'lisa.startup', 'lisa@startupboost.com', 'Y2xpZW50MTIzc2FsdA==', 'client', 'Lisa Wong', 'active', 'client_trial_001', datetime('now')),

-- Additional admin users for testing
('admin_002', 'admin2', 'admin2@company.com', 'YWRtaW4xMjNzYWx0', 'admin', 'Admin Two', 'active', NULL, datetime('now')),
('admin_003', 'admin3', 'admin3@company.com', 'YWRtaW4xMjNzYWx0', 'admin', 'Admin Three', 'active', NULL, datetime('now')),

-- Support users
('support_001', 'support1', 'support1@company.com', 'c3VwcG9ydDEyM3NhbHQ=', 'support', 'Support Agent One', 'active', NULL, datetime('now')),
('support_002', 'support2', 'support2@company.com', 'c3VwcG9ydDEyM3NhbHQ=', 'support', 'Support Agent Two', 'active', NULL, datetime('now'));

-- Update client information to ensure we have contact names
UPDATE clients SET 
    primary_contact_name = 'John Smith',
    primary_contact_email = 'john@techcorp.com'
WHERE client_id = 'client_demo_001';

UPDATE clients SET 
    primary_contact_name = 'Sarah Johnson',
    primary_contact_email = 'sarah@greenenergy.com'
WHERE client_id = 'client_demo_002';

UPDATE clients SET 
    primary_contact_name = 'Michael Chen',
    primary_contact_email = 'michael@financefirst.com'
WHERE client_id = 'client_demo_003';

UPDATE clients SET 
    primary_contact_name = 'Lisa Wong',
    primary_contact_email = 'lisa@startupboost.com'
WHERE client_id = 'client_trial_001';

-- Verify the results
SELECT 'Total Users:' as info, COUNT(*) as count FROM users;
SELECT 'Admin Users:' as info, COUNT(*) as count FROM users WHERE role = 'admin';
SELECT 'Client Users:' as info, COUNT(*) as count FROM users WHERE role = 'client';
SELECT 'Client Users with Clients:' as info, COUNT(*) as count FROM users WHERE role = 'client' AND client_id IS NOT NULL;

-- Show sample user-client connections
SELECT u.user_id, u.username, u.email, u.role, u.client_id, c.company_name 
FROM users u
LEFT JOIN clients c ON u.client_id = c.client_id
WHERE u.role = 'client'
LIMIT 10;