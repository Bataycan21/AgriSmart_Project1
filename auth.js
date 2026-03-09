// auth.js — Supabase-powered auth for AgriSmart
// Works with login.js & register.js

const _supabase = window.supabase.createClient(
  'https://wrmfnsyipdtihwlnrtou.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybWZuc3lpcGR0aWh3bG5ydG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTI1MzksImV4cCI6MjA4ODI2ODUzOX0.1u2v9DJTYBBNCGT1cmlHw7IqwK9kp5TQMf0k1WWGlfw'
);

const Auth = {

  // ── Register ─────────────────────────────────────────────────
  // Called by register.js: Auth.register({ name, email, password, role })
  async register({ name, email, password, role }) {
    try {
      // Pass name & role as metadata — DB trigger uses this to auto-create public.users row
      const { data, error } = await _supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } }
      });

      if (error) return { success: false, error: error.message };

      const userId = data.user?.id;
      if (!userId) return { success: false, error: 'Registration failed. Please try again.' };

      // Upsert into public.users (trigger is the primary path, this is a safety net)
      const { error: userErr } = await _supabase.from('users').upsert(
        { id: userId, name, email, role, status: 'active' },
        { onConflict: 'id' }
      );
      if (userErr) console.warn('[Auth] users upsert:', userErr.message);

      // If worker, also create a workers row
      if (role === 'worker') {
        const { error: workerErr } = await _supabase.from('workers').insert({
          user_id: userId, name, email, status: 'active'
        });
        if (workerErr) console.warn('[Auth] workers insert:', workerErr.message);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Registration failed.' };
    }
  },

  // ── Login ─────────────────────────────────────────────────────
  // Called by login.js: Auth.login({ email, password })
  async login({ email, password }) {
    try {
      const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };

      // Look up profile by user ID (more reliable than email)
      const { data: profile, error: profileErr } = await _supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileErr || !profile) {
        // Fallback to auth metadata if public.users row missing
        const meta = data.user.user_metadata || {};
        const fallback = {
          id:    data.user.id,
          name:  meta.name || email,
          email: email,
          role:  meta.role || 'worker',
        };
        localStorage.setItem('agrismart_session', JSON.stringify(fallback));
        return { success: true, user: fallback };
      }

      // If worker, also fetch their workers.id for attendance use
      let workerId = null;
      if (profile.role === 'worker') {
        const { data: workerRow } = await _supabase
          .from('workers')
          .select('id')
          .eq('user_id', profile.id)
          .maybeSingle();
        workerId = workerRow?.id || null;
      }

      const user = {
        id:        profile.id,
        name:      profile.name,
        email:     profile.email,
        role:      profile.role,
        worker_id: workerId,
      };

      localStorage.setItem('agrismart_session', JSON.stringify(user));
      return { success: true, user };
    } catch (err) {
      return { success: false, error: err.message || 'Login failed.' };
    }
  },

  // ── Role-based redirect ───────────────────────────────────────
  redirectByRole(role) {
    if (role === 'admin' || role === 'supervisor') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'worker-dashboard.html';
    }
  },

  // ── Session helpers ───────────────────────────────────────────
  getSession() {
    const raw = localStorage.getItem('agrismart_session');
    return raw ? JSON.parse(raw) : null;
  },

  requireAuth() {
    const session = this.getSession();
    if (!session) { window.location.href = 'login.html'; return null; }
    return session;
  },

  // Protect a page to specific roles only
  requireRole(...allowedRoles) {
    const session = this.requireAuth();
    if (!session) return null;
    if (!allowedRoles.includes(session.role)) {
      window.location.href = 'login.html';
      return null;
    }
    return session;
  },

  // ── Logout ────────────────────────────────────────────────────
  async logout() {
    await _supabase.auth.signOut();
    localStorage.removeItem('agrismart_session');
    window.location.href = 'login.html';
  },
};

window.Auth = Auth;