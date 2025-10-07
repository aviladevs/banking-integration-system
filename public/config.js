// Configure o endpoint da API aqui ao colocar em produção
// Exemplo: window.CONFIG = { API_URL: 'https://api.seu-dominio.com' };
// Você pode sobrescrever em tempo de execução via ?api=https://... ou salvando em localStorage (API_URL)

(function() {
  window.CONFIG = window.CONFIG || {};
  if (typeof window.CONFIG.API_URL === 'undefined') {
    window.CONFIG.API_URL = '';
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const apiFromQuery = params.get('api');
    if (apiFromQuery) {
      localStorage.setItem('API_URL', apiFromQuery);
    }
  } catch (e) {}

  try {
    const stored = localStorage.getItem('API_URL');
    if (stored && !window.CONFIG.API_URL) {
      window.CONFIG.API_URL = stored;
    }
  } catch (e) {}
})();
