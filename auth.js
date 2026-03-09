// auth.js — AgriSmart Supabase Auth
// Requires: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const _supabase = window.supabase.createClient(
  'https://wrmfnsyipdtihwlnrtou.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybWZuc3lpcGR0aWh3bG5ydG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTI1MzksImV4cCI6MjA4ODI2ODUzOX0.1u2v9DJTYBBNCGT1cmlHw7IqwK9kp5TQMf0k1WWGlfw'
);

// Expose as window.db so attendance-store.js and other modules can use it
window.db = _supabase;

const Auth = {

  // ── Register ─────────────────────────────────────────────────
  async register({ name, email, password, role }) {
    try {
      const { data, error } = await _supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } }   // ← trigger reads this
      });

      if (error) return { success: false, error: error.message };

      // If data.user is null → email confirmation is ON in Supabase
      // Fix: Dashboard → Authentication → Providers → Email → disable "Confirm email"
      if (!data.user) {
        return {
          success: false,
          error: 'Email confirmation is enabled. Please disable it in Supabase Dashboard: Authentication → Providers → Email → turn OFF "Confirm email".'
        };
      }

      const userId = data.user.id;

      // Upsert into public.users (DB trigger already does this; this is a safety net)
      const { error: upsertErr } = await _supabase
        .from('users')
        .upsert({ id: userId, name, email, role, status: 'active' }, { onConflict: 'id' });
      if (upsertErr) console.warn('[Auth] users upsert:', upsertErr.message);

      // For workers → also create workers row
      if (role === 'worker') {
        const { error: workerErr } = await _supabase
          .from('workers')
          .insert({ user_id: userId, name, email, status: 'active' });
        if (workerErr) console.warn('[Auth] workers insert:', workerErr.message);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || 'Registration failed.' };
    }
  },

  // ── Login ─────────────────────────────────────────────────────
  async login({ email, password }) {
    try {
      const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };

      // Fetch profile by user ID
      const { data: profile, error: profileErr } = await _supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileErr || !profile) {
        // Fallback to auth metadata
        const meta = data.user.user_metadata || {};
        const fallback = {
          id: data.user.id, name: meta.name || email,
          email, role: meta.role || 'worker', worker_id: null,
        };
        localStorage.setItem('agrismart_session', JSON.stringify(fallback));
        return { success: true, user: fallback };
      }

      // Fetch worker_id for attendance tracking
      let workerId = null;
      if (profile.role === 'worker') {
        const { data: workerRow } = await _supabase
          .from('workers').select('id').eq('user_id', profile.id).maybeSingle();
        workerId = workerRow?.id || null;
      }

      const user = {
        id: profile.id, name: profile.name,
        email: profile.email, role: profile.role, worker_id: workerId,
      };

      localStorage.setItem('agrismart_session', JSON.stringify(user));
      return { success: true, user };
    } catch (err) {
      return { success: false, error: err.message || 'Login failed.' };
    }
  },

  // ── Redirect by role ──────────────────────────────────────────
  redirectByRole(role) {
    if (role === 'admin' || role === 'supervisor') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'worker-dashboard.html';
    }
  },

  // ── Session ───────────────────────────────────────────────────
  getSession() {
    const raw = localStorage.getItem('agrismart_session');
    return raw ? JSON.parse(raw) : null;
  },

  requireAuth() {
    const session = this.getSession();
    if (!session) { window.location.href = 'login.html'; return null; }
    return session;
  },

  requireRole(...allowedRoles) {
    const session = this.requireAuth();
    if (!session) return null;
    if (!allowedRoles.includes(session.role)) {
      window.location.href = 'login.html'; return null;
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