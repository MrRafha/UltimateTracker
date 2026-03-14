from __future__ import annotations
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
import re
import secrets
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from bs4 import BeautifulSoup
from cachetools import TTLCache
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from constants import TrackerSource, TrackerType
from database import SessionLocal, create_tables, get_db
from models import Guild, Tracker, Route, RouteWaypoint, GuildMember, AdminUser, AvalonPortal
from sqlalchemy import delete as sa_delete
from schemas import (
    GuildOut,
    GuildRegisterIn,
    GuildRolePatch,
    GuildRegionPatch,
    TrackerCreate,
    TrackerOut,
    ZoneCenterOut,
    RouteCreate,
    RouteOut,
    RouteWaypointOut,
    GuildMemberOut,
    AdminUserCreate,
    AdminUserOut,
    AdminGuildOut,
    AdminStatsOut,
    AvalonPortalCreate,
    AvalonPortalOut,
)

load_dotenv()


# =============================================================================
# Config
# =============================================================================

TIMERS_URL = os.getenv("TIMERS_URL", "")

# Cache simples: evita bater no site a cada request do frontend.
CACHE_TTL_SECONDS = 60

# Origens permitidas (dev). Ajuste quando publicar.
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if o.strip()
]

DISCORD_CLIENT_ID     = os.getenv("DISCORD_CLIENT_ID", "")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET", "")
BOT_SECRET            = os.getenv("BOT_SECRET", "")
SITE_URL              = os.getenv("SITE_URL", "http://localhost:3000")
SESSION_SECRET        = os.getenv("SESSION_SECRET", secrets.token_hex(32))

DISCORD_API        = "https://discord.com/api/v10"
DISCORD_OAUTH_URL  = "https://discord.com/api/oauth2"
# Callback é tratado pelo BACKEND (porta 8000), não pelo frontend
BACKEND_URL        = os.getenv("BACKEND_URL", "http://localhost:8000")
OAUTH_REDIRECT_URI = f"{BACKEND_URL.rstrip('/')}/auth/discord/callback"

# Em produção (HTTPS) o cookie precisa de SameSite=None; Secure para funcionar
# entre domínios diferentes (ex: backend.railway.app -> frontend.vercel.app)
_IS_PRODUCTION = SITE_URL.startswith("https://")
_COOKIE_KWARGS: dict = {
    "httponly": True,
    "samesite": "none" if _IS_PRODUCTION else "lax",
    "secure": _IS_PRODUCTION,
    "max_age": 60 * 60 * 24 * 7,  # 7 days
}

# in-memory session store  {token -> {user_id, username, guild_id, ...}}
# For production replace with Redis or DB-backed sessions.
_SESSIONS: Dict[str, Dict[str, Any]] = {}

# =============================================================================
# Lifespan — create DB tables on startup
# =============================================================================

async def _cleanup_expired_routes() -> None:
    """Background task: delete expired routes and avalon portals."""
    import logging
    log = logging.getLogger("uvicorn.error")
    while True:
        try:
            await asyncio.sleep(300)  # run every 5 minutes
            now = datetime.now(timezone.utc)
            async with SessionLocal() as db:
                # Find route IDs that have at least one expired waypoint
                expired_ids = (
                    await db.execute(
                        select(RouteWaypoint.route_id)
                        .where(
                            RouteWaypoint.expires_at.is_not(None),
                            RouteWaypoint.expires_at <= now,
                        )
                        .distinct()
                    )
                ).scalars().all()
                if expired_ids:
                    await db.execute(
                        sa_delete(Route).where(Route.id.in_(expired_ids))
                    )
                    log.info("🧹 Deleted %d expired Avalon route(s)", len(expired_ids))

                # Delete expired non-Royal avalon portals
                await db.execute(
                    sa_delete(AvalonPortal).where(
                        AvalonPortal.size != 0,
                        AvalonPortal.expires_at.is_not(None),
                        AvalonPortal.expires_at <= now,
                    )
                )
                await db.commit()
        except asyncio.CancelledError:
            break
        except Exception as exc:
            log.warning("cleanup_expired_routes error: %s", exc)


@asynccontextmanager
async def lifespan(app_: FastAPI):
    try:
        await create_tables()
    except Exception as exc:
        import logging
        logging.getLogger("uvicorn.error").warning(
            "⚠️  Could not connect to PostgreSQL: %s\n"
            "   Tracker/guild endpoints will be unavailable until the DB is running.",
            exc,
        )
    cleanup_task = asyncio.create_task(_cleanup_expired_routes())
    try:
        yield
    finally:
        cleanup_task.cancel()
        await asyncio.gather(cleanup_task, return_exceptions=True)


# =============================================================================
# App + CORS
# =============================================================================

