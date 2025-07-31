// services/database.ts
// Database service for KAM worker - all SQL queries and DB helpers

export interface Client {
    id: number;
    client_id: string;
    company_name: string;
    primary_contact_name?: string;
    primary_contact_email?: string;
    phone?: string;
    website?: string;
    subscription_tier: string;
    account_status: string;
    monthly_budget_usd: number;
    used_budget_current_month: number;
    industry?: string;
    company_size?: string;
    use_case_description?: string;
    primary_interests?: string; // JSON array
    communication_style: string;
    preferred_report_formats: string; // JSON array
    typical_request_patterns: string; // JSON object
    success_metrics: string; // JSON object
    created_at: string;
    updated_at: string;
    last_interaction?: string;
    total_lifetime_value: number;
    satisfaction_score: number;
  }
  
  export interface ClientStats {
    total_clients: number;
    active_clients: number;
    trial_clients: number;
    avg_budget: number;
    total_used_budget: number;
  }
  
  export class DatabaseService {
    constructor(private db: D1Database) {}
  
    // ==================== CLIENT OPERATIONS ====================
  
    async getClientByEmail(email: string): Promise<Client | null> {
      const result = await this.db.prepare(`
        SELECT id, client_id, company_name, primary_contact_name, primary_contact_email, 
               phone, website, subscription_tier, account_status, monthly_budget_usd, 
               used_budget_current_month, industry, company_size, use_case_description,
               primary_interests, communication_style, preferred_report_formats,
               typical_request_patterns, success_metrics, created_at, updated_at,
               last_interaction, total_lifetime_value, satisfaction_score
        FROM clients 
        WHERE primary_contact_email = ?
      `).bind(email).first();
  
      return result as Client | null;
    }
  
    async getClientById(clientId: string): Promise<Client | null> {
      const result = await this.db.prepare(`
        SELECT id, client_id, company_name, primary_contact_name, primary_contact_email, 
               phone, website, subscription_tier, account_status, monthly_budget_usd, 
               used_budget_current_month, industry, company_size, use_case_description,
               primary_interests, communication_style, preferred_report_formats,
               typical_request_patterns, success_metrics, created_at, updated_at,
               last_interaction, total_lifetime_value, satisfaction_score
        FROM clients 
        WHERE client_id = ?
      `).bind(clientId).first();
  
      return result as Client | null;
    }
  
    async createClient(client: Partial<Client>): Promise<Client> {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await this.db.prepare(`
        INSERT INTO clients (
          client_id, company_name, primary_contact_name, primary_contact_email, 
          phone, website, subscription_tier, monthly_budget_usd, communication_style, 
          account_status, preferred_report_formats
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        clientId,
        client.company_name,
        client.primary_contact_name || null,
        client.primary_contact_email,
        client.phone || null,
        client.website || null,
        client.subscription_tier || 'standard',
        client.monthly_budget_usd || 100.0,
        client.communication_style || 'professional',
        'active',
        client.preferred_report_formats || '["json", "html"]'
      ).run();
  
      return await this.getClientById(clientId) as Client;
    }
  
    // NEW: Complete client update functionality
    async updateClient(clientId: string, updates: Partial<Client>, updatedBy?: string): Promise<Client | null> {
      // Build dynamic SQL based on provided fields
      const updateFields: string[] = [];
      const bindValues: any[] = [];
      
      // Updateable fields (exclude system fields)
      const allowedFields: Record<string, any> = {
        'company_name': updates.company_name,
        'primary_contact_name': updates.primary_contact_name, 
        'primary_contact_email': updates.primary_contact_email,
        'phone': updates.phone,
        'website': updates.website,
        'subscription_tier': updates.subscription_tier,
        'account_status': updates.account_status,
        'monthly_budget_usd': updates.monthly_budget_usd,
        'industry': updates.industry,
        'company_size': updates.company_size,
        'use_case_description': updates.use_case_description,
        'primary_interests': updates.primary_interests,
        'communication_style': updates.communication_style,
        'preferred_report_formats': updates.preferred_report_formats,
        'typical_request_patterns': updates.typical_request_patterns,
        'success_metrics': updates.success_metrics,
        'satisfaction_score': updates.satisfaction_score
      };

      // Build SQL dynamically
      for (const [field, value] of Object.entries(allowedFields)) {
        if (value !== undefined) {
          updateFields.push(`${field} = ?`);
          bindValues.push(value);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields provided for update');
      }

      // Always update timestamp
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      bindValues.push(clientId);

      const sql = `
        UPDATE clients 
        SET ${updateFields.join(', ')} 
        WHERE client_id = ?
      `;

      const result = await this.db.prepare(sql).bind(...bindValues).run();
      
      if (result.changes === 0) {
        return null; // Client not found
      }

      return await this.getClientById(clientId);
    }

    async updateClientBudget(clientId: string, usedAmount: number): Promise<void> {
      await this.db.prepare(`
        UPDATE clients 
        SET used_budget_current_month = used_budget_current_month + ?,
            last_interaction = CURRENT_TIMESTAMP
        WHERE client_id = ?
      `).bind(usedAmount, clientId).run();
    }
  
    async getAllClients(limit: number = 50): Promise<Client[]> {
      const results = await this.db.prepare(`
        SELECT id, client_id, company_name, primary_contact_name, primary_contact_email, 
               phone, website, subscription_tier, account_status, monthly_budget_usd, 
               used_budget_current_month, industry, company_size, use_case_description,
               primary_interests, communication_style, preferred_report_formats,
               typical_request_patterns, success_metrics, created_at, updated_at,
               last_interaction, total_lifetime_value, satisfaction_score
        FROM clients 
        ORDER BY created_at DESC 
        LIMIT ?
      `).bind(limit).all();
  
      return results.results as Client[];
    }
  
    // ==================== STATISTICS ====================
  
    async getClientStats(): Promise<ClientStats> {
      const result = await this.db.prepare(`
        SELECT 
          COUNT(*) as total_clients,
          COUNT(CASE WHEN account_status = 'active' THEN 1 END) as active_clients,
          COUNT(CASE WHEN account_status = 'trial' THEN 1 END) as trial_clients,
          AVG(monthly_budget_usd) as avg_budget,
          SUM(used_budget_current_month) as total_used_budget
        FROM clients
      `).first();
  
      return result as ClientStats;
    }
  
    async getActiveClientCount(): Promise<number> {
      const result = await this.db.prepare(`
        SELECT COUNT(*) as count FROM clients WHERE account_status = 'active'
      `).first();
  
      return (result as any)?.count || 0;
    }
  
    // ==================== COMMUNICATION TRACKING ====================
    // Note: These methods assume client_communications table exists
    // If table doesn't exist yet, these will need to be implemented later
  
    async logCommunication(clientId: string, content: string, intent: string, sentiment: number): Promise<void> {
      try {
        const commId = `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Try to insert - will fail gracefully if table doesn't exist
        await this.db.prepare(`
          INSERT INTO client_communications (
            communication_id, client_id, type, content, intent_detected, 
            sentiment_score, processed_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(commId, clientId, 'system_notification', content, intent, sentiment).run();
      } catch (error) {
        console.log('Communication logging failed - table may not exist yet:', error.message);
        // Continue without failing - this is optional functionality
      }
    }
  
    async getCommunicationHistory(clientId: string, limit: number = 10): Promise<any[]> {
      try {
        const results = await this.db.prepare(`
          SELECT communication_id, type, content, intent_detected, sentiment_score, processed_at
          FROM client_communications 
          WHERE client_id = ? 
          ORDER BY processed_at DESC 
          LIMIT ?
        `).bind(clientId, limit).all();
  
        return results.results;
      } catch (error) {
        console.log('Communication history failed - table may not exist yet:', error.message);
        return []; // Return empty array if table doesn't exist
      }
    }
  
    // ==================== TEMPLATE MANAGEMENT ====================
    // Note: These methods assume pipeline_templates table exists
  
    async storeTemplate(templateName: string, templateData: any): Promise<void> {
      try {
        await this.db.prepare(`
          INSERT OR REPLACE INTO pipeline_templates (
            template_name, template_data, last_updated
          ) VALUES (?, ?, CURRENT_TIMESTAMP)
        `).bind(templateName, JSON.stringify(templateData)).run();
      } catch (error) {
        console.log('Template storage failed - table may not exist yet:', error.message);
      }
    }
  
    async getTemplates(): Promise<any[]> {
      try {
        const results = await this.db.prepare(`
          SELECT template_name, template_data, last_updated 
          FROM pipeline_templates 
          ORDER BY template_name
        `).all();
  
        return results.results.map((row: any) => ({
          name: row.template_name,
          data: JSON.parse(row.template_data),
          lastUpdated: row.last_updated
        }));
      } catch (error) {
        console.log('Template retrieval failed - table may not exist yet:', error.message);
        return []; // Return empty array if table doesn't exist
      }
    }
  
    // ==================== SESSION MANAGEMENT ====================
    // Uses existing session_client_context table
  
    async extendSession(sessionToken: string, clientId: string, context: any): Promise<void> {
      await this.db.prepare(`
        INSERT OR REPLACE INTO session_client_context (
          session_token, client_id, current_request_context, last_activity
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(sessionToken, clientId, JSON.stringify(context)).run();
    }
  
    async getSessionContext(sessionToken: string): Promise<any> {
      const result = await this.db.prepare(`
        SELECT client_id, current_request_context, conversation_history, active_pipelines
        FROM session_client_context 
        WHERE session_token = ?
      `).bind(sessionToken).first();
  
      return result ? {
        clientId: (result as any).client_id,
        context: JSON.parse((result as any).current_request_context || '{}'),
        conversationHistory: JSON.parse((result as any).conversation_history || '[]'),
        activePipelines: JSON.parse((result as any).active_pipelines || '[]')
      } : null;
    }
  }