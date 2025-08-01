-- Working KAM Mock Data - Matches Existing Schema
-- Run: wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --file=working_mock_data.sql --remote

-- Update existing clients with proper frontend data (no address column)
INSERT OR REPLACE INTO clients (
    client_id, company_name, primary_contact_name, primary_contact_email, 
    phone, website, subscription_tier, account_status, 
    monthly_budget_usd, used_budget_current_month, 
    industry, company_size, created_at, last_interaction
) VALUES 
('client_001', 'TechCorp Solutions', 'John Smith', 'john@techcorp.com', 
 '+1 (555) 123-4567', 'https://techcorp.com', 'premium', 'active', 
 1000, 450, 'Technology', '50-200 employees', '2024-01-15T10:00:00Z', '2024-07-29T14:30:00Z'),

('client_002', 'InnovateLabs Inc', 'Sarah Johnson', 'sarah@innovatelabs.com', 
 '+1 (555) 234-5678', 'https://innovatelabs.com', 'enterprise', 'active', 
 2500, 1200, 'Research & Development', '200-500 employees', '2024-02-20T09:15:00Z', '2024-07-30T11:45:00Z'),

('client_003', 'DataMind Analytics', 'Michael Chen', 'michael@datamind.com', 
 '+1 (555) 345-6789', 'https://datamind.com', 'standard', 'active', 
 750, 320, 'Data Analytics', '10-50 employees', '2024-03-10T14:22:00Z', '2024-07-28T16:20:00Z'),

('client_004', 'CloudScale Systems', 'Emily Rodriguez', 'emily@cloudscale.io', 
 '+1 (555) 456-7890', 'https://cloudscale.io', 'premium', 'active', 
 1500, 890, 'Cloud Infrastructure', '100-200 employees', '2024-04-05T11:30:00Z', '2024-07-31T09:10:00Z'),

('client_005', 'AI Dynamics Corp', 'David Park', 'david@aidynamics.com', 
 '+1 (555) 567-8901', 'https://aidynamics.com', 'enterprise', 'active', 
 3000, 1450, 'Artificial Intelligence', '500+ employees', '2024-01-25T08:45:00Z', '2024-07-31T15:30:00Z');

-- Update the database service to provide address as null for frontend compatibility
-- (This will be handled in the backend code response formatting)

-- Verify the updated data
SELECT 'Updated Clients:' as info, COUNT(*) as count FROM clients WHERE company_name LIKE '%Corp%' OR company_name LIKE '%Inc%';

-- Show the formatted data as it should appear to frontend
SELECT 
    client_id, 
    company_name, 
    primary_contact_name as contact_name,
    primary_contact_email as contact_email, 
    phone,
    subscription_tier, 
    account_status, 
    monthly_budget_usd, 
    used_budget_current_month,
    industry,
    company_size,
    created_at,
    last_interaction as last_activity
FROM clients 
WHERE client_id IN ('client_001', 'client_002', 'client_003', 'client_004', 'client_005')
ORDER BY client_id;