app = FastAPI(
    title="Ultimate Tracker API",
    description="API for Ultimate Tracker (Albion Online node timers + Avalonian routes).",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cache = TTLCache(maxsize=1, ttl=CACHE_TTL_SECONDS)


# =============================================================================
# Carregamento de dados locais (aliases + zonas)
# =============================================================================
# IMPORTANTES:
# - zone_aliases.json: mapeia nome vindo do timers -> zoneId canônico
# - zones.json: lista de zonas com center (x,y) no sistema do seu mapa (Leaflet CRS.Simple)
#
# Esses arquivos devem estar na mesma pasta do main.py (backend/).
# =============================================================================

BASE_DIR = Path(__file__).resolve().parent

with open(BASE_DIR / "zone_aliases.json", "r", encoding="utf-8") as f:
    ZONE_ALIASES: Dict[str, str] = json.load(f)

with open(BASE_DIR / "zones.json", "r", encoding="utf-8") as f:
    ZONES_LIST: List[Dict[str, Any]] = json.load(f)

# Merge zone conflict colors (blue/yellow/red/black) gerado por scripts/fetch_zone_colors.py
_zone_colors_path = BASE_DIR / "zone_colors.json"
if _zone_colors_path.exists():
    with open(_zone_colors_path, "r", encoding="utf-8") as f:
        _ZONE_COLORS: Dict[str, str] = json.load(f)
    for _z in ZONES_LIST:
        _z["color"] = _ZONE_COLORS.get(_z["displayName"])
else:
    for _z in ZONES_LIST:
        _z["color"] = None

# Index por zoneId para lookup rápido
ZONES: Dict[str, Dict[str, Any]] = {z["zoneId"]: z for z in ZONES_LIST}

with open(BASE_DIR / "avalon_zones.json", "r", encoding="utf-8") as f:
    AVALON_ZONES_LIST: List[Dict[str, Any]] = json.load(f)


# =============================================================================
# Helpers
# =============================================================================

def norm_zone(s: str) -> str:
    """
    Normaliza o texto do nome da zona para maximizar acerto no dicionário de aliases.
    Ex: "🗺️ watchwood bluffs" -> "watchwood bluffs"
    """
    s = s.replace("🗺️", "").strip().lower()
    for ch in ["_", "-", ".", ",", "(", ")", "[", "]", "{", "}", "’", "'"]:
        s = s.replace(ch, " ")
    s = " ".join(s.split())
    return s

def slugify_zone_id(name: str) -> str:
    # "Battlebrae Plain" -> "BATTLEBRAE_PLAIN"
    s = name.strip().upper()
    s = re.sub(r"[^A-Z0-9]+", "_", s)
    return s.strip("_")

def sha1_id(*parts: str) -> str:
    """Gera um ID estável para deduplicação/keys no frontend."""
    raw = "|".join(parts).encode("utf-8")
    return hashlib.sha1(raw).hexdigest()


def parse_last_update(text: str) -> Optional[str]:
    """
    A página mostra algo como:
    'Última atualização: 20/02/2026, 10:30:14'
    Não confiamos 100% no timezone exibido; para MVP, convertemos para ISO em UTC.
    Se não casar, retornamos None.
    """
    m = re.search(r"(\d{2})/(\d{2})/(\d{4}),\s*(\d{2}):(\d{2})(?::(\d{2}))?", text)
    if not m:
        return None
    dd, mm, yyyy, hh, mi, ss = m.groups()
    ss = ss or "00"
    dt = datetime(int(yyyy), int(mm), int(dd), int(hh), int(mi), int(ss), tzinfo=timezone.utc)
    return dt.isoformat()


# =============================================================================
# Scraper / Parser do timers.unslave.online
# =============================================================================

async def fetch_timers_raw() -> Dict[str, Any]:
    """
    Busca e parseia o HTML do timers.unslave.online.

    A estrutura relevante do HTML (confirmada no arquivo que você enviou):
    - Cada item está em: div.timer-card[data-spawn="..."]
    - O countdown usa o atributo data-spawn (epoch em ms) (é o dado mais confiável) :contentReference[oaicite:1]{index=1}
    - Nome da zona: p.map (tem um emoji 🗺️ no início) :contentReference[oaicite:2]{index=2}
    - Objetivo: h3 :contentReference[oaicite:3]{index=3}
    - Texto de data: p.spawn-time (somente informativo; data-spawn é o real) :contentReference[oaicite:4]{index=4}
    - Última atualização: div.last-update :contentReference[oaicite:5]{index=5}
    """
    async with httpx.AsyncClient(timeout=20, headers={"User-Agent": "Mozilla/5.0"}) as client:
        r = await client.get(TIMERS_URL)
        r.raise_for_status()

    soup = BeautifulSoup(r.content.decode("utf-8"), "html.parser")

    # "Última atualização"
    last_update_el = soup.select_one("div.last-update")
    updated_at = None
    if last_update_el:
        updated_at = parse_last_update(last_update_el.get_text(" ", strip=True))

    # Itens
    items: List[Dict[str, Any]] = []
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

    for card in soup.select("div.timer-card"):
        spawn_ms_str = card.get("data-spawn")
        if not spawn_ms_str:
            continue

        try:
            spawn_ms = int(spawn_ms_str)
        except ValueError:
            continue

        # Objetivo (ex: "Vortex Dourado" / "Madeira 8.4", etc.)
        h3 = card.select_one(".timer-content h3")
        objective = h3.get_text(" ", strip=True) if h3 else "UNKNOWN"

        # Nome da zona
        map_el = card.select_one(".timer-content p.map")
        zone_text = map_el.get_text(" ", strip=True) if map_el else ""
        zone_name = zone_text.replace("🗺️", "").strip()

        # Texto exibido da data (auxiliar)
        spawn_time_el = card.select_one(".timer-content p.spawn-time")
        spawn_time_text = spawn_time_el.get_text(" ", strip=True) if spawn_time_el else ""

        respawn_at = datetime.fromtimestamp(spawn_ms / 1000, tz=timezone.utc).isoformat()
        status = "SPAWNED" if spawn_ms <= now_ms else "COUNTDOWN"

        item_id = sha1_id(zone_name, objective, str(spawn_ms))

        items.append(
            {
                "id": item_id,
                "objective": objective,
                "zoneName": zone_name,
                "spawnMs": spawn_ms,
                "respawnAt": respawn_at,
                "spawnTimeText": spawn_time_text,
                "status": status,
                "source": "timers.unslave.online",
            }
        )

    return {
        "updatedAt": updated_at or datetime.now(timezone.utc).isoformat(),
        "items": items,
    }


def enrich_items(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enriquecimento local:
    - zoneKey normalizado
    - zoneId (via zone_aliases.json)
    - center (via zones.json) -> usado no mapa para colocar o ping
    """
    enriched: List[Dict[str, Any]] = []

    for it in data.get("items", []):
        zone_raw = it.get("zoneName", "")
        zone_key = norm_zone(zone_raw)

        zone_id = ZONE_ALIASES.get(zone_key)
        zone = ZONES.get(zone_id) if zone_id else None
        center = zone.get("center") if zone else None
            # Fallback: tenta casar diretamente pelo "zoneId" gerado a partir do nome
        if not zone_id:
         candidate = slugify_zone_id(zone_raw)
         if candidate in ZONES:
            zone_id = candidate

        enriched.append(
            {
                **it,
                "zoneKey": zone_key,
                "zoneId": zone_id,
                "center": center,
            }
        )

    return {"updatedAt": data.get("updatedAt"), "items": enriched}


# =============================================================================
# Rotas
# =============================================================================

@app.get("/timers")
async def timers(
    guild_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint principal consumido pelo Next.js.
    Usa cache TTL para reduzir fetch do site de terceiros.
    Se guild_id for informado, retorna vazio para guildas fora do servidor WEST.
    """
    if guild_id:
        result = await db.execute(select(Guild).where(Guild.guild_id == guild_id))
        guild = result.scalar_one_or_none()
        if guild and guild.server_region != "WEST":
            return {"updatedAt": datetime.now(timezone.utc).isoformat(), "items": []}

    if "timers" in cache:
        return cache["timers"]

    raw = await fetch_timers_raw()
    payload = enrich_items(raw)

    cache["timers"] = payload
    return payload


@app.get("/zones")
async def zones():
    """Retorna o catálogo de zonas (para debug/admin UI)."""
    return list(ZONES.values())


@app.get("/avalon-zones")
async def avalon_zones():
    """Retorna a lista das 400 zonas Avalonianas (TNL-001…TNL-400)."""
    return AVALON_ZONES_LIST


@app.get("/health")
async def health():
    return {"ok": True}


# =============================================================================
# Auth helpers
# =============================================================================

def _get_session(request: Request) -> Optional[Dict[str, Any]]:
    token = request.cookies.get("session")
    if not token:
        return None
    return _SESSIONS.get(token)


async def _require_session(request: Request) -> Dict[str, Any]:
    session = _get_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return session


def _user_guild_ids(session: Dict[str, Any]) -> set:
    """Return set of guild_ids the session user has access to."""
    guilds = session.get("guilds")
    if guilds:
        return {g["guild_id"] for g in guilds}
    # backward-compat: sessions created before multi-guild support
    gid = session.get("guild_id")
    return {gid} if gid else set()


async def _can_access_guild(guild_id: str, session: Dict[str, Any], db: AsyncSession) -> bool:
    """Return True if the session user is a guild member OR a system admin."""
    if guild_id in _user_guild_ids(session):
        return True
    discord_id = session.get("id") or session.get("user_id")
    if not discord_id:
        return False
    result = await db.execute(select(AdminUser).where(AdminUser.discord_id == discord_id))
    return result.scalar_one_or_none() is not None


async def _require_admin(request: Request, db: AsyncSession = Depends(get_db)) -> AdminUser:
    """Verify the session user exists in admin_users table."""
    session = _get_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    discord_id = session.get("id") or session.get("user_id")
    result = await db.execute(select(AdminUser).where(AdminUser.discord_id == discord_id))
    admin = result.scalar_one_or_none()
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return admin


async def _require_api_key(
    db: AsyncSession = Depends(get_db),
    x_api_key: str = Header(..., alias="X-Api-Key"),
) -> Guild:
    result = await db.execute(select(Guild).where(Guild.api_key == x_api_key))
    guild = result.scalar_one_or_none()
    if not guild:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return guild


async def _require_api_key_or_session(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_api_key: Optional[str] = Header(None, alias="X-Api-Key"),
) -> Guild:
    """Accepts either X-Api-Key header (bot) or a valid web session cookie."""
    if x_api_key:
        result = await db.execute(select(Guild).where(Guild.api_key == x_api_key))
        guild = result.scalar_one_or_none()
        if not guild:
            raise HTTPException(status_code=403, detail="Invalid API key")
        return guild
    session = _get_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # Read guild_id from request body so users can act on any guild they belong to,
    # not just the primary guild stored in the session.
    try:
        body = await request.json()
        guild_id = body.get("guild_id") or session.get("guild_id")
    except Exception:
        guild_id = session.get("guild_id")
    if guild_id not in _user_guild_ids(session):
        raise HTTPException(status_code=403, detail="You don't have access to this guild")
    result = await db.execute(select(Guild).where(Guild.guild_id == guild_id))
    guild = result.scalar_one_or_none()
    if not guild:
        raise HTTPException(status_code=403, detail="Guild not found")
    return guild


# =============================================================================
# Guild routes
# =============================================================================

@app.post("/guilds/register", response_model=GuildOut)
async def register_guild(
    payload: GuildRegisterIn,
    db: AsyncSession = Depends(get_db),
    x_bot_secret: Optional[str] = Header(None, alias="X-Bot-Secret"),
):
    """Called by the bot on first setup to register a guild and receive an API key."""
    if not BOT_SECRET or x_bot_secret != BOT_SECRET:
        raise HTTPException(status_code=403, detail="Invalid bot secret")
    result = await db.execute(select(Guild).where(Guild.guild_id == payload.guild_id))
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    guild = Guild(
        guild_id=payload.guild_id,
        guild_name=payload.guild_name,
        api_key=secrets.token_urlsafe(32),
    )
    db.add(guild)
    await db.commit()
    await db.refresh(guild)
    return guild


@app.patch("/guilds/{guild_id}/role", response_model=GuildOut)
async def set_guild_role(
    guild_id: str,
    payload: GuildRolePatch,
    guild: Guild = Depends(_require_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Set or update the Discord role that is allowed to use the bot and view the map."""
    if guild.guild_id != guild_id:
        raise HTTPException(status_code=403, detail="API key does not belong to this guild")
    guild.allowed_role_id = payload.allowed_role_id
    await db.commit()
    await db.refresh(guild)
    return guild


@app.patch("/guilds/{guild_id}/region", response_model=GuildOut)
async def set_guild_region_bot(
    guild_id: str,
    payload: GuildRegionPatch,
    guild: Guild = Depends(_require_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Set the server region via bot (X-Api-Key auth)."""
    if guild.guild_id != guild_id:
        raise HTTPException(status_code=403, detail="API key does not belong to this guild")
    guild.server_region = payload.server_region
    await db.commit()
    await db.refresh(guild)
    return guild


@app.patch("/guilds/{guild_id}/settings", response_model=GuildOut)
async def set_guild_settings_web(
    guild_id: str,
    payload: GuildRegionPatch,
    db: AsyncSession = Depends(get_db),
    session: Dict[str, Any] = Depends(_require_session),
):
    """Set the server region from the web dashboard (session auth)."""
    if guild_id not in _user_guild_ids(session):
        raise HTTPException(status_code=403, detail="Not a member of this guild")
    guild = await db.get(Guild, guild_id)
    if not guild:
        raise HTTPException(status_code=404, detail="Guild not found")
    guild.server_region = payload.server_region
    await db.commit()
    await db.refresh(guild)
    return guild


@app.get("/guilds/{guild_id}/bot-plan-status")
async def bot_plan_status(
    guild_id: str,
    db: AsyncSession = Depends(get_db),
    x_api_key: Optional[str] = Header(None, alias="X-Api-Key"),
):
    """Returns whether the guild has an active plan. Used by the bot before showing scout modal."""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="Missing API key")
    result = await db.execute(select(Guild).where(Guild.api_key == x_api_key, Guild.guild_id == guild_id))
    guild = result.scalar_one_or_none()
    if not guild:
        raise HTTPException(status_code=403, detail="Invalid API key")
    now = datetime.now(timezone.utc)
    active = (
        guild.plan_status in ("active", "trial")
        and (guild.plan_expires_at is None or guild.plan_expires_at > now)
    )
    return {"active": active, "plan": guild.plan, "plan_status": guild.plan_status}


# =============================================================================
# Tracker routes
# =============================================================================

@app.post("/trackers", response_model=TrackerOut)
async def create_tracker(
    payload: TrackerCreate,
    guild: Guild = Depends(_require_api_key_or_session),
    db: AsyncSession = Depends(get_db),
):
    """Create a tracker entry. Used by the bot and the web form."""
    # For bot requests (X-Api-Key), verify the key matches the target guild.
    # For session requests, guild ownership is already validated in _require_api_key_or_session.
    if guild.guild_id != payload.guild_id:
        raise HTTPException(status_code=403, detail="API key does not belong to this guild")

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=payload.hours, minutes=payload.minutes)

    # Try to resolve zone center from local data
    zone_key = norm_zone(payload.zone_name)
    zone_id = ZONE_ALIASES.get(zone_key)
    if not zone_id:
        zone_id = slugify_zone_id(payload.zone_name) if slugify_zone_id(payload.zone_name) in ZONES else None
    zone = ZONES.get(zone_id) if zone_id else None
    center = zone.get("center") if zone else None

    tracker = Tracker(
        guild_id=payload.guild_id,
        zone_name=payload.zone_name,
        zone_id=zone_id,
        center_x=center["x"] if center else None,
        center_y=center["y"] if center else None,
        type=payload.type,
        objective=payload.objective,
        reported_by_id=payload.reported_by_id,
        reported_by_name=payload.reported_by_name,
        source=payload.source,
        expires_at=expires_at,
        tier=payload.tier,
    )
    db.add(tracker)
    await db.commit()
    await db.refresh(tracker)
    return _tracker_to_out(tracker)


@app.get("/trackers", response_model=List[TrackerOut])
async def list_trackers(
    guild_id: str,
    db: AsyncSession = Depends(get_db),
    session: Dict[str, Any] = Depends(_require_session),
):
    """Return active (non-expired) trackers for a guild. Requires Discord session."""
    if not await _can_access_guild(guild_id, session, db):
        raise HTTPException(status_code=403, detail="You don't have access to this guild's map")

    result_g = await db.execute(select(Guild).where(Guild.guild_id == guild_id))
    guild = result_g.scalar_one_or_none()
    if not guild:
        raise HTTPException(status_code=404, detail="Guild not found")

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Tracker)
        .where(Tracker.guild_id == guild_id)
        .where(Tracker.expires_at > now)
        .order_by(Tracker.expires_at)
    )
    trackers = result.scalars().all()
    return [_tracker_to_out(t) for t in trackers]


