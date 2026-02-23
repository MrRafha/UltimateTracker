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

    class Config:
        from_attributes = True


class GuildRolePatch(BaseModel):
    allowed_role_id: str


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


# ── Activation Keys ───────────────────────────────────────────

class ActivationKeyCreate(BaseModel):
    plan: str                      # basic / plus / premium
    duration_days: int
    is_trial: bool = False
    note: Optional[str] = None

    @field_validator("plan")
    @classmethod
    def validate_plan(cls, v: str) -> str:
        if v not in ("basic", "plus", "premium"):
            raise ValueError("plan must be basic, plus, or premium")
        return v

    @field_validator("duration_days")
    @classmethod
    def validate_days(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("duration_days must be > 0")
        return v


class ActivationKeyOut(BaseModel):
    id: str
    key: str
    plan: str
    duration_days: int
    is_trial: bool
    is_used: bool
    used_by_guild_id: Optional[str]
    used_at: Optional[datetime]
    created_at: datetime
    note: Optional[str]

    class Config:
        from_attributes = True


class ActivateKeyIn(BaseModel):
    key: str


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


# ── Guild Plan ────────────────────────────────────────────────

class GuildPlanOut(BaseModel):
    guild_id: str
    guild_name: str
    plan: Optional[str]
    plan_status: Optional[str]
    plan_expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class PlanPatch(BaseModel):
    plan: Optional[str] = None
    plan_status: Optional[str] = None
    plan_expires_at: Optional[datetime] = None

    @field_validator("plan")
    @classmethod
    def validate_plan(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("basic", "plus", "premium"):
            raise ValueError("plan must be basic, plus, or premium")
        return v

    @field_validator("plan_status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("active", "trial", "expired"):
            raise ValueError("plan_status must be active, trial, or expired")
        return v


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
    plan: Optional[str]
    plan_status: Optional[str]
    plan_expires_at: Optional[datetime]
    created_at: datetime
    member_count: int = 0
    tracker_count: int = 0

    class Config:
        from_attributes = True


# ── Admin Stats ───────────────────────────────────────────────

class AdminStatsOut(BaseModel):
    total_guilds: int
    active_guilds: int
    trial_guilds: int
    expired_guilds: int
    no_plan_guilds: int
    total_members: int
    keys_total: int
    keys_used: int
    keys_available: int
