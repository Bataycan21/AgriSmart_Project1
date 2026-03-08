// ── Password visibility toggle ───────────────────────────────
const togglePw = document.getElementById('togglePw');
const pwInput  = document.getElementById('password');

const EYE_OPEN = `
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
  <circle cx="12" cy="12" r="3"/>
`;
const EYE_CLOSED = `
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
  <line x1="1" y1="1" x2="23" y2="23"/>
`;

togglePw.addEventListener('click', () => {
  const isHidden = pwInput.type === 'password';
  pwInput.type = isHidden ? 'text' : 'password';
  togglePw.querySelector('svg').innerHTML = isHidden ? EYE_CLOSED : EYE_OPEN;
});

// ── Error banner ──────────────────────────────────────────────
function showError(msg) {
  let banner = document.getElementById('loginError');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'loginError';
    banner.style.cssText = 'background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:0.7rem 1rem;font-size:0.78rem;color:#dc2626;margin-bottom:1rem;text-align:center;';
    document.getElementById('signInBtn').before(banner);
  }
  banner.textContent = msg;
  banner.style.display = 'block';
}

// ── Sign In ───────────────────────────────────────────────────
document.getElementById('signInBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const pw    = document.getElementById('password').value;

  if (!email || !pw) { showError('Please fill in all fields.'); return; }

  document.getElementById('signInBtn').textContent = 'Signing in...';
  document.getElementById('signInBtn').disabled = true;

  const result = await Auth.login({ email, password: pw });

  if (!result.success) {
    showError(result.error);
    document.getElementById('signInBtn').textContent = 'Sign In';
    document.getElementById('signInBtn').disabled = false;
    return;
  }

  Auth.redirectByRole(result.user.role);
});