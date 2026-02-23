"""Initial tables: guilds and trackers

Revision ID: 0001
Revises: 
Create Date: 2026-02-22
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "guilds",
        sa.Column("guild_id",        sa.String(),  primary_key=True),
        sa.Column("guild_name",      sa.String(),  nullable=False),
        sa.Column("allowed_role_id", sa.String(),  nullable=True),
        sa.Column("api_key",         sa.String(),  unique=True, nullable=False),
        sa.Column("created_at",      sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "trackers",
        sa.Column("id",               sa.String(), primary_key=True),
        sa.Column("guild_id",         sa.String(), sa.ForeignKey("guilds.guild_id", ondelete="CASCADE"), nullable=False),
        sa.Column("zone_name",        sa.String(), nullable=False),
        sa.Column("zone_id",          sa.String(), nullable=True),
        sa.Column("center_x",         sa.Float(),  nullable=True),
        sa.Column("center_y",         sa.Float(),  nullable=True),
        sa.Column("type",             sa.Enum("node", "orb", "vortex",             name="trackertype"),   nullable=False),
        sa.Column("objective",        sa.String(), nullable=False),
        sa.Column("reported_by_id",   sa.String(), nullable=False),
        sa.Column("reported_by_name", sa.String(), nullable=False),
        sa.Column("source",           sa.Enum("discord", "web",                    name="trackersource"), nullable=False),
        sa.Column("created_at",       sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at",       sa.DateTime(timezone=True), nullable=False),
    )

    op.create_index("ix_trackers_guild_expires", "trackers", ["guild_id", "expires_at"])


def downgrade() -> None:
    op.drop_index("ix_trackers_guild_expires", table_name="trackers")
    op.drop_table("trackers")
    op.drop_table("guilds")
    op.execute("DROP TYPE IF EXISTS trackertype")
    op.execute("DROP TYPE IF EXISTS trackersource")
