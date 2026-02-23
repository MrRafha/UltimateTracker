from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

import httpx

import config


class Role(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="role", description="Define qual role pode usar o bot e ver o mapa.")
    @app_commands.describe(role="A role que terá acesso ao tracker desta guilda.")
    @app_commands.default_permissions(manage_guild=True)
    async def role(self, interaction: discord.Interaction, role: discord.Role):
        guild_id = str(interaction.guild_id)
        api_key  = config.get_api_key(guild_id)

        if not api_key:
            await interaction.response.send_message(
                "❌ Esta guilda não está registrada. Use `/setup` primeiro.", ephemeral=True
            )
            return

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.patch(
                    f"{config.API_BASE_URL}/guilds/{guild_id}/role",
                    json={"allowed_role_id": str(role.id)},
                    headers={"X-Api-Key": api_key},
                )
                r.raise_for_status()
        except httpx.HTTPStatusError as e:
            await interaction.response.send_message(
                f"❌ Erro ao configurar role: `{e.response.status_code}`", ephemeral=True
            )
            return
        except Exception as e:
            await interaction.response.send_message(f"❌ Erro inesperado: {e}", ephemeral=True)
            return

        embed = discord.Embed(
            title="✅ Role configurada!",
            description=f"Apenas membros com a role {role.mention} poderão usar os comandos do bot e acessar o mapa de tracking.",
            color=0x57F287,
        )
        await interaction.response.send_message(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(Role(bot))
