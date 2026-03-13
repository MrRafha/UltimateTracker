from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, field_validator

from constants import TrackerType, TrackerSource, OBJECTIVES_BY_TYPE


# ── Guild ─────────────────────────────────────────────────────
class GuildRegisterIn(BaseModel):
    guild_id: str
    guild_name: str


class GuildOut(BaseModel):
    guild_id: str
    guild_name: str
    allowed_role_id: Optional[str]
    api_key: str
    created_at: datetime
    server_region: str = "WEST"

    class Config:
        from_attributes = True


class GuildRolePatch(BaseModel):
    allowed_role_id: str


class GuildRegionPatch(BaseModel):
    server_region: str

    @field_validator("server_region")
    @classmethod
    def validate_region(cls, v: str) -> str:
        if v not in ("WEST", "EAST", "ASIA"):
            raise ValueError("server_region must be WEST, EAST, or ASIA")
        return v


# ── Tracker ───────────────────────────────────────────────────
class TrackerCreate(BaseModel):
    guild_id: str
    zone_name: str
    type: TrackerType
    objective: str
    hours: int = 0
    minutes: int = 0
    reported_by_id: str
    reported_by_name: str
    source: TrackerSource
    tier: Optional[str] = None                         # T4.4 – T8.4 (nodes only)

    @field_validator("objective")
    @classmethod
    def validate_objective(cls, v: str, info) -> str:
        tracker_type = info.data.get("type")
        if tracker_type and v not in OBJECTIVES_BY_TYPE.get(tracker_type, []):
            allowed = OBJECTIVES_BY_TYPE.get(tracker_type, [])
            raise ValueError(f"Objective '{v}' is not valid for type '{tracker_type}'. Allowed: {allowed}")
        return v

    @field_validator("hours", "minutes")
    @classmethod
    def validate_time(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Time values must be >= 0")
        return v


class ZoneCenterOut(BaseModel):
    x: float
    y: float


class TrackerOut(BaseModel):
    id: str
    guild_id: str
    zone_name: str
    zone_id: Optional[str]
    center: Optional[ZoneCenterOut]
    type: TrackerType
    objective: str
    reported_by_id: str
    reported_by_name: str
    source: TrackerSource
    created_at: datetime
    expires_at: datetime
    tier: Optional[str] = None                         # T4.4 – T8.4 (nodes only)

    class Config:
        from_attributes = True


# ── Routes ────────────────────────────────────────────────────

class RouteWaypointIn(BaseModel):
    zone_name: str
    hours: int = 0
    minutes: int = 0

    @field_validator("hours", "minutes")
    @classmethod
    def validate_time(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Time values must be >= 0")
        return v


class RouteCreate(BaseModel):
    guild_id: str
    waypoints: list[RouteWaypointIn]
    reported_by_name: str
    source: TrackerSource

    @field_validator("waypoints")
    @classmethod
    def validate_waypoints(cls, v: list) -> list:
        if len(v) < 2:
            raise ValueError("A route must have at least 2 waypoints")
        return v


class RouteWaypointOut(BaseModel):
    id: str
    order: int
    zone_name: str
    zone_id: Optional[str]
    center: Optional[ZoneCenterOut]
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class RouteOut(BaseModel):
    id: str
    guild_id: str
    reported_by_name: str
    source: TrackerSource
    created_at: datetime
    waypoints: list[RouteWaypointOut]

    class Config:
        from_attributes = True


# ── Guild Members ─────────────────────────────────────────────

class GuildMemberOut(BaseModel):
    id: str
    guild_id: str
    discord_user_id: str
    discord_username: str
    first_seen_at: datetime
    last_seen_at: datetime

    class Config:
        from_attributes = True


# ── Admin Users ───────────────────────────────────────────────

class AdminUserCreate(BaseModel):
    discord_id: str
    username: str


class AdminUserOut(BaseModel):
    id: str
    discord_id: str
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Admin Guild overview ──────────────────────────────────────

class AdminGuildOut(BaseModel):
    guild_id: str
    guild_name: str
    created_at: datetime
    member_count: int = 0
    tracker_count: int = 0
    server_region: str = "WEST"

    class Config:
        from_attributes = True


# ── Avalon Portals ────────────────────────────────────────────

class AvalonPortalCreate(BaseModel):
    guild_id: str
    conn1: str
    conn2: str
    size: int   # 0, 7, 20
    hours: int = 0
    minutes: int = 0
    charges: Optional[int] = None
    reported_by_name: str

    @field_validator("size")
    @classmethod
    def validate_size(cls, v: int) -> int:
        if v not in (0, 2, 7, 20):
            raise ValueError("size must be 0 (Royal), 7, or 20")
        return v

    @field_validator("hours", "minutes")
    @classmethod
    def validate_time(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Time values must be >= 0")
        return v


class AvalonPortalOut(BaseModel):
    id: str
    conn1: str
    conn2: str
    size: int
    charges: Optional[int] = None
    expires_at: Optional[datetime]
    time_left: int          # seconds remaining; 999999 for Royal
    reported_by_name: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Admin Stats ───────────────────────────────────────────────

class AdminStatsOut(BaseModel):
    total_guilds: int
    total_members: int
