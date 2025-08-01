-- schema_fix.sql - Minimal fix for existing users table
-- Add missing columns to existing users table for frontend compatibility

-- Add username column if it doesn't exist
ALTER TABLE users ADD COLUMN username TEXT;

-- Add login_count column if it doesn't exist  
ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;

-- Create user_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_sessions (
    session_token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    login_method TEXT DEFAULT 'dashboard',
    ip_address TEXT,
    client_context TEXT DEFAULT '{}',
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Update existing users to have username = email (for compatibility)
UPDATE users SET username = email WHERE username IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- Insert default admin if not exists
INSERT OR IGNORE INTO users (
    user_id, username, email, password_hash, role, full_name, status, created_at
) VALUES (
    'admin_001',
    'admin',
    'admin@company.com',
    'YWRtaW4xMjNzYWx0', -- base64('admin123salt')
    'admin',
    'System Administrator',
    'active',
    datetime('now')
);