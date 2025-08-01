-- workers/bitware_key_account_manager/schema_extension_unified.sql
-- Database schema extension for unified authentication and frontend compatibility
-- Run: wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --file=schema_extension_unified.sql --remote

-- ==================== UNIFIED USER AUTHENTICATION ====================

-- Add unified users table for all authentication (admin, client, support)
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Use bcrypt in production
    role TEXT NOT NULL CHECK (role IN ('admin', 'client', 'support')),
    username TEXT NOT NULL,
    
    -- Basic profile
    full_name TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    
    -- Role-specific data
    client_id TEXT, -- Links to existing clients table when role = 'client'
    department TEXT, -- For admin/user roles
    
    -- Session management
    last_login DATETIME,
    login_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Link to existing clients table
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- Session management table for unified sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    session_token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    
    -- Session data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Session context
    login_method TEXT DEFAULT 'dashboard',
    ip_address TEXT,
    
    -- Client context (when user role = 'client')
    client_context TEXT DEFAULT '{}', -- JSON with client-specific session data
    
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ==================== CLIENT TABLE ENHANCEMENTS ====================

-- Add address column to existing clients table if it doesn't exist
ALTER TABLE clients ADD COLUMN address TEXT; -- JSON string for address object

-- Ensure we have all required columns for frontend compatibility
-- (These may already exist, so we use IF NOT EXISTS equivalents via separate statements)

-- Add contact_name mapping (primary_contact_name should map to contact_name)
-- Add contact_email mapping (primary_contact_email should map to contact_email)
-- These are handled in the DatabaseService class via column aliases

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON user_sessions(last_activity);

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(primary_contact_email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(account_status);
CREATE INDEX IF NOT EXISTS idx_clients_tier ON clients(subscription_tier);

-- ==================== TRIGGERS ====================

-- Auto-update last_activity on session access
CREATE TRIGGER IF NOT EXISTS update_session_activity 
    AFTER UPDATE ON user_sessions
    FOR EACH ROW
    WHEN NEW.last_activity = OLD.last_activity
BEGIN
    UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP 
    WHERE session_token = NEW.session_token;
END;

-- Auto-cleanup expired sessions (runs on session creation)
CREATE TRIGGER IF NOT EXISTS cleanup_expired_sessions
    AFTER INSERT ON user_sessions
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < datetime('now');
END;

-- ==================== INITIAL DATA ====================

-- Insert default admin user for testing
INSERT OR IGNORE INTO users (
    user_id, username, email, password_hash, role, full_name, status, created_at
) VALUES (
    'admin_001',
    'admin',
    'admin@company.com',
    'YWRtaW4xMjNzYWx0', -- This is base64('admin123salt') - change in production!
    'admin',
    'System Administrator',
    'active',
    datetime('now')
);

-- Insert sample client user linked to existing client (if any exist)
INSERT OR IGNORE INTO users (
    user_id, username, email, password_hash, role, full_name, status, client_id, created_at
) 
SELECT 
    'client_001',
    'client.user',
    primary_contact_email,
    'Y2xpZW50MTIzc2FsdA==', -- This is base64('client123salt') - change in production!
    'client',
    primary_contact_name,
    'active',
    client_id,
    datetime('now')
FROM clients 
WHERE client_id = (SELECT client_id FROM clients LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM users WHERE user_id = 'client_001');

-- Update existing clients to have sample address data for frontend compatibility
UPDATE clients 
SET address = json_object(
    'street', '123 Business Ave',
    'city', 'San Francisco',
    'state', 'CA',
    'zip', '94105',
    'country', 'United States'
)
WHERE address IS NULL;

-- ==================== VERIFICATION QUERIES ====================

-- Uncomment these for verification after running the schema:

-- SELECT 'Users table:' as info;
-- SELECT user_id, username, email, role, status, client_id FROM users;

-- SELECT 'Sessions table:' as info;  
-- SELECT session_token, user_id, expires_at FROM user_sessions;

-- SELECT 'Clients with address:' as info;
-- SELECT client_id, company_name, address FROM clients LIMIT 3;