# Deploy (Opção B): Front no GitHub Pages + Backend em host com SQLite

Este guia publica:
- Frontend estático (login) no GitHub Pages em `financeiro.avilatransportes.com.br`
- Backend Node/Express com SQLite no Render.com (pode ser Railway/VPS também)

## 1) Frontend no GitHub Pages
Já está versionado em `docs/`:
- `docs/index.html`, `docs/styles.css`, `docs/login.js`, `docs/config.js`, `docs/CNAME`

Ative nas configurações do repositório:
- Settings > Pages > Source: `Deploy from a branch`
- Branch: `main` / Folder: `/docs`
- Custom domain: `financeiro.avilatransportes.com.br`

DNS (no provedor do domínio):
- CNAME `financeiro` -> `aviladevs.github.io`

## 2) Backend com SQLite no Render.com
Render mantém disco persistente via `disk:`.

### Deploy automático via render.yaml
1. Importar o repositório no Render.
2. Render detectará `render.yaml` e criará o serviço web.
3. Confirme as env vars:
   - `NODE_ENV=production`
   - `DB_TYPE=sqlite`
   - `DATABASE_PATH=database.sqlite`
   - `JWT_SECRET` (gerado automaticamente)
4. O serviço ficará acessível em `https://<app>.onrender.com`.

### Persistência do SQLite
- O arquivo `database.sqlite` ficará em `/app` (montado pelo `disk`).
- Tamanho configurado em 1GB (ajuste conforme necessidade).

## 3) Conectar o front na API
Edite `docs/config.js` e defina:
```js
window.CONFIG = { API_URL: 'https://<app>.onrender.com' };
```
Se você usar um domínio próprio para o backend, coloque a URL dele aqui.

## 4) Testes
- Acesse `https://financeiro.avilatransportes.com.br`
- Faça login com as credenciais do admin seed:
  - Email: `admin@admin.com`
  - Senha: `admin`

## 5) Notas
- Rate limit em produção permanece ativo.
- Evite `DB_SYNC=true` em produção. Use migrations se necessário.
- Para outro host (Railway/VPS), mantenha `DB_TYPE=sqlite` e `DATABASE_PATH` para persistência.

---
Dúvidas? Ajusto os arquivos conforme o host escolhido.