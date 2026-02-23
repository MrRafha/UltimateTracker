"""Add plan fields, activation_keys, guild_members, admin_users

Revision ID: 0002
Revises: 0001
Create Date: 2026-02-23
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── guilds: add plan columns ──────────────────────────────────────────────
    op.add_column("guilds", sa.Column("plan", sa.String(), nullable=True))
    op.add_column("guilds", sa.Column("plan_status", sa.String(), nullable=True))
    op.add_column("guilds", sa.Column("plan_expires_at", sa.DateTime(timezone=True), nullable=True))

    # ── activation_keys ───────────────────────────────────────────────────────
    op.create_table(
        "activation_keys",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("key", sa.String(), nullable=False, unique=True),
        sa.Column("plan", sa.String(), nullable=False),
        sa.Column("duration_days", sa.Integer(), nullable=False),
        sa.Column("is_trial", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_used", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("used_by_guild_id", sa.String(), sa.ForeignKey("guilds.guild_id", ondelete="SET NULL"), nullable=True),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("note", sa.String(), nullable=True),
    )

    # ── guild_members ─────────────────────────────────────────────────────────
    op.create_table(
        "guild_members",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("guild_id", sa.String(), sa.ForeignKey("guilds.guild_id", ondelete="CASCADE"), nullable=False),
        sa.Column("discord_user_id", sa.String(), nullable=False),
        sa.Column("discord_username", sa.String(), nullable=False),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("guild_id", "discord_user_id", name="uq_guild_member"),
    )
    op.create_index("ix_guild_members_guild_id", "guild_members", ["guild_id"])

    # ── admin_users ───────────────────────────────────────────────────────────
    op.create_table(
        "admin_users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("discord_id", sa.String(), nullable=False, unique=True),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("admin_users")
    op.drop_index("ix_guild_members_guild_id", table_name="guild_members")
    op.drop_table("guild_members")
    op.drop_table("activation_keys")
    op.drop_column("guilds", "plan_expires_at")
    op.drop_column("guilds", "plan_status")
    op.drop_column("guilds", "plan")
