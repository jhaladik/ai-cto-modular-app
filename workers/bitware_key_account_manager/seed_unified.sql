-- schema_extension.sql - Add unified authentication to existing KEY_ACCOUNT_MANAGEMENT_DB
-- Works with existing KAM database schema
-- Run: wrangler d1 execute KEY_ACCOUNT_MANAGEMENT_DB --file=schema_extension.sql --remote

-- ==================== UNIFIED USER AUTHENTICATION ====================

-- Add unified users table alongside existing clients table
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Use bcrypt in production
    role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'client')),
    
    -- Basic profile
    full_name TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    
    -- Role-specific data
    client_id TEXT, -- Links to existing clients table when role = 'client'
    department TEXT, -- For admin/user roles
    
    -- Session management
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Link to existing clients table
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- Session management table (replaces KV for unified sessions)
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

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- ==================== TRIGGERS ====================

-- Auto-update last_activity on session access
CREATE TRIGGER IF NOT EXISTS update_session_activity 
    AFTER UPDATE ON user_sessions
BEGIN
    UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP 
    WHERE session_token = NEW.session_token;
END;