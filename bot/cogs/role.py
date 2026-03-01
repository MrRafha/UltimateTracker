from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

import httpx

import config
from i18n import t


class Role(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="role", description="Sets which role can use the bot and view the map.")
    @app_commands.describe(role="The role that will have access to this guild's tracker.")
    @app_commands.default_permissions(manage_guild=True)
    async def role(self, interaction: discord.Interaction, role: discord.Role):
        guild_id = str(interaction.guild_id)
        api_key  = config.get_api_key(guild_id)

        if not api_key:
            await interaction.response.send_message(
                t(guild_id, "role.not_registered"), ephemeral=True
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
                t(guild_id, "role.error_set", status=str(e.response.status_code)), ephemeral=True
            )
            return
        except Exception as e:
            await interaction.response.send_message(
                t(guild_id, "role.error_unexpected", error=str(e)), ephemeral=True
            )
            return

        embed = discord.Embed(
            title=t(guild_id, "role.set_title"),
            description=t(guild_id, "role.set_desc", role=role.mention),
            color=0x57F287,
        )
        await interaction.response.send_message(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(Role(bot))
