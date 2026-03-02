// ============================================================
//  auth.js  –  AgriSmart Auth & Session Manager
//  All "database" calls are clearly marked for Supabase swap.
//  Search: [SUPABASE] to find every spot to replace.
// ============================================================

const Auth = (() => {

  const USERS_KEY   = 'agrismart_users';
  const SESSION_KEY = 'agrismart_session';

  // ── Local "database" (replace with Supabase) ──────────────

  function getUsers() {
    // [SUPABASE] Remove this entire function
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  }

  function saveUsers(users) {
    // [SUPABASE] Remove this entire function
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // ── Session ────────────────────────────────────────────────

  function saveSession(user) {
    // [SUPABASE] Not needed – Supabase handles sessions automatically
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function getSession() {
    // [SUPABASE] Replace with:
    //   const { data: { session } } = await supabase.auth.getSession()
    //   return session?.user ?? null
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function clearSession() {
    // [SUPABASE] Replace with: await supabase.auth.signOut()
    sessionStorage.removeItem(SESSION_KEY);
  }

  // ── Register ───────────────────────────────────────────────

  function register({ name, email, password, role }) {
    // [SUPABASE] Replace entire function body with:
    //   const { data, error } = await supabase.auth.signUp({ email, password })
    //   if (error) return { success: false, error: error.message }
    //   await supabase.from('profiles').insert({ id: data.user.id, name, email, role })
    //   return { success: true, user: { id: data.user.id, name, email, role } }

    const users  = getUsers();
    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) return { success: false, error: 'Email already registered.' };

    const user = { id: Date.now(), name, email, password, role };
    users.push(user);
    saveUsers(users);
    return { success: true, user: { id: user.id, name, email, role } };
  }

  // ── Login ──────────────────────────────────────────────────

  function login({ email, password }) {
    // [SUPABASE] Replace entire function body with:
    //   const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    //   if (error) return { success: false, error: 'Invalid email or password.' }
    //   const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
    //   const sessionUser = { id: data.user.id, name: profile.name, email: data.user.email, role: profile.role }
    //   return { success: true, user: sessionUser }

    const users = getUsers();
    const found = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return { success: false, error: 'Invalid email or password.' };

    const sessionUser = { id: found.id, name: found.name, email: found.email, role: found.role };
    saveSession(sessionUser);
    return { success: true, user: sessionUser };
  }

  // ── Logout ─────────────────────────────────────────────────

  function logout() {
    // [SUPABASE] Replace with: await supabase.auth.signOut()
    clearSession();
    window.location.href = 'login.html';
  }

  // ── Route guard ────────────────────────────────────────────
  // Call requireAuth() at the top of every protected page JS file.

  function requireAuth(allowedRoles) {
    // [SUPABASE] Replace getSession() with supabase session check
    const user = getSession();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      redirectByRole(user.role);
      return null;
    }
    return user;
  }

  // ── Role redirect ──────────────────────────────────────────

  function redirectByRole(role) {
    if (role === 'admin' || role === 'supervisor') {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'worker-dashboard.html';
    }
  }

  return { register, login, logout, getSession, requireAuth, redirectByRole };

})();