// public/js/shared/auth.js
// @WORKER: AuthenticationClient
// 🧱 Type: BrowserClient
// 📍 Path: public/js/shared/auth.js
// 🎯 Role: Simple session management for frontend authentication
// 💾 Storage: { browser: "localStorage" }

class AuthClient {
    constructor() {
      this.sessionToken = localStorage.getItem('bitware-session-token');
      this.userInfo = null;
    }
  
    async login(username, password) {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
  
        const data = await response.json();
  
        if (data.success) {
          this.sessionToken = data.sessionToken;
          this.userInfo = {
            username: data.username,
            role: data.role
          };
          
          localStorage.setItem('bitware-session-token', this.sessionToken);
          localStorage.setItem('bitware-user-info', JSON.stringify(this.userInfo));
          
          return { success: true, user: this.userInfo };
        } else {
          return { success: false, error: data.error };
        }
        
      } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Login failed' };
      }
    }
  
    async logout() {
      try {
        if (this.sessionToken) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'x-bitware-session-token': this.sessionToken
            }
          });
        }
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        this.sessionToken = null;
        this.userInfo = null;
        localStorage.removeItem('bitware-session-token');
        localStorage.removeItem('bitware-user-info');
      }
    }
  
    async validateSession() {
      // Always reload from localStorage first
      this.sessionToken = localStorage.getItem('bitware-session-token');
      
      if (!this.sessionToken) {
        return { valid: false, error: 'No session token' };
      }
  
      try {
        const response = await fetch('/api/auth/validate', {
          method: 'GET',
          headers: {
            'x-bitware-session-token': this.sessionToken
          }
        });
  
        const data = await response.json();
  
        if (data.valid) {
          this.userInfo = {
            username: data.username,
            role: data.role
          };
          localStorage.setItem('bitware-user-info', JSON.stringify(this.userInfo));
          return { valid: true, user: this.userInfo };
        } else {
          // Session invalid, clear local storage
          this.logout();
          return { valid: false, error: data.error };
        }
        
      } catch (error) {
        console.error('Session validation error:', error);
        return { valid: false, error: 'Validation failed' };
      }
    }
  
    isAuthenticated() {
      return !!this.sessionToken;
    }
  
    getUser() {
      if (!this.userInfo) {
        const stored = localStorage.getItem('bitware-user-info');
        if (stored) {
          this.userInfo = JSON.parse(stored);
        }
      }
      return this.userInfo;
    }
    
    getSessionToken() {
      return this.sessionToken || localStorage.getItem('bitware-session-token');
    }
}

// Global auth instance
window.authClient = new AuthClient();