-- KAM Database Mock Data Setup
-- Run: wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --file=mock_data_setup.sql --remote

-- Clear existing data for clean testing
DELETE FROM clients;
DELETE FROM users WHERE user_id != 'admin_001'; -- Keep admin user

-- Insert mock clients with frontend specification format
INSERT INTO clients (
    client_id, company_name, primary_contact_name, primary_contact_email, 
    phone, website, subscription_tier, account_status, 
    monthly_budget_usd, used_budget_current_month, 
    industry, company_size, created_at, last_interaction,
    address
) VALUES 
('client_001', 'TechCorp Solutions', 'John Smith', 'john@techcorp.com', 
 '+1 (555) 123-4567', 'https://techcorp.com', 'premium', 'active', 
 1000, 450, 'Technology', '50-200 employees', '2024-01-15T10:00:00Z', '2024-07-29T14:30:00Z',
 '{"street":"123 Tech Street","city":"San Francisco","state":"CA","zip":"94105","country":"United States"}'),

('client_002', 'InnovateLabs Inc', 'Sarah Johnson', 'sarah@innovatelabs.com', 
 '+1 (555) 234-5678', 'https://innovatelabs.com', 'enterprise', 'active', 
 2500, 1200, 'Research & Development', '200-500 employees', '2024-02-20T09:15:00Z', '2024-07-30T11:45:00Z',
 '{"street":"456 Innovation Blvd","city":"Austin","state":"TX","zip":"73301","country":"United States"}'),

('client_003', 'DataMind Analytics', 'Michael Chen', 'michael@datamind.com', 
 '+1 (555) 345-6789', 'https://datamind.com', 'standard', 'active', 
 750, 320, 'Data Analytics', '10-50 employees', '2024-03-10T14:22:00Z', '2024-07-28T16:20:00Z',
 '{"street":"789 Data Drive","city":"Seattle","state":"WA","zip":"98101","country":"United States"}'),

('client_004', 'CloudScale Systems', 'Emily Rodriguez', 'emily@cloudscale.io', 
 '+1 (555) 456-7890', 'https://cloudscale.io', 'premium', 'active', 
 1500, 890, 'Cloud Infrastructure', '100-200 employees', '2024-04-05T11:30:00Z', '2024-07-31T09:10:00Z',
 '{"street":"321 Cloud Ave","city":"Denver","state":"CO","zip":"80202","country":"United States"}'),

('client_005', 'AI Dynamics Corp', 'David Park', 'david@aidynamics.com', 
 '+1 (555) 567-8901', 'https://aidynamics.com', 'enterprise', 'active', 
 3000, 1450, 'Artificial Intelligence', '500+ employees', '2024-01-25T08:45:00Z', '2024-07-31T15:30:00Z',
 '{"street":"654 AI Plaza","city":"Boston","state":"MA","zip":"02101","country":"United States"}'),

('client_006', 'StartupBoost', 'Lisa Wong', 'lisa@startupboost.com', 
 '+1 (555) 678-9012', 'https://startupboost.com', 'basic', 'trial', 
 500, 125, 'Consulting', '1-10 employees', '2024-07-15T12:00:00Z', '2024-07-25T10:15:00Z',
 '{"street":"987 Startup St","city":"Palo Alto","state":"CA","zip":"94301","country":"United States"}'),

('client_007', 'MegaCorp Industries', 'Robert Kim', 'robert@megacorp.com', 
 '+1 (555) 789-0123', 'https://megacorp.com', 'enterprise', 'inactive', 
 5000, 0, 'Manufacturing', '1000+ employees', '2024-01-01T00:00:00Z', '2024-06-30T17:45:00Z',
 '{"street":"111 Corporate Blvd","city":"Chicago","state":"IL","zip":"60601","country":"United States"}'),

('client_008', 'GreenTech Solutions', 'Amanda Lee', 'amanda@greentech.eco', 
 '+1 (555) 890-1234', 'https://greentech.eco', 'standard', 'active', 
 800, 240, 'Clean Energy', '50-100 employees', '2024-05-12T13:20:00Z', '2024-07-30T14:40:00Z',
 '{"street":"222 Green Way","city":"Portland","state":"OR","zip":"97201","country":"United States"}'),

('client_009', 'FinanceFirst LLC', 'James Wilson', 'james@financefirst.com', 
 '+1 (555) 901-2345', 'https://financefirst.com', 'premium', 'active', 
 1200, 680, 'Financial Services', '100-200 employees', '2024-03-28T16:10:00Z', '2024-07-29T12:25:00Z',
 '{"street":"333 Finance Tower","city":"New York","state":"NY","zip":"10001","country":"United States"}');

-- Create corresponding users for some clients
INSERT INTO users (
    user_id, username, email, password_hash, role, full_name, status, client_id, created_at
) VALUES 
('user_client_001', 'john.smith', 'john@techcorp.com', 'Y2xpZW50MTIzc2FsdA==', 'client', 'John Smith', 'active', 'client_001', datetime('now')),
('user_client_002', 'sarah.johnson', 'sarah@innovatelabs.com', 'Y2xpZW50MTIzc2FsdA==', 'client', 'Sarah Johnson', 'active', 'client_002', datetime('now')),
('user_client_003', 'michael.chen', 'michael@datamind.com', 'Y2xpZW50MTIzc2FsdA==', 'client', 'Michael Chen', 'active', 'client_003', datetime('now')),
('user_client_004', 'emily.rodriguez', 'emily@cloudscale.io', 'Y2xpZW50MTIzc2FsdA==', 'client', 'Emily Rodriguez', 'active', 'client_004', datetime('now')),
('user_client_005', 'david.park', 'david@aidynamics.com', 'Y2xpZW50MTIzc2FsdA==', 'client', 'David Park', 'active', 'client_005', datetime('now'));

-- Add some communication history for testing
INSERT INTO client_communications (
    client_id, channel, subject, content_preview, intent_analysis, status, processed_at
) VALUES 
('client_001', 'email', 'Weekly Market Report Request', 'Hi, could you prepare our weekly tech market analysis...', 'report_request', 'completed', datetime('now', '-2 days')),
('client_002', 'dashboard', 'AI Research Update', 'Need latest developments in machine learning...', 'research_request', 'completed', datetime('now', '-1 day')),
('client_003', 'email', 'Data Analytics Consultation', 'We are looking for insights on customer behavior...', 'consultation_request', 'pending', datetime('now', '-3 hours')),
('client_004', 'dashboard', 'Cloud Infrastructure Analysis', 'Please analyze current cloud adoption trends...', 'analysis_request', 'completed', datetime('now', '-5 days')),
('client_005', 'email', 'AI Strategy Review', 'We need a comprehensive AI strategy assessment...', 'strategy_request', 'in_progress', datetime('now', '-1 day'));

-- Verify the data
SELECT 'Clients Count:' as info, COUNT(*) as count FROM clients;
SELECT 'Users Count:' as info, COUNT(*) as count FROM users;
SELECT 'Communications Count:' as info, COUNT(*) as count FROM client_communications;

-- Show sample client data
SELECT client_id, company_name, primary_contact_email, subscription_tier, account_status, monthly_budget_usd, used_budget_current_month FROM clients LIMIT 5;