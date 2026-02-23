from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

import httpx

import config


class Setup(commands.Cog):
    """Registers this guild with the backend and stores the API key in config."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="setup", description="Registra esta guilda no bot de tracking. (Apenas admins)")
    @app_commands.default_permissions(administrator=True)
    async def setup_cmd(self, interaction: discord.Interaction):
        guild_id   = str(interaction.guild_id)
        guild_name = interaction.guild.name if interaction.guild else guild_id

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(
                    f"{config.API_BASE_URL}/guilds/register",
                    json={"guild_id": guild_id, "guild_name": guild_name},
                    headers={"X-Bot-Secret": config.BOT_SECRET},
                )
                r.raise_for_status()
                data = r.json()
        except Exception as e:
            await interaction.response.send_message(f"❌ Erro ao registrar: {e}", ephemeral=True)
            return

        api_key = data["api_key"]
        # Store in runtime dict — for persistence, update .env manually or use a DB.
        config.GUILD_API_KEYS[guild_id] = api_key

        embed = discord.Embed(
            title="✅ Guilda registrada com sucesso!",
            color=0x57F287,
        )
        embed.add_field(name="Guilda",   value=guild_name, inline=True)
        embed.add_field(name="Guild ID", value=guild_id,   inline=True)
        embed.add_field(
            name="Próximos passos",
            value="• Use `/role @role` para definir quem pode usar o tracker.\n• Use `/scout` para reportar um objetivo.\n• Use `/mapa` para ver o link do mapa.",
            inline=False,
        )
        embed.set_footer(text="API key armazenada em memória. Adicione ao .env para persistir.")
        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Setup(bot))
