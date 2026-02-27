from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

import config


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

        embed = discord.Embed(
            title="🗺️ Ultimate Tracker",
            description=f"**[Abrir Mapa]({url})**\n\n{url}",
            color=0x5865F2,
        )
        embed.set_footer(text="Use /scout para reportar um objetivo no mapa.")
        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Mapa(bot))
