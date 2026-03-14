<div align="center">

# Ultimate Tracker

**Real-time collaborative map for Albion Online guilds.**
Track resources, routes, and Avalon portals — all in one place, shared with your guild.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Discord](https://img.shields.io/badge/Discord-Bot-5865F2?logo=discord&logoColor=white)](https://discord.com/developers/docs/intro)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

</div>

---

## What is it?

Ultimate Tracker is a guild tool that brings your Albion Online coordination to a new level.
Your scouts report nodes, routes, and Avalon portals — and every guild member sees it live on an interactive map.

**Key features:**

- **Interactive World Map** — zone labels color-coded by PvP level (blue / yellow / red / black)
- **Avalon Web** — visual graph of all active Avalon Road connections, with timers
- **Node & Orb Tracker** — report resource spawns and objectives via web or Discord `/scout`
- **Route Planner** — draw and share collection routes across the map
- **Avalon Portal Landmarks** — Royal Continent zones with active Avalon portals highlighted on the world map
- **Discord Integration** — slash commands for setup, scouting, and map sharing
- **Multi-language** — English, Português, Español, 中文

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Leaflet, React Flow, SWR |
| Backend | Python FastAPI (async), SQLAlchemy, Alembic, PostgreSQL |
| Bot | discord.py (slash commands) |
| Auth | Discord OAuth2 |

---

## Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL | 15+ |

---

### 1. Database

```sql
CREATE DATABASE ultimatetracker;
```

---

### 2. Backend

```bash
cd backend
```

```bash
# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\Activate.ps1

# Linux / macOS
source .venv/bin/activate
```

```bash
pip install -r requirements.txt
```

Copy and configure environment variables:

```bash
# Windows
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/ultimatetracker
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
SESSION_SECRET=a_long_random_string
SITE_URL=http://localhost:3000
```

> Create your Discord app at https://discord.com/developers/applications
> Set the Redirect URI to: `http://localhost:8000/auth/discord/callback`

```bash
# Run migrations
alembic upgrade head

# Start the API
uvicorn main:app --reload --port 8000
```

API available at `http://localhost:8000` · Swagger docs at `http://localhost:8000/docs`

---

### 3. Frontend

```bash
cd frontend
npm install
```

Adjust `.env.local` if needed:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
npm run dev
```

App available at `http://localhost:3000`

---

### 4. Discord Bot

```bash
cd bot
python -m venv .venv

# Windows
.venv\Scripts\Activate.ps1

# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
```

```env
DISCORD_TOKEN=your_bot_token
API_BASE_URL=http://localhost:8000
SITE_URL=http://localhost:3000
```

```bash
python main.py
```

**Bot slash commands:**

| Command | Description |
|---|---|
| `/setup` | Register your guild (admin) |
| `/role @role` | Set the role with map access (admin) |
| `/scout` | Report a node or objective |
| `/mapa` | Get the map link |

---

### Quick Start (all at once)

```bash
# Terminal 1 — Backend
cd backend && source .venv/bin/activate && alembic upgrade head && uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend && npm run dev

# Terminal 3 — Bot
cd bot && source .venv/bin/activate && python main.py
```

> The backend must be running **before** the frontend and the bot.

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## Acknowledgements

- Map tiles and data from [Albion Online Wiki](https://wiki.albiononline.com)
- Built with love for the Albion Online community