def _tracker_to_out(t: Tracker) -> TrackerOut:
    center = ZoneCenterOut(x=t.center_x, y=t.center_y) if t.center_x is not None else None
    return TrackerOut(
        id=t.id,
        guild_id=t.guild_id,
        zone_name=t.zone_name,
        zone_id=t.zone_id,
        center=center,
        type=t.type,
        objective=t.objective,
        reported_by_id=t.reported_by_id,
        reported_by_name=t.reported_by_name,
        source=t.source,
        created_at=t.created_at,
        expires_at=t.expires_at,
        tier=t.tier,
    )


# =============================================================================
# Route (Avalonian Roads) endpoints
# =============================================================================

def _waypoint_to_out(wp: RouteWaypoint) -> RouteWaypointOut:
    center = ZoneCenterOut(x=wp.center_x, y=wp.center_y) if wp.center_x is not None else None
    return RouteWaypointOut(
        id=wp.id,
        order=wp.order,
        zone_name=wp.zone_name,
        zone_id=wp.zone_id,
        center=center,
        expires_at=wp.expires_at,
    )


def _route_to_out(r: Route) -> RouteOut:
    return RouteOut(
        id=r.id,
        guild_id=r.guild_id,
        reported_by_name=r.reported_by_name,
        source=r.source,
        created_at=r.created_at,
        waypoints=[_waypoint_to_out(wp) for wp in r.waypoints],
    )


