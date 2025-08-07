-- Fix bitware_report_builder database schema
-- Run: wrangler d1 execute bitware-report-generation-db --file=fix-database.sql

-- Add missing columns to generated_reports table
ALTER TABLE generated_reports ADD COLUMN trend_analysis TEXT DEFAULT '{}';
ALTER TABLE generated_reports ADD COLUMN detailed_analysis TEXT;
ALTER TABLE generated_reports ADD COLUMN word_count INTEGER DEFAULT 0;
ALTER TABLE generated_reports ADD COLUMN sections_count INTEGER DEFAULT 0;
ALTER TABLE generated_reports ADD COLUMN charts_included BOOLEAN DEFAULT FALSE;
ALTER TABLE generated_reports ADD COLUMN sources_cited INTEGER DEFAULT 0;
ALTER TABLE generated_reports ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE generated_reports ADD COLUMN access_count INTEGER DEFAULT 0;
ALTER TABLE generated_reports ADD COLUMN last_accessed DATETIME;

-- Verify the fix
SELECT 'Schema fix completed. Columns added:' as status;
PRAGMA table_info(generated_reports);

-- REMAINING CODE FIXES NEEDED:
-- 1. Add validation in handleReportGeneration() before database insert:
--    if (!['executive_summary', 'trend_analysis', 'technical_deep_dive', 'competitive_intelligence', 'daily_briefing'].includes(reportRequest.report_type)) {
--      return errorResponse('Invalid report_type', 400);
--    }
--
-- 2. Fix formatReportResponse() for HTML/email formats:
--    case 'html': return { ...baseResponse, html_content: htmlContent, view_url: `/reports/${reportId}/view` };
--    case 'email': return { ...baseResponse, email_subject: subject, email_html: emailContent.html };

-- Add missing columns to generated_reports table
ALTER TABLE generated_reports ADD COLUMN trend_analysis TEXT DEFAULT '{}';
ALTER TABLE generated_reports ADD COLUMN detailed_analysis TEXT;
ALTER TABLE generated_reports ADD COLUMN word_count INTEGER DEFAULT 0;
ALTER TABLE generated_reports ADD COLUMN sections_count INTEGER DEFAULT 0;
ALTER TABLE generated_reports ADD COLUMN charts_included BOOLEAN DEFAULT FALSE;
ALTER TABLE generated_reports ADD COLUMN sources_cited INTEGER DEFAULT 0;
ALTER TABLE generated_reports ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE generated_reports ADD COLUMN access_count INTEGER DEFAULT 0;
ALTER TABLE generated_reports ADD COLUMN last_accessed DATETIME;

-- Verify the fix
SELECT 'Schema fix completed. Columns added:' as status;
PRAGMA table_info(generated_reports);