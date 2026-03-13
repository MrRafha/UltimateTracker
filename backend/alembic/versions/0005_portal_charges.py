"""0005 – add charges column to avalon_portals"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "avalon_portals",
        sa.Column("charges", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("avalon_portals", "charges")
