// ── Password visibility toggle ──────────────────────────────
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

// ── Sign In ─────────────────────────────────────────────────
document.getElementById('signInBtn').addEventListener('click', () => {
  const email = document.getElementById('email').value.trim();
  const pw    = document.getElementById('password').value;

  if (!email || !pw) {
    alert('Please fill in all fields.');
    return;
  }

  // Role-based routing demo
  // Emails starting with "admin@" → Admin dashboard
  // Anything else → Worker dashboard (both go to index.html for now)
  window.location.href = 'index.html';
});