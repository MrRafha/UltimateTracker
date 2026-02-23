from __future__ import annotations

import json
import os
from dotenv import load_dotenv

load_dotenv()

DISCORD_TOKEN: str = os.environ["DISCORD_TOKEN"]
API_BASE_URL:  str = os.getenv("API_BASE_URL", "http://localhost:8000")
SITE_URL:      str = os.getenv("SITE_URL",     "http://localhost:3000")
BOT_SECRET:    str = os.getenv("BOT_SECRET",   "")

# { guild_id -> api_key }  — persisted in .env as a JSON string
_raw = os.getenv("GUILD_API_KEYS", "{}")
GUILD_API_KEYS: dict[str, str] = json.loads(_raw)


def get_api_key(guild_id: str | int) -> str | None:
    return GUILD_API_KEYS.get(str(guild_id))
