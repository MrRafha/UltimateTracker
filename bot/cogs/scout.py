from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

import httpx

import config
from game_data import OBJECTIVES_BY_TYPE, OBJECTIVE_EMOJI, TYPE_EMOJI

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
    def __init__(self, zone: str, hours: int, minutes: int):
        super().__init__(timeout=120)
        self.zone    = zone
        self.hours   = hours
        self.minutes = minutes
        self.add_item(TypeSelect(zone, hours, minutes))


class TypeSelect(discord.ui.Select):
    def __init__(self, zone: str, hours: int, minutes: int):
        self.zone    = zone
        self.hours   = hours
        self.minutes = minutes

        options = [
            discord.SelectOption(label="Node",   value="node",   emoji="🌿"),
            discord.SelectOption(label="Orb",    value="orb",    emoji="🔮"),
            discord.SelectOption(label="Vortex", value="vortex", emoji="🌀"),
        ]
        super().__init__(placeholder="Selecione o tipo de objetivo…", options=options, min_values=1, max_values=1)

    async def callback(self, interaction: discord.Interaction):
        selected_type = self.values[0]
        await interaction.response.send_message(
            embed=discord.Embed(
                title=f"{TYPE_EMOJI[selected_type]} Tipo selecionado: {selected_type.title()}",
                description="Agora selecione o objetivo:",
                color=0x5865F2,
            ),
            view=ObjectiveView(self.zone, self.hours, self.minutes, selected_type),
            ephemeral=True,
        )


# ── Step 2: Select objective ──────────────────────────────────
class ObjectiveView(discord.ui.View):
    def __init__(self, zone: str, hours: int, minutes: int, tracker_type: str):
        super().__init__(timeout=120)
        self.add_item(ObjectiveSelect(zone, hours, minutes, tracker_type))


class ObjectiveSelect(discord.ui.Select):
    def __init__(self, zone: str, hours: int, minutes: int, tracker_type: str):
        self.zone         = zone
        self.hours        = hours
        self.minutes      = minutes
        self.tracker_type = tracker_type

        objectives = OBJECTIVES_BY_TYPE[tracker_type]
        options = [
            discord.SelectOption(
                label=obj.capitalize(),
                value=obj,
                emoji=OBJECTIVE_EMOJI.get(obj),
            )
            for obj in objectives
        ]
        super().__init__(placeholder="Selecione o objetivo…", options=options, min_values=1, max_values=1)

    async def callback(self, interaction: discord.Interaction):
        objective = self.values[0]

        # Defer immediately — Discord requires a response within 3 seconds.
        # The HTTP call below can exceed that limit, causing error 10062 otherwise.
        await interaction.response.defer(ephemeral=True)

        api_key = config.get_api_key(interaction.guild_id)
        if not api_key:
            await interaction.followup.send(
                "❌ Esta guilda não está registrada. Use `/setup` primeiro.", ephemeral=True
            )
            return

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

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(
                    f"{config.API_BASE_URL}/trackers",
                    json=payload,
                    headers={"X-Api-Key": api_key},
                )
                r.raise_for_status()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 402:
                embed = discord.Embed(
                    title="🔒 Plano Inativo",
                    description="Esta guilda não possui um plano ativo ou o plano expirou.",
                    color=0xEF4444,
                )
                embed.add_field(
                    name="Ativar Plano",
                    value=f"[Acessar Dashboard]({config.SITE_URL}/dashboard)",
                    inline=False,
                )
                await interaction.followup.send(embed=embed, ephemeral=True)
            else:
                await interaction.followup.send(
                    f"❌ Erro ao registrar: `{e.response.status_code}` — {e.response.text}", ephemeral=True
                )
            return
        except Exception as e:
            await interaction.followup.send(f"❌ Erro inesperado: {e}", ephemeral=True)
            return

        embed = discord.Embed(
            title="✅ Tracker registrado!",
            color=0x57F287,
        )
        embed.add_field(name="Mapa",     value=self.zone,              inline=True)
        embed.add_field(name="Tipo",     value=self.tracker_type.title(), inline=True)
        embed.add_field(name="Objetivo", value=f"{OBJECTIVE_EMOJI.get(objective, '')} {objective.capitalize()}", inline=True)
        time_str = f"{self.hours}h {self.minutes}m" if self.hours else f"{self.minutes}m"
        embed.add_field(name="Tempo restante", value=time_str, inline=True)
        embed.set_footer(text=f"Reportado por {interaction.user.display_name}")

        await interaction.edit_original_response(embed=embed, view=None)


# ── Modal (zone + time entry) ──────────────────────────────────
class ScoutModal(discord.ui.Modal, title="🗺️ Scout — Registrar Objetivo"):
    mapa = discord.ui.TextInput(
        label="Mapa",
        placeholder="Ex: Watchwood Bluffs",
        min_length=2,
        max_length=100,
    )
    tempo = discord.ui.TextInput(
        label="Tempo restante (HH:MM)",
        placeholder="Ex: 01:30  ou  00:45",
        min_length=4,
        max_length=5,
    )

    async def on_submit(self, interaction: discord.Interaction):
        # Parse tempo
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
                "❌ Formato de tempo inválido. Use `HH:MM` (ex: `01:30`).", ephemeral=True
            )
            return

        zone = self.mapa.value.strip()
        await interaction.response.send_message(
            embed=discord.Embed(
                title=f"🗺️ {zone}  |  ⏱ {hours:02d}:{minutes:02d}",
                description="Selecione o **tipo** de objetivo:",
                color=0x5865F2,
            ),
            view=TypeView(zone, hours, minutes),
            ephemeral=True,
        )


# ── Cog ───────────────────────────────────────────────────────
class Scout(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="scout", description="Registra um objective no mapa da guilda.")
    async def scout(self, interaction: discord.Interaction):
        """Opens the scout modal for the user to fill in zone and time."""
        guild_id = str(interaction.guild_id)
        api_key = config.get_api_key(guild_id)
        if not api_key:
            await interaction.response.send_message(
                "❌ Esta guilda não está registrada. Use `/setup` primeiro.", ephemeral=True
            )
            return

        # Pre-check plan before showing the modal to avoid wasting user's time
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(
                    f"{config.API_BASE_URL}/guilds/{guild_id}/bot-plan-status",
                    headers={"X-Api-Key": api_key},
                )
                data = r.json() if r.status_code == 200 else {}
        except Exception:
            data = {}

        if not data.get("active"):
            status_label = "Expirado" if data.get("plan_status") == "expired" else "Inativo"
            embed = discord.Embed(
                title="🔒 Plano Inativo",
                description=f"Esta guilda não possui um plano ativo (status: **{status_label}**).",
                color=0xEF4444,
            )
            embed.add_field(
                name="Ativar Plano",
                value=f"[Acessar Dashboard]({config.SITE_URL}/dashboard)",
                inline=False,
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
            return

        await interaction.response.send_modal(ScoutModal())


async def setup(bot: commands.Bot):
    await bot.add_cog(Scout(bot))
