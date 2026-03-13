"""Add avalon_portals table

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-12
"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "avalon_portals",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column(
            "guild_id",
            sa.String(),
            sa.ForeignKey("guilds.guild_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("conn1", sa.String(150), nullable=False),
        sa.Column("conn2", sa.String(150), nullable=False),
        sa.Column("size", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reported_by_name", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("avalon_portals")
