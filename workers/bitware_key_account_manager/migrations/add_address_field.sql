-- Migration to add address field to clients table
-- Run this if your database was created before the address field was added

-- Check if column exists before adding (SQLite doesn't support IF NOT EXISTS for columns)
-- You may need to run this manually if the column doesn't exist

ALTER TABLE clients ADD COLUMN address TEXT;

-- Update existing clients with sample addresses
UPDATE clients 
SET address = '{"street": "123 Business Ave", "city": "San Francisco", "state": "CA", "zip": "94105", "country": "United States"}'
WHERE address IS NULL AND client_id = 'client_demo_001';

UPDATE clients 
SET address = '{"street": "456 Corporate Blvd", "city": "New York", "state": "NY", "zip": "10001", "country": "United States"}'
WHERE address IS NULL AND client_id = 'client_demo_002';

UPDATE clients 
SET address = '{"street": "789 Enterprise Way", "city": "Chicago", "state": "IL", "zip": "60601", "country": "United States"}'
WHERE address IS NULL AND client_id = 'client_demo_003';

-- Default address for any other existing clients
UPDATE clients 
SET address = '{"street": "Unknown", "city": "Unknown", "state": "Unknown", "zip": "00000", "country": "Unknown"}'
WHERE address IS NULL;