# Ultimate Tracker — Tutorial de Execução

Guia para rodar o projeto localmente: backend FastAPI + frontend Next.js + bot Discord.

---

## Pré-requisitos

| Ferramenta | Versão recomendada |
|---|---|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL | 15+ |

---

## 1. PostgreSQL — Banco de Dados

Crie o banco antes de subir o backend:

```sql
CREATE DATABASE ultimatetracker;
```

---

## 2. Backend (FastAPI)

Abra um terminal na pasta `backend/`:

```bash
cd backend
```

### 2.1 Criar e ativar ambiente virtual

**Windows (PowerShell)**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**Linux / macOS**
```bash
python -m venv .venv
source .venv/bin/activate
```

### 2.2 Instalar dependências

```bash
pip install -r requirements.txt
```

### 2.3 Configurar variáveis de ambiente

```bash
# Windows
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

Edite o `.env` com suas credenciais:

```env
DATABASE_URL=postgresql+asyncpg://seu_usuario:sua_senha@localhost:5432/ultimatetracker
DISCORD_CLIENT_ID=seu_client_id
DISCORD_CLIENT_SECRET=seu_client_secret
SESSION_SECRET=string_aleatoria_longa
SITE_URL=http://localhost:3000
```

> Para obter `DISCORD_CLIENT_ID` e `DISCORD_CLIENT_SECRET`, crie um app em https://discord.com/developers/applications  
> e configure o Redirect URI como: `http://localhost:8000/auth/discord/callback`  
> ⚠️ O callback é tratado pelo **backend** (porta 8000), não pelo frontend.

### 2.4 Executar migrations do banco

```bash
alembic upgrade head
```

### 2.5 Iniciar o servidor

```bash
uvicorn main:app --reload --port 8000
```

A API ficará disponível em: `http://localhost:8000`  
Documentação automática (Swagger): `http://localhost:8000/docs`

---

## 3. Frontend (Next.js)

Abra **outro terminal** na pasta `frontend/`:

```bash
cd frontend
```

### 3.1 Instalar dependências

```bash
npm install
```

### 3.2 Configurar variáveis de ambiente

O arquivo `.env.local` já está criado. Ajuste se necessário:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3.3 Iniciar em modo desenvolvimento

```bash
npm run dev
```

A aplicação ficará disponível em: `http://localhost:3000`

---

## 4. Bot Discord

Abra **outro terminal** na pasta `bot/`:

```bash
cd bot
```

### 4.1 Criar e ativar ambiente virtual

```powershell
# Windows
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 4.2 Instalar dependências

```bash
pip install -r requirements.txt
```

### 4.3 Configurar variáveis de ambiente

```bash
# Windows
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

Edite o `.env`:

```env
DISCORD_TOKEN=token_do_seu_bot
API_BASE_URL=http://localhost:8000
SITE_URL=http://localhost:3000
```

> Para obter o `DISCORD_TOKEN`, no painel do desenvolvedor Discord: Bot → Reset Token.  
> Permissões necessárias: `applications.commands`, `bot` com `Send Messages`.

### 4.4 Iniciar o bot

```bash
python main.py
```

### 4.5 Configurar no Discord

No servidor Discord, use os comandos:
1. `/setup` — registra a guilda (admin)
2. `/role @suarole` — define a role com acesso ao tracker (admin)
3. `/scout` — reporta um objetivo no mapa
4. `/mapa` — retorna o link do mapa
5. `/role` — (re)configura a role de acesso

---

## 5. Build de produção (opcional)

```bash
# Frontend
cd frontend
npm run build
npm run start
```

---

## Resumo rápido

```powershell
# Terminal 1 — Backend
cd backend; .venv\Scripts\Activate.ps1; alembic upgrade head; uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend; npm run dev

# Terminal 3 — Bot
cd bot; .venv\Scripts\Activate.ps1; python main.py
```

> **Atenção:** o backend deve estar rodando **antes** do frontend e do bot.  
> O banco PostgreSQL deve estar ativo e migrado antes de iniciar o backend.