@app.post("/routes", response_model=RouteOut)
async def create_route(
    payload: RouteCreate,
    session: Dict[str, Any] = Depends(_require_session),
    db: AsyncSession = Depends(get_db),
):
    """Create an Avalonian Road route with ordered waypoints."""
    if payload.guild_id not in _user_guild_ids(session):
        raise HTTPException(status_code=403, detail="You don't have access to this guild")

    # Enforce active plan
    result_guild = await db.execute(select(Guild).where(Guild.guild_id == payload.guild_id))
    guild_obj = result_guild.scalar_one_or_none()
    if not guild_obj:
        raise HTTPException(status_code=404, detail="Guild not found")

    now = datetime.now(timezone.utc)
    route = Route(
        guild_id=payload.guild_id,
        reported_by_name=session.get("username", payload.reported_by_name),
        source=payload.source,
    )
    db.add(route)
    await db.flush()  # get route.id before adding waypoints

    for idx, wp_in in enumerate(payload.waypoints):
        zone_key = norm_zone(wp_in.zone_name)
        zone_id = ZONE_ALIASES.get(zone_key)
        if not zone_id:
            candidate = slugify_zone_id(wp_in.zone_name)
            if candidate in ZONES:
                zone_id = candidate
        zone = ZONES.get(zone_id) if zone_id else None
        center = zone.get("center") if zone else None

        # First waypoint: no timer (it's the entry point, already open)
        if idx == 0:
            expires_at = None
        else:
            expires_at = now + timedelta(hours=wp_in.hours, minutes=wp_in.minutes)

        wp = RouteWaypoint(
            route_id=route.id,
            order=idx,
            zone_name=wp_in.zone_name,
            zone_id=zone_id,
            center_x=center["x"] if center else None,
            center_y=center["y"] if center else None,
            expires_at=expires_at,
        )
        db.add(wp)

    await db.commit()
    await db.refresh(route)
    # Eagerly load waypoints
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Route).options(selectinload(Route.waypoints)).where(Route.id == route.id)
    )
    route = result.scalar_one()
    return _route_to_out(route)


