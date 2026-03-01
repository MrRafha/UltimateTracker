from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

import httpx

import config
from i18n import t, SUPPORTED_LANGUAGES


# ── Language select (step 3) ──────────────────────────────────────────────────

LANGUAGE_OPTIONS = [
    discord.SelectOption(label="🇺🇸 English",          value="en",    description="English"),
    discord.SelectOption(label="🇧🇷 Português (BR)",   value="pt-BR", description="Portuguese (Brazil)"),
    discord.SelectOption(label="🇪🇸 Español",          value="es",    description="Spanish"),
    discord.SelectOption(label="🇨🇳 中文",              value="zh",    description="Chinese"),
]


class LanguageSelect(discord.ui.Select):
    def __init__(self, guild_id: str):
        self.guild_id = guild_id
        super().__init__(
            placeholder="Select bot language…",
            min_values=1, max_values=1,
            options=LANGUAGE_OPTIONS,
        )

    async def callback(self, interaction: discord.Interaction):
        lang = self.values[0]
        config.GUILD_LANGUAGES[self.guild_id] = lang
        # Confirmation uses the newly chosen language
        await interaction.response.send_message(
            t(self.guild_id, "setup.lang_set"), ephemeral=True
        )
        self.view.stop()


class LanguageView(discord.ui.View):
    def __init__(self, guild_id: str):
        super().__init__(timeout=120)
        self.add_item(LanguageSelect(guild_id))


# ── Server region select (step 2) ─────────────────────────────────────────────

class ServerRegionSelect(discord.ui.Select):
    def __init__(self, guild_id: str, api_key: str):
        self.guild_id = guild_id
        self.api_key  = api_key
        options = [
            discord.SelectOption(label="🌎 WEST – NA", value="WEST", description="North American Server"),
            discord.SelectOption(label="🌍 EAST – EU", value="EAST", description="European Server"),
            discord.SelectOption(label="🌏 ASIA – CH", value="ASIA", description="Asian Server"),
        ]
        super().__init__(
            placeholder="Select server region…",
            min_values=1, max_values=1,
            options=options,
        )

    async def callback(self, interaction: discord.Interaction):
        region = self.values[0]
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.patch(
                    f"{config.API_BASE_URL}/guilds/{self.guild_id}/region",
                    json={"server_region": region},
                    headers={"X-Api-Key": self.api_key},
                )
                r.raise_for_status()
        except Exception as e:
            await interaction.response.send_message(
                t(self.guild_id, "setup.region_error", error=str(e)), ephemeral=True
            )
            return

        region_labels = {"WEST": "🌎 WEST – NA", "EAST": "🌍 EAST – EU", "ASIA": "🌏 ASIA – CH"}
        await interaction.response.send_message(
            t(self.guild_id, "setup.region_set", region=region_labels.get(region, region)),
            ephemeral=True,
        )
        self.view.stop()

        # Step 3: language selection
        await interaction.followup.send(
            "🌍 **Select the bot language for this guild:**",
            view=LanguageView(self.guild_id),
            ephemeral=True,
        )


class ServerRegionView(discord.ui.View):
    def __init__(self, guild_id: str, api_key: str):
        super().__init__(timeout=120)
        self.add_item(ServerRegionSelect(guild_id, api_key))


# ── Setup Cog ─────────────────────────────────────────────────────────────────


class Setup(commands.Cog):
    """Registers this guild with the backend and stores the API key in config."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="setup", description="Register this guild with the tracking bot. (Admins only)")
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
            # Setup always shows in English (language not set yet)
            await interaction.response.send_message(
                f"❌ Error registering: {e}", ephemeral=True
            )
            return

        api_key = data["api_key"]
        config.GUILD_API_KEYS[guild_id] = api_key

        # Setup confirmation is always in English
        embed = discord.Embed(title="✅ Guild registered successfully!", color=0x57F287)
        embed.add_field(name="Guild",    value=guild_name, inline=True)
        embed.add_field(name="Guild ID", value=guild_id,   inline=True)
        embed.add_field(
            name="Next Steps",
            value="• Use `/role @role` to define who can use the tracker.\n• Use `/scout` to report an objective.\n• Use `/map` to see the map link.",
            inline=False,
        )
        embed.set_footer(text="API key stored in memory. Add to .env to persist.")
        await interaction.response.send_message(embed=embed, ephemeral=True)

        # Step 2: region selection
        await interaction.followup.send(
            "🌐 **Select the Albion Online server region for this guild:**",
            view=ServerRegionView(guild_id, api_key),
            ephemeral=True,
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(Setup(bot))

