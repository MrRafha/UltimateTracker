from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum, Boolean, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base
from constants import TrackerType, TrackerSource, PortalSize


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class Guild(Base):
    __tablename__ = "guilds"

    guild_id: Mapped[str] = mapped_column(String, primary_key=True)
    guild_name: Mapped[str] = mapped_column(String, nullable=False)
    allowed_role_id: Mapped[str | None] = mapped_column(String, nullable=True)
    api_key: Mapped[str] = mapped_column(String, unique=True, default=_uuid)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    # Plan fields
    plan: Mapped[str | None] = mapped_column(String, nullable=True)           # basic / plus / premium
    plan_status: Mapped[str | None] = mapped_column(String, nullable=True)    # active / trial / expired
    plan_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Server region: WEST / EAST / ASIA
    server_region: Mapped[str] = mapped_column(String, nullable=False, default="WEST")

    trackers: Mapped[list["Tracker"]] = relationship(back_populates="guild", cascade="all, delete-orphan")
    routes: Mapped[list["Route"]] = relationship(back_populates="guild", cascade="all, delete-orphan")
    avalon_portals: Mapped[list["AvalonPortal"]] = relationship(back_populates="guild", cascade="all, delete-orphan")
    members: Mapped[list["GuildMember"]] = relationship(back_populates="guild", cascade="all, delete-orphan")


class Tracker(Base):
    __tablename__ = "trackers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    guild_id: Mapped[str] = mapped_column(String, ForeignKey("guilds.guild_id", ondelete="CASCADE"), nullable=False)
    zone_name: Mapped[str] = mapped_column(String, nullable=False)
    zone_id: Mapped[str | None] = mapped_column(String, nullable=True)
    center_x: Mapped[float | None] = mapped_column(nullable=True)
    center_y: Mapped[float | None] = mapped_column(nullable=True)
    type: Mapped[TrackerType] = mapped_column(SAEnum(TrackerType), nullable=False)
    objective: Mapped[str] = mapped_column(String, nullable=False)
    reported_by_id: Mapped[str] = mapped_column(String, nullable=False)
    reported_by_name: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[TrackerSource] = mapped_column(SAEnum(TrackerSource), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    tier: Mapped[str | None] = mapped_column(String, nullable=True)          # T4.4 – T8.4 (nodes only)

    guild: Mapped["Guild"] = relationship(back_populates="trackers")


class Route(Base):
    __tablename__ = "routes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    guild_id: Mapped[str] = mapped_column(String, ForeignKey("guilds.guild_id", ondelete="CASCADE"), nullable=False)
    reported_by_name: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[TrackerSource] = mapped_column(SAEnum(TrackerSource), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    guild: Mapped["Guild"] = relationship(back_populates="routes")
    waypoints: Mapped[list["RouteWaypoint"]] = relationship(
        back_populates="route",
        cascade="all, delete-orphan",
        order_by="RouteWaypoint.order",
    )


class RouteWaypoint(Base):
    __tablename__ = "route_waypoints"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    route_id: Mapped[str] = mapped_column(String, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    order: Mapped[int] = mapped_column(nullable=False)
    zone_name: Mapped[str] = mapped_column(String, nullable=False)
    zone_id: Mapped[str | None] = mapped_column(String, nullable=True)
    center_x: Mapped[float | None] = mapped_column(nullable=True)
    center_y: Mapped[float | None] = mapped_column(nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    route: Mapped["Route"] = relationship(back_populates="waypoints")


class AvalonPortal(Base):
    __tablename__ = "avalon_portals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    guild_id: Mapped[str] = mapped_column(String, ForeignKey("guilds.guild_id", ondelete="CASCADE"), nullable=False)
    # conn1/conn2 are always stored in alphabetical order (Portaler pattern)
    conn1: Mapped[str] = mapped_column(String(150), nullable=False)
    conn2: Mapped[str] = mapped_column(String(150), nullable=False)
    size: Mapped[int] = mapped_column(nullable=False)   # 0=Royal, 7, 20
    charges: Mapped[int | None] = mapped_column(Integer, nullable=True)  # charges remaining (None = unknown)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)  # None = Royal (permanent)
    reported_by_name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    guild: Mapped["Guild"] = relationship(back_populates="avalon_portals")


# =============================================================================
# Activation Keys
# =============================================================================

class ActivationKey(Base):
    __tablename__ = "activation_keys"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    key: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    plan: Mapped[str] = mapped_column(String, nullable=False)          # basic / plus / premium
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)
    is_trial: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    used_by_guild_id: Mapped[str | None] = mapped_column(String, ForeignKey("guilds.guild_id", ondelete="SET NULL"), nullable=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    note: Mapped[str | None] = mapped_column(String, nullable=True)


# =============================================================================
# Guild Members
# =============================================================================

class GuildMember(Base):
    __tablename__ = "guild_members"
    __table_args__ = (UniqueConstraint("guild_id", "discord_user_id", name="uq_guild_member"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    guild_id: Mapped[str] = mapped_column(String, ForeignKey("guilds.guild_id", ondelete="CASCADE"), nullable=False)
    discord_user_id: Mapped[str] = mapped_column(String, nullable=False)
    discord_username: Mapped[str] = mapped_column(String, nullable=False)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    guild: Mapped["Guild"] = relationship(back_populates="members")


# =============================================================================
# Admin Users
# =============================================================================

class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    discord_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