@app.get("/routes", response_model=List[RouteOut])
async def list_routes(
    guild_id: str,
    session: Dict[str, Any] = Depends(_require_session),
    db: AsyncSession = Depends(get_db),
):
    """List all routes for a guild. Requires Discord session."""
    if not await _can_access_guild(guild_id, session, db):
        raise HTTPException(status_code=403, detail="You don't have access to this guild's map")

    result_g = await db.execute(select(Guild).where(Guild.guild_id == guild_id))
    guild = result_g.scalar_one_or_none()
    if not guild:
        raise HTTPException(status_code=404, detail="Guild not found")

    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Route)
        .options(selectinload(Route.waypoints))
        .where(Route.guild_id == guild_id)
        .order_by(Route.created_at.desc())
    )
    routes = result.scalars().all()

    # Filter out routes where any timed waypoint has already expired.
    # The route expires as soon as its earliest timer runs out.
    now = datetime.now(timezone.utc)
    active_routes = [
        r for r in routes
        if all(
            wp.expires_at is None or wp.expires_at > now
            for wp in r.waypoints
        )
    ]
    return [_route_to_out(r) for r in active_routes]


@app.delete("/routes/{route_id}")
async def delete_route(
    route_id: str,
    session: Dict[str, Any] = Depends(_require_session),
    db: AsyncSession = Depends(get_db),
):
    """Delete a route (and all its waypoints via cascade)."""
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    if route.guild_id not in _user_guild_ids(session):
        raise HTTPException(status_code=403, detail="Access denied")
    await db.delete(route)
    await db.commit()
    return {"ok": True}


