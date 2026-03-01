from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

import httpx

import config
from game_data import OBJECTIVES_BY_TYPE, OBJECTIVE_EMOJI, TYPE_EMOJI
from i18n import t

# ── Zone autocomplete ─────────────────────────────────────────
_zone_cache: list[str] = []


async def _load_zones() -> list[str]:
    global _zone_cache
    if _zone_cache:
        return _zone_cache
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{config.API_BASE_URL}/zones")
            r.raise_for_status()
            zones = r.json()
            _zone_cache = sorted(z["displayName"] for z in zones)
    except Exception:
        pass
    return _zone_cache


async def zone_autocomplete(
    interaction: discord.Interaction,
    current: str,
) -> list[app_commands.Choice[str]]:
    zones = await _load_zones()
    filtered = [z for z in zones if current.lower() in z.lower()][:25]
    return [app_commands.Choice(name=z, value=z) for z in filtered]


# ── Step 1: Select type ───────────────────────────────────────
class TypeView(discord.ui.View):
    def __init__(self, zone: str, hours: int, minutes: int, guild_id: str):
        super().__init__(timeout=120)
        self.zone     = zone
        self.hours    = hours
        self.minutes  = minutes
        self.guild_id = guild_id
        self.add_item(TypeSelect(zone, hours, minutes, guild_id))


class TypeSelect(discord.ui.Select):
    def __init__(self, zone: str, hours: int, minutes: int, guild_id: str):
        self.zone     = zone
        self.hours    = hours
        self.minutes  = minutes
        self.guild_id = guild_id

        options = [
            discord.SelectOption(label="Node",   value="node",   emoji="🌿"),
            discord.SelectOption(label="Orb",    value="orb",    emoji="🔮"),
            discord.SelectOption(label="Vortex", value="vortex", emoji="🌀"),
        ]
        super().__init__(
            placeholder=t(guild_id, "scout.type_placeholder"),
            options=options,
            min_values=1,
            max_values=1,
        )

    async def callback(self, interaction: discord.Interaction):
        selected_type = self.values[0]
        await interaction.response.send_message(
            embed=discord.Embed(
                title=f"{TYPE_EMOJI[selected_type]} {t(self.guild_id, 'scout.type_selected', type=selected_type.title())}",
                description=t(self.guild_id, "scout.select_objective"),
                color=0x5865F2,
            ),
            view=ObjectiveView(self.zone, self.hours, self.minutes, selected_type, self.guild_id),
            ephemeral=True,
        )


# ── Step 2: Select objective ──────────────────────────────────
class ObjectiveView(discord.ui.View):
    def __init__(self, zone: str, hours: int, minutes: int, tracker_type: str, guild_id: str):
        super().__init__(timeout=120)
        self.add_item(ObjectiveSelect(zone, hours, minutes, tracker_type, guild_id))


class ObjectiveSelect(discord.ui.Select):
    def __init__(self, zone: str, hours: int, minutes: int, tracker_type: str, guild_id: str):
        self.zone         = zone
        self.hours        = hours
        self.minutes      = minutes
        self.tracker_type = tracker_type
        self.guild_id     = guild_id

        objectives = OBJECTIVES_BY_TYPE[tracker_type]
        options = [
            discord.SelectOption(
                label=obj.capitalize(),
                value=obj,
                emoji=OBJECTIVE_EMOJI.get(obj),
            )
            for obj in objectives
        ]
        super().__init__(
            placeholder=t(guild_id, "scout.objective_placeholder"),
            options=options,
            min_values=1,
            max_values=1,
        )

    async def callback(self, interaction: discord.Interaction):
        objective = self.values[0]

        # For nodes, ask the tier before posting
        if self.tracker_type == "node":
            await interaction.response.send_message(
                embed=discord.Embed(
                    title=f"🌿 {t(self.guild_id, 'scout.objective_title')}",
                    description=t(self.guild_id, "scout.select_tier"),
                    color=0x5865F2,
                ),
                view=TierView(self.zone, self.hours, self.minutes, self.tracker_type, objective, self.guild_id),
                ephemeral=True,
            )
            return

        # Defer immediately — Discord requires a response within 3 seconds.
        # The HTTP call below can exceed that limit, causing error 10062 otherwise.
        await interaction.response.defer(ephemeral=True)

        payload = {
            "guild_id":         str(interaction.guild_id),
            "zone_name":        self.zone,
            "type":             self.tracker_type,
            "objective":        objective,
            "hours":            self.hours,
            "minutes":          self.minutes,
            "reported_by_id":   str(interaction.user.id),
            "reported_by_name": str(interaction.user.display_name),
            "source":           "discord",
        }

        await _post_tracker(interaction, payload, objective, self.zone, self.hours, self.minutes, guild_id=self.guild_id)


# ── Step 3 (nodes only): Select tier ─────────────────────────
NODE_TIERS = ["T4.4", "T5.4", "T6.4", "T7.4", "T8.4"]

class TierView(discord.ui.View):
    def __init__(self, zone: str, hours: int, minutes: int, tracker_type: str, objective: str, guild_id: str):
        super().__init__(timeout=120)
        self.add_item(TierSelect(zone, hours, minutes, tracker_type, objective, guild_id))


