// ── Password visibility toggles ─────────────────────────────
const EYE_OPEN = `
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
  <circle cx="12" cy="12" r="3"/>
`;
const EYE_CLOSED = `
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
  <line x1="1" y1="1" x2="23" y2="23"/>
`;

function setupToggle(btnId, inputId) {
  const btn = document.getElementById(btnId);
  const inp = document.getElementById(inputId);
  btn.addEventListener('click', () => {
    const isHidden = inp.type === 'password';
    inp.type = isHidden ? 'text' : 'password';
    btn.querySelector('svg').innerHTML = isHidden ? EYE_CLOSED : EYE_OPEN;
  });
}
setupToggle('togglePw1', 'password');
setupToggle('togglePw2', 'confirmPw');

// ── Validation helper ────────────────────────────────────────
function validate(fieldId, isValid, errorMsg) {
  const field = document.getElementById(fieldId);
  const errEl = field.querySelector('.err-msg');
  if (isValid) {
    field.classList.remove('invalid');
  } else {
    field.classList.add('invalid');
    if (errorMsg && errEl) errEl.textContent = errorMsg;
  }
  return isValid;
}

// ── Error banner ─────────────────────────────────────────────
function showError(msg) {
  let banner = document.getElementById('authError');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'authError';
    banner.style.cssText = 'background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:0.7rem 1rem;font-size:0.78rem;color:#dc2626;margin-bottom:1rem;text-align:center;';
    document.getElementById('createBtn').before(banner);
  }
  banner.textContent = msg;
  banner.style.display = 'block';
}
function hideError() {
  const banner = document.getElementById('authError');
  if (banner) banner.style.display = 'none';
}

// ── Create Account ───────────────────────────────────────────
document.getElementById('createBtn').addEventListener('click', () => {
  hideError();

  const name  = document.getElementById('fullname').value.trim();
  const email = document.getElementById('email').value.trim();
  const pw    = document.getElementById('password').value;
  const cpw   = document.getElementById('confirmPw').value;
  const role  = document.getElementById('role').value;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const v1 = validate('nameField',  name.length > 0);
  const v2 = validate('emailField', emailRegex.test(email));
  const v3 = validate('pwField',    pw.length >= 6);
  const v4 = validate('cpwField',   pw === cpw, 'Passwords do not match.');

  if (!v1 || !v2 || !v3 || !v4) return;

  // ── Call Auth layer ────────────────────────────────────────
  const result = Auth.register({ name, email, password: pw, role });

  if (!result.success) {
    showError(result.error);
    return;
  }

  // Success — go to login
  alert(`Account created! Welcome, ${name}. Please sign in.`);
  window.location.href = 'login.html';
});