# =============================================================================
# Avalon Portals
# =============================================================================

def _portal_to_out(portal: AvalonPortal, now: datetime) -> AvalonPortalOut:
    if portal.expires_at is None or portal.size == 0:
        time_left = 999999
    else:
        delta = (portal.expires_at - now).total_seconds()
        time_left = max(0, int(delta))
    return AvalonPortalOut(
        id=portal.id,
        conn1=portal.conn1,
        conn2=portal.conn2,
        size=portal.size,
        charges=portal.charges,
        expires_at=portal.expires_at,
        time_left=time_left,
        reported_by_name=portal.reported_by_name,
        created_at=portal.created_at,
    )


@app.post("/avalon-portals", response_model=AvalonPortalOut)
async def create_avalon_portal(
    payload: AvalonPortalCreate,
    session: Dict[str, Any] = Depends(_require_session),
    db: AsyncSession = Depends(get_db),
):
    """Create (or update) an Avalonian road portal connection."""
    if payload.guild_id not in _user_guild_ids(session):
        raise HTTPException(status_code=403, detail="You don't have access to this guild")

    result_guild = await db.execute(select(Guild).where(Guild.guild_id == payload.guild_id))
    if not result_guild.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Guild not found")

    # Always store conn1/conn2 sorted alphabetically (Portaler pattern)
    c1, c2 = sorted([payload.conn1.strip(), payload.conn2.strip()])
    now = datetime.now(timezone.utc)
    expires_at = None if payload.size == 0 else now + timedelta(hours=payload.hours, minutes=payload.minutes)

    # Upsert: update existing connection between same two zones for this guild
    result_existing = await db.execute(
        select(AvalonPortal).where(
            AvalonPortal.guild_id == payload.guild_id,
            AvalonPortal.conn1 == c1,
            AvalonPortal.conn2 == c2,
        )
    )
    portal = result_existing.scalar_one_or_none()

    if portal:
        portal.size = payload.size
        portal.charges = payload.charges
        portal.expires_at = expires_at
        portal.reported_by_name = session.get("username", payload.reported_by_name)
    else:
        portal = AvalonPortal(
            guild_id=payload.guild_id,
            conn1=c1,
            conn2=c2,
            size=payload.size,
            charges=payload.charges,
            expires_at=expires_at,
            reported_by_name=session.get("username", payload.reported_by_name),
        )
        db.add(portal)

    await db.commit()
    await db.refresh(portal)
    return _portal_to_out(portal, datetime.now(timezone.utc))


@app.get("/avalon-portals", response_model=List[AvalonPortalOut])
async def list_avalon_portals(
    guild_id: str,
    session: Dict[str, Any] = Depends(_require_session),
    db: AsyncSession = Depends(get_db),
):
    """List active Avalonian portal connections for a guild."""
    if not await _can_access_guild(guild_id, session, db):
        raise HTTPException(status_code=403, detail="You don't have access to this guild's map")

    result_g = await db.execute(select(Guild).where(Guild.guild_id == guild_id))
    if not result_g.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Guild not found")

    result = await db.execute(
        select(AvalonPortal)
        .where(AvalonPortal.guild_id == guild_id)
        .order_by(AvalonPortal.created_at.desc())
    )
    portals = result.scalars().all()

    now = datetime.now(timezone.utc)
    active = [
        p for p in portals
        if p.size == 0 or p.expires_at is None or p.expires_at > now
    ]
    return [_portal_to_out(p, now) for p in active]


@app.delete("/avalon-portals/{portal_id}")
async def delete_avalon_portal(
    portal_id: str,
    session: Dict[str, Any] = Depends(_require_session),
    db: AsyncSession = Depends(get_db),
):
    """Delete an Avalonian portal connection."""
    result = await db.execute(select(AvalonPortal).where(AvalonPortal.id == portal_id))
    portal = result.scalar_one_or_none()
    if not portal:
        raise HTTPException(status_code=404, detail="Portal not found")
    if portal.guild_id not in _user_guild_ids(session):
        raise HTTPException(status_code=403, detail="Access denied")
    await db.delete(portal)
    await db.commit()
    return {"ok": True}