class TierSelect(discord.ui.Select):
    def __init__(self, zone: str, hours: int, minutes: int, tracker_type: str, objective: str, guild_id: str):
        self.zone         = zone
        self.hours        = hours
        self.minutes      = minutes
        self.tracker_type = tracker_type
        self.objective    = objective
        self.guild_id     = guild_id

        options = [
            discord.SelectOption(label=tier, value=tier)
            for tier in NODE_TIERS
        ]
        super().__init__(
            placeholder=t(guild_id, "scout.tier_placeholder"),
            options=options,
            min_values=1,
            max_values=1,
        )

    async def callback(self, interaction: discord.Interaction):
        tier = self.values[0]
        await interaction.response.defer(ephemeral=True)

        payload = {
            "guild_id":         str(interaction.guild_id),
            "zone_name":        self.zone,
            "type":             self.tracker_type,
            "objective":        self.objective,
            "hours":            self.hours,
            "minutes":          self.minutes,
            "reported_by_id":   str(interaction.user.id),
            "reported_by_name": str(interaction.user.display_name),
            "source":           "discord",
            "tier":             tier,
        }

        await _post_tracker(interaction, payload, self.objective, self.zone, self.hours, self.minutes, tier=tier, guild_id=self.guild_id)


# ── Shared POST helper ────────────────────────────────────────

async def _post_tracker(
    interaction: discord.Interaction,
    payload: dict,
    objective: str,
    zone: str,
    hours: int,
    minutes: int,
    tier: str | None = None,
    guild_id: str | None = None,
) -> None:
    gid = guild_id or str(interaction.guild_id)
    api_key = config.get_api_key(interaction.guild_id)
    if not api_key:
        await interaction.followup.send(t(gid, "scout.not_registered"), ephemeral=True)
        return

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"{config.API_BASE_URL}/trackers",
                json=payload,
                headers={"X-Api-Key": api_key},
            )
            r.raise_for_status()
    except httpx.HTTPStatusError as e:
        await interaction.followup.send(
            t(gid, "scout.error_register", status=str(e.response.status_code), text=e.response.text),
            ephemeral=True,
        )
        return
    except Exception as e:
        await interaction.followup.send(t(gid, "scout.error_unexpected", error=str(e)), ephemeral=True)
        return

    tracker_type = payload.get("type", "")
    embed = discord.Embed(
        title=t(gid, "scout.registered_title"),
        color=0x57F287,
    )
    embed.add_field(name=t(gid, "scout.field_map"),       value=zone,                                                        inline=True)
    embed.add_field(name=t(gid, "scout.field_type"),      value=tracker_type.title(),                                        inline=True)
    embed.add_field(name=t(gid, "scout.field_objective"), value=f"{OBJECTIVE_EMOJI.get(objective, '')} {objective.capitalize()}", inline=True)
    if tier:
        embed.add_field(name=t(gid, "scout.field_tier"), value=tier, inline=True)
    time_str = f"{hours}h {minutes}m" if hours else f"{minutes}m"
    embed.add_field(name=t(gid, "scout.field_time"), value=time_str, inline=True)
    embed.set_footer(text=t(gid, "scout.footer_reported_by", name=interaction.user.display_name))

    await interaction.edit_original_response(embed=embed, view=None)


# ── Modal factory (zone + time entry) — dynamic title for i18n ────────────────
def make_scout_modal(guild_id: str) -> discord.ui.Modal:
    """Create a ScoutModal with title and labels translated for the guild's language."""
    _gid = guild_id

    class _ScoutModal(discord.ui.Modal, title=t(_gid, "scout.modal_title")):
        mapa = discord.ui.TextInput(
            label=t(_gid, "scout.modal_map_label"),
            placeholder=t(_gid, "scout.modal_map_placeholder"),
            min_length=2,
            max_length=100,
        )
        tempo = discord.ui.TextInput(
            label=t(_gid, "scout.modal_time_label"),
            placeholder=t(_gid, "scout.modal_time_placeholder"),
            min_length=4,
            max_length=5,
        )

        async def on_submit(self, interaction: discord.Interaction):
            raw = self.tempo.value.strip()
            try:
                parts = raw.split(":")
                if len(parts) != 2:
                    raise ValueError
                hours   = int(parts[0])
                minutes = int(parts[1])
                if not (0 <= hours <= 23 and 0 <= minutes <= 59):
                    raise ValueError
            except ValueError:
                await interaction.response.send_message(
                    t(_gid, "scout.time_invalid"), ephemeral=True
                )
                return

            zone = self.mapa.value.strip()
            await interaction.response.send_message(
                embed=discord.Embed(
                    title=f"🗺️ {zone}  |  ⏱ {hours:02d}:{minutes:02d}",
                    description=t(_gid, "scout.select_type_title"),
                    color=0x5865F2,
                ),
                view=TypeView(zone, hours, minutes, _gid),
                ephemeral=True,
            )

    return _ScoutModal()


# ── Cog ───────────────────────────────────────────────────────
class Scout(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="scout", description="Report an objective on the guild map.")
    async def scout(self, interaction: discord.Interaction):
        """Opens the scout modal for the user to fill in zone and time."""
        guild_id = str(interaction.guild_id)
        api_key = config.get_api_key(guild_id)
        if not api_key:
            await interaction.response.send_message(
                t(guild_id, "scout.not_registered"), ephemeral=True
            )
            return

        await interaction.response.send_modal(make_scout_modal(guild_id))


async def setup(bot: commands.Bot):
    await bot.add_cog(Scout(bot))
