(function() {
  const form = document.getElementById('loginForm');
  const emailEl = document.getElementById('loginEmail');
  const passEl = document.getElementById('loginPassword');

  function notify(message, type = 'info') {
    const wrap = document.getElementById('notifications');
    if (!wrap) return;
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  function apiUrl(path) {
    const base = (window.CONFIG && window.CONFIG.API_URL) || '';
    return base ? `${base}${path}` : path;
  }

  async function apiLogin(email, password) {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Falha no login');
    return data;
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailEl.value.trim();
      const password = passEl.value;

      try {
        const { token, user } = await apiLogin(email, password);
        localStorage.setItem('authToken', token);
        notify('Login realizado com sucesso!', 'success');
        // Opcional: redirecionar para uma rota autenticada do app
        // window.location.href = '/app';
      } catch (err) {
        notify(err.message || 'Não foi possível fazer login', 'error');
      }
    });
  }
})();
