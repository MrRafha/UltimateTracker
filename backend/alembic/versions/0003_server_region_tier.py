"""Add server_region to guilds and tier to trackers

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-01
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # guilds: server region (default WEST)
    op.add_column(
        "guilds",
        sa.Column("server_region", sa.String(), nullable=True, server_default="WEST"),
    )
    # trackers: optional node tier (T4.4 – T8.4)
    op.add_column(
        "trackers",
        sa.Column("tier", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("guilds", "server_region")
    op.drop_column("trackers", "tier")
