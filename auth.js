// auth.js — Supabase-powered, works with your existing login.js & register.js

const _supabase = window.supabase.createClient(
  'https://wrmfnsyipdtihwlnrtou.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybWZuc3lpcGR0aWh3bG5ydG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTI1MzksImV4cCI6MjA4ODI2ODUzOX0.1u2v9DJTYBBNCGT1cmlHw7IqwK9kp5TQMf0k1WWGlfw'
);

const Auth = {

  // Called by register.js: Auth.register({ name, email, password, role })
  async register({ name, email, password, role }) {
    try {
      const { data, error } = await _supabase.auth.signUp({ email, password });
      if (error) return { success: false, error: error.message };

      await _supabase.from('users').insert({
        id: data.user.id, name, email, role, status: 'active'
      });

      if (role === 'worker') {
        await _supabase.from('workers').insert({
          user_id: data.user.id, name, email, status: 'active'
        });
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Registration failed.' };
    }
  },

  // Called by login.js: Auth.login({ email, password })
  async login({ email, password }) {
    try {
      const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };

      const { data: profile } = await _supabase
        .from('users').select('*').eq('email', email).single();

      const user = {
        id:    profile?.id    || data.user.id,
        name:  profile?.name  || email,
        email: email,
        role:  profile?.role  || 'worker',
      };

      localStorage.setItem('agrismart_session', JSON.stringify(user));
      return { success: true, user };
    } catch (err) {
      return { success: false, error: err.message || 'Login failed.' };
    }
  },

  // Called by login.js: Auth.redirectByRole(role)
  redirectByRole(role) {
    if (role === 'admin' || role === 'supervisor') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'worker-dashboard.html';
    }
  },

  getSession() {
    const raw = localStorage.getItem('agrismart_session');
    return raw ? JSON.parse(raw) : null;
  },

  requireAuth() {
    const session = this.getSession();
    if (!session) { window.location.href = 'login.html'; return null; }
    return session;
  },

  async logout() {
    await _supabase.auth.signOut();
    localStorage.removeItem('agrismart_session');
    window.location.href = 'login.html';
  },
};

window.Auth = Auth;