@app.get("/auth/discord")
async def auth_discord(guild_id: Optional[str] = None):
    """Redirect user to Discord OAuth2. Pass guild_id as query param to remember context."""
    state = guild_id or ""
    params = (
        f"client_id={DISCORD_CLIENT_ID}"
        f"&redirect_uri={OAUTH_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=identify+guilds"
        f"&state={state}"
    )
    return RedirectResponse(f"{DISCORD_OAUTH_URL}/authorize?{params}")


@app.get("/auth/discord/callback")
async def auth_discord_callback(
    code: str,
    state: Optional[str] = None,
    response: Response = None,  # type: ignore[assignment]
    db: AsyncSession = Depends(get_db),
):
    """Exchange code for token, verify guild membership + role, set session cookie."""
    # 1. Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            f"{DISCORD_OAUTH_URL}/token",
            data={
                "client_id": DISCORD_CLIENT_ID,
                "client_secret": DISCORD_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": OAUTH_REDIRECT_URI,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token_res.raise_for_status()
        token_data = token_res.json()
        access_token = token_data["access_token"]

        # 2. Fetch user info
        user_res = await client.get(
            f"{DISCORD_API}/users/@me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_res.raise_for_status()
        user = user_res.json()

        # 3. Fetch user guilds
        guilds_res = await client.get(
            f"{DISCORD_API}/users/@me/guilds",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        guilds_res.raise_for_status()
        user_guilds: List[Dict[str, Any]] = guilds_res.json()

    # 4. Find ALL registered guilds the user has access to
    user_guild_ids = {g["id"] for g in user_guilds}
    result = await db.execute(select(Guild))
    registered_guilds: List[Guild] = result.scalars().all()

    all_matched: List[Guild] = [rg for rg in registered_guilds if rg.guild_id in user_guild_ids]

    # Prioritize the guild from state param (came from bot link or direct URL)
    if state and state in user_guild_ids:
        state_guild = next((rg for rg in all_matched if rg.guild_id == state), None)
        if state_guild:
            all_matched = [state_guild] + [rg for rg in all_matched if rg.guild_id != state]

    if not all_matched:
        return RedirectResponse(f"{SITE_URL}/login?error=no_guild")

    primary_guild = all_matched[0]

    # 5. Upsert guild members for each matched guild
    discord_user_id = user["id"]
    discord_username = user["username"]
    now_utc = datetime.now(timezone.utc)
    for rg in all_matched:
        member_result = await db.execute(
            select(GuildMember).where(
                GuildMember.guild_id == rg.guild_id,
                GuildMember.discord_user_id == discord_user_id,
            )
        )
        existing_member = member_result.scalar_one_or_none()
        if existing_member:
            existing_member.last_seen_at = now_utc
            existing_member.discord_username = discord_username
        else:
            db.add(GuildMember(
                guild_id=rg.guild_id,
                discord_user_id=discord_user_id,
                discord_username=discord_username,
                first_seen_at=now_utc,
                last_seen_at=now_utc,
            ))
    await db.commit()

    # 6. Create session
    # Build a map of guild_id -> discord guild data (contains icon hash)
    user_guilds_map: Dict[str, Dict[str, Any]] = {g["id"]: g for g in user_guilds}

    session_token = secrets.token_urlsafe(32)
    _SESSIONS[session_token] = {
        "id": user["id"],
        "user_id": user["id"],
        "username": user["username"],
        "avatar": user.get("avatar"),
        "guild_id": primary_guild.guild_id,
        "guild_name": primary_guild.guild_name,
        "guilds": [
            {
                "guild_id": rg.guild_id,
                "guild_name": rg.guild_name,
                "icon": user_guilds_map.get(rg.guild_id, {}).get("icon"),
            }
            for rg in all_matched
        ],
    }

    # Redirect to dashboard so user can pick which guild to open
    redirect_url = f"{SITE_URL}/dashboard"
    redirect = RedirectResponse(redirect_url)
    redirect.set_cookie("session", session_token, **_COOKIE_KWARGS)
    return redirect


@app.get("/auth/me")
async def auth_me(request: Request, db: AsyncSession = Depends(get_db)):
    """Return current user info. Returns 401 if not authenticated."""
    session = _get_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    discord_id = session.get("id") or session.get("user_id", "")
    admin_res = await db.execute(select(AdminUser).where(AdminUser.discord_id == discord_id))
    is_admin = admin_res.scalar_one_or_none() is not None
    return {**session, "is_admin": is_admin}


@app.get("/auth/guilds")
async def auth_guilds(request: Request, db: AsyncSession = Depends(get_db)):
    """Return list of guilds the authenticated user has access to, enriched with server region."""
    session = _get_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")

    guilds = session.get("guilds")
    if not guilds:
        gid = session.get("guild_id")
        gname = session.get("guild_name")
        guilds = [{"guild_id": gid, "guild_name": gname}] if gid else []

    # Enrich with server_region from DB
    guild_ids = [g["guild_id"] for g in guilds if g.get("guild_id")]
    db_result = await db.execute(select(Guild).where(Guild.guild_id.in_(guild_ids)))
    db_guilds = {g.guild_id: g for g in db_result.scalars().all()}

    enriched = []
    for g in guilds:
        gid = g.get("guild_id")
        db_g = db_guilds.get(gid)
        enriched.append({
            **g,
            "server_region": db_g.server_region if db_g else "WEST",
        })
    return enriched


@app.get("/auth/logout")
async def auth_logout_get(request: Request):
    token = request.cookies.get("session")
    if token:
        _SESSIONS.pop(token, None)
    resp = RedirectResponse(url=f"{SITE_URL}/login", status_code=302)
    resp.delete_cookie("session", samesite=_COOKIE_KWARGS["samesite"], secure=_COOKIE_KWARGS["secure"])
    return resp


@app.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session")
    if token:
        _SESSIONS.pop(token, None)
    response.delete_cookie("session", samesite=_COOKIE_KWARGS["samesite"], secure=_COOKIE_KWARGS["secure"])
    return {"ok": True}


# =============================================================================
# Admin endpoints
# =============================================================================

@app.get("/admin/stats", response_model=AdminStatsOut)
async def admin_stats(
    _admin: AdminUser = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    guilds_result = await db.execute(select(Guild))
    guilds = guilds_result.scalars().all()

    members_result = await db.execute(
        select(GuildMember).where(
            GuildMember.discord_user_id.not_in(select(AdminUser.discord_id).scalar_subquery())
        )
    )
    total_members = len(members_result.scalars().all())

    return AdminStatsOut(
        total_guilds=len(guilds),
        total_members=total_members,
    )


@app.get("/admin/guilds", response_model=List[AdminGuildOut])
async def admin_list_guilds(
    _admin: AdminUser = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import func
    guilds_result = await db.execute(select(Guild))
    guilds = guilds_result.scalars().all()

    out = []
    admin_ids_subq = select(AdminUser.discord_id).scalar_subquery()
    for g in guilds:
        member_count_res = await db.execute(
            select(func.count()).where(
                GuildMember.guild_id == g.guild_id,
                GuildMember.discord_user_id.not_in(admin_ids_subq),
            )
        )
        member_count = member_count_res.scalar() or 0

        tracker_count_res = await db.execute(
            select(func.count()).where(
                Tracker.guild_id == g.guild_id,
                Tracker.expires_at > datetime.now(timezone.utc),
            )
        )
        tracker_count = tracker_count_res.scalar() or 0

        out.append(AdminGuildOut(
            guild_id=g.guild_id,
            guild_name=g.guild_name,
            created_at=g.created_at,
            member_count=member_count,
            tracker_count=tracker_count,
            server_region=g.server_region,
        ))

    return out


@app.get("/admin/guilds/{guild_id}/settings", response_model=AdminGuildOut)
async def admin_get_guild(
    guild_id: str,
    _admin: AdminUser = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import func
    result = await db.execute(select(Guild).where(Guild.guild_id == guild_id))
    g = result.scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Guild not found")
    member_count_res = await db.execute(
        select(func.count()).where(
            GuildMember.guild_id == guild_id,
            GuildMember.discord_user_id.not_in(select(AdminUser.discord_id).scalar_subquery()),
        )
    )
    member_count = member_count_res.scalar() or 0
    tracker_count_res = await db.execute(
        select(func.count()).where(
            Tracker.guild_id == guild_id,
            Tracker.expires_at > datetime.now(timezone.utc),
        )
    )
    tracker_count = tracker_count_res.scalar() or 0
    return AdminGuildOut(
        guild_id=g.guild_id,
        guild_name=g.guild_name,
        created_at=g.created_at,
        member_count=member_count,
        tracker_count=tracker_count,
        server_region=g.server_region,
    )


@app.patch("/admin/guilds/{guild_id}/settings", response_model=GuildOut)
async def admin_set_guild_settings(
    guild_id: str,
    payload: GuildRegionPatch,
    _admin: AdminUser = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Guild).where(Guild.guild_id == guild_id))
    guild = result.scalar_one_or_none()
    if not guild:
        raise HTTPException(status_code=404, detail="Guild not found")
    guild.server_region = payload.server_region
    await db.commit()
    await db.refresh(guild)
    return guild


@app.get("/admin/guilds/{guild_id}/members", response_model=List[GuildMemberOut])
async def admin_guild_members(
    guild_id: str,
    _admin: AdminUser = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GuildMember).where(
            GuildMember.guild_id == guild_id,
            GuildMember.discord_user_id.not_in(select(AdminUser.discord_id).scalar_subquery()),
        ).order_by(GuildMember.last_seen_at.desc())
    )
    return result.scalars().all()


@app.get("/admin/users", response_model=List[AdminUserOut])
async def admin_list_users(
    _admin: AdminUser = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AdminUser).order_by(AdminUser.created_at))
    return result.scalars().all()


@app.post("/admin/users", response_model=AdminUserOut)
async def admin_add_user(
    payload: AdminUserCreate,
    _admin: AdminUser = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(AdminUser).where(AdminUser.discord_id == payload.discord_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Admin with this Discord ID already exists")
    new_admin = AdminUser(discord_id=payload.discord_id, username=payload.username)
    db.add(new_admin)
    await db.commit()
    await db.refresh(new_admin)
    return new_admin


@app.delete("/admin/users/{user_id}")
async def admin_delete_user(
    user_id: str,
    admin: AdminUser = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot remove yourself")
    result = await db.execute(select(AdminUser).where(AdminUser.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Admin not found")
    await db.delete(target)
    await db.commit()
    return {"ok": True}
