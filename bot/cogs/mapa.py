from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands
import httpx

import config


async def _get_plan_status(guild_id: str, api_key: str) -> dict | None:
    """Returns plan info from the backend, or None on failure."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(
                f"{config.API_BASE_URL}/guilds/{guild_id}/bot-plan-status",
                headers={"X-Api-Key": api_key},
            )
            if r.status_code == 200:
                return r.json()
    except Exception:
        pass
    return None


class Mapa(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="mapa", description="Retorna o link do mapa de tracking da guilda.")
    async def mapa(self, interaction: discord.Interaction):
        guild_id = str(interaction.guild_id)
        url = f"{config.SITE_URL}/map/{guild_id}"

        api_key = config.get_api_key(guild_id)
        if not api_key:
            embed = discord.Embed(
                title="⚠️ Guilda não registrada",
                description="Esta guilda ainda não foi registrada. Use `/setup` para configurar o bot.",
                color=0xF59E0B,
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
            return

        plan = await _get_plan_status(guild_id, api_key)
        if plan is None or not plan.get("active"):
            status_label = "Expirado" if plan and plan.get("plan_status") == "expired" else "Inativo"
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

        embed = discord.Embed(
            title="🗺️ Ultimate Tracker",
            description=f"**[Abrir Mapa]({url})**\n\n{url}",
            color=0x5865F2,
        )
        embed.set_footer(text="Use /scout para reportar um objetivo no mapa.")
        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Mapa(bot))
