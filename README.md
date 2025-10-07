# 🏦 Banking Integration System

Sistema de integração bancária brasileiro desenvolvido com TypeScript, Node.js, Express e SQLite, projetado para conectar com os principais bancos brasileiros.

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![Express](https://img.shields.io/badge/Express-4.19+-red.svg)
![SQLite](https://img.shields.io/badge/SQLite-3+-orange.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## 🚀 Funcionalidades

- **Autenticação e Autorização**: Sistema completo de login/logout com JWT
- **Gestão de Usuários**: Cadastro, edição e controle de acesso
- **Conexões Bancárias**: Integração com bancos brasileiros
- **Contas Bancárias**: Gerenciamento de múltiplas contas
- **Transações**: Histórico completo e processamento
- **Analytics**: Relatórios e dashboards financeiros
- **Backup**: Sistema automatizado de backup
- **APIs Modernas**: RESTful APIs com documentação
- **Interface Web**: Frontend moderno e responsivo

## 🏛️ Bancos Suportados

- **Banco do Brasil (BB)**
- **Bradesco**
- **Itaú Unibanco**
- **Santander**
- **Caixa Econômica Federal**
- **Nubank**
- **Inter**
- **Sicoob**

## 🛠️ Tecnologias

### Backend
- **Node.js** 18+
- **TypeScript** 5.0+
- **Express.js** - Framework web
- **TypeORM** - ORM para banco de dados
- **SQLite** - Banco de dados
- **JWT** - Autenticação
- **Bcrypt** - Hash de senhas
- **Helmet** - Segurança HTTP
- **CORS** - Cross-Origin Resource Sharing
- **Rate Limiting** - Controle de taxa

### Frontend
- **HTML5/CSS3** - Interface moderna
- **JavaScript ES6+** - Funcionalidades dinâmicas
- **Chart.js** - Gráficos e visualizações
- **Responsive Design** - Compatível com dispositivos móveis

### Ferramentas de Desenvolvimento
- **ts-node-dev** - Desenvolvimento com hot reload
- **ESLint** - Linting de código
- **Jest** - Testes unitários
- **TypeScript** - Tipagem estática

## 📦 Instalação

### Pré-requisitos
- Node.js 18 ou superior
- npm ou yarn
- Git

### Passos de Instalação

1. **Clone o repositório:**
```bash
git clone https://github.com/aviladevs/banking-integration-system.git
cd banking-integration-system
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure o ambiente:**
```bash
# O arquivo .env já está configurado para desenvolvimento local com SQLite
# Nenhuma configuração adicional é necessária para começar
```

4. **Execute o sistema:**
```bash
# Modo desenvolvimento (com hot reload)
npm run dev

# Ou compile e execute
npm run build
npm start
```

5. **Acesse o sistema:**
- Interface Web: http://localhost:3001
- Health Check: http://localhost:3001/health
- API Base: http://localhost:3001/api

## 🔧 Configuração

### Variáveis de Ambiente

O arquivo `.env` já vem pré-configurado para desenvolvimento:

```env
NODE_ENV=development
PORT=3001
DB_TYPE=sqlite
DATABASE_PATH=database.sqlite
JWT_SECRET=sua-chave-jwt-secreta
SEED_ADMIN=true
ADMIN_EMAIL=admin@financeiro.com
ADMIN_PASSWORD=admin123
```

### Usuário Administrador Padrão

- **Email:** `admin@financeiro.com`
- **Senha:** `admin123`

> ⚠️ **Importante:** Altere as credenciais padrão em produção!

## 🏗️ Estrutura do Projeto

```
├── src/
│   ├── entities/          # Entidades do banco de dados
│   ├── routes/            # Rotas da API
│   ├── services/          # Lógica de negócio
│   ├── middleware/        # Middlewares Express
│   ├── bootstrap/         # Configurações iniciais
│   └── types/             # Definições de tipos TypeScript
├── public/                # Arquivos estáticos (frontend)
├── schemas/               # Schemas de validação
├── examples/              # Exemplos de uso da API
└── docs/                  # Documentação
```

## 📋 Scripts Disponíveis

```bash
# Desenvolvimento com hot reload
npm run dev

# Compilar TypeScript
npm run build

# Executar versão compilada
npm start

# Testes
npm test

# Linting
npm run lint
npm run lint:fix

# Migrations do banco
npm run migration:generate
npm run migration:run
npm run migration:revert
```

## 🔗 Endpoints da API

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/register` - Registro

### Usuários
- `GET /api/users` - Listar usuários
- `POST /api/users` - Criar usuário
- `PUT /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Excluir usuário

### Bancos
- `GET /api/banks` - Listar bancos suportados
- `POST /api/banks/connect` - Conectar banco

### Contas
- `GET /api/accounts` - Listar contas
- `POST /api/accounts` - Adicionar conta
- `GET /api/accounts/:id/balance` - Saldo da conta

### Transações
- `GET /api/transactions` - Listar transações
- `POST /api/transactions` - Criar transação
- `GET /api/transactions/:id` - Detalhes da transação

### Analytics
- `GET /api/analytics/summary` - Resumo financeiro
- `GET /api/analytics/charts` - Dados para gráficos

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Testes com coverage
npm run test:coverage

# Testes em modo watch
npm run test:watch
```

## 🚀 Deploy

### Desenvolvimento Local
O sistema está configurado para rodar localmente com SQLite, não requerendo configuração adicional.

### Produção
Para produção, considere:

1. **Banco de dados:** Migrar para PostgreSQL ou MySQL
2. **Variáveis de ambiente:** Configurar `.env` para produção
3. **HTTPS:** Configurar certificados SSL
4. **Process Manager:** Usar PM2 ou Docker
5. **Monitoramento:** Implementar logs e métricas

### Docker (Opcional)
```bash
# Build da imagem
docker build -t banking-system .

# Executar container
docker run -p 3001:3001 banking-system
```

## 🔐 Segurança

- ✅ JWT para autenticação
- ✅ Bcrypt para hash de senhas
- ✅ Helmet para headers de segurança
- ✅ Rate limiting
- ✅ CORS configurado
- ✅ Validação de dados
- ✅ Sanitização de inputs

## 📚 Documentação da API

A documentação completa da API está disponível em:
- Swagger/OpenAPI: http://localhost:3001/api/docs (em desenvolvimento)
- Exemplos: Pasta `examples/`

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👨‍💻 Autor

**Avila** - [@aviladevs](https://github.com/aviladevs)

- Website: [aviladevops.com.br](https://www.aviladevops.com.br)

## 🙏 Agradecimentos

- Comunidade Node.js
- Contribuidores do TypeORM
- Documentação dos bancos brasileiros
- Comunidade open source

---

⭐ Se este projeto foi útil para você, considere dar uma estrela no repositório!