// Browser-side authentication client
class AuthClient {
  constructor() {
      this.sessionToken = localStorage.getItem('bitware-session-token');
  }

  isAuthenticated() {
      return !!this.sessionToken;
  }

  async login(username, password, loginType = 'admin') {
      try {
          const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password, loginType })
          });

          const data = await response.json();
          
          if (data.success) {
              this.sessionToken = data.sessionToken;
              localStorage.setItem('bitware-session-token', data.sessionToken);
              localStorage.setItem('bitware-user-info', JSON.stringify(data.user));
              return { success: true, user: data.user };
          } else {
              return { success: false, error: data.error };
          }
      } catch (error) {
          return { success: false, error: error.message };
      }
  }

  async validateSession() {
      if (!this.sessionToken) return { valid: false };

      try {
          const response = await fetch('/api/auth/validate', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'x-bitware-session-token': this.sessionToken
              }
          });

          return await response.json();
      } catch (error) {
          return { valid: false, error: error.message };
      }
  }

  logout() {
      this.sessionToken = null;
      localStorage.removeItem('bitware-session-token');
      localStorage.removeItem('bitware-user-info');
      window.location.href = '/login.html';
  }
}

// Global instance
window.authClient = new AuthClient();