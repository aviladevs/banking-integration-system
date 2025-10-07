// Ajuste aqui para apontar para sua API em produção
// Exemplo estático: window.CONFIG = { API_URL: 'https://<seu-backend>' };
// Dica: você pode sobrescrever usando ?api=https://<seu-backend> na URL ou salvando em localStorage (API_URL)

(function() {
  // 1) valor padrão (pode ser alterado aqui manualmente)
  window.CONFIG = window.CONFIG || {};
  if (typeof window.CONFIG.API_URL === 'undefined') {
    window.CONFIG.API_URL = '';
  }

  // 2) sobrescrever via query param ?api=
  try {
    const params = new URLSearchParams(window.location.search);
    const apiFromQuery = params.get('api');
    if (apiFromQuery) {
      localStorage.setItem('API_URL', apiFromQuery);
    }
  } catch (e) {
    // ignore
  }

  // 3) sobrescrever via localStorage
  try {
    const stored = localStorage.getItem('API_URL');
    if (stored && !window.CONFIG.API_URL) {
      window.CONFIG.API_URL = stored;
    }
  } catch (e) {
    // ignore
  }
})();
