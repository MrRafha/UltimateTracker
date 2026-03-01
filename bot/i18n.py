from __future__ import annotations

import config

# ── Translations ──────────────────────────────────────────────────────────────

_STRINGS: dict[str, dict[str, str]] = {
    # ── setup_cmd ─────────────────────────────────────────────────────────────
    "setup.registered_title": {
        "en":    "✅ Guild registered successfully!",
        "pt-BR": "✅ Guilda registrada com sucesso!",
        "es":    "✅ ¡Gremio registrado con éxito!",
        "zh":    "✅ 公会注册成功！",
    },
    "setup.field_guild": {
        "en":    "Guild",
        "pt-BR": "Guilda",
        "es":    "Gremio",
        "zh":    "公会",
    },
    "setup.field_guild_id": {
        "en":    "Guild ID",
        "pt-BR": "Guild ID",
        "es":    "ID del Gremio",
        "zh":    "公会 ID",
    },
    "setup.field_next_steps": {
        "en":    "Next Steps",
        "pt-BR": "Próximos passos",
        "es":    "Próximos pasos",
        "zh":    "后续步骤",
    },
    "setup.next_steps_value": {
        "en":    "• Use `/role @role` to set who can use the tracker.\n• Use `/scout` to report an objective.\n• Use `/map` to get the map link.",
        "pt-BR": "• Use `/role @role` para definir quem pode usar o tracker.\n• Use `/scout` para reportar um objetivo.\n• Use `/mapa` para ver o link do mapa.",
        "es":    "• Use `/role @role` para definir quién puede usar el tracker.\n• Use `/scout` para reportar un objetivo.\n• Use `/mapa` para ver el enlace del mapa.",
        "zh":    "• 使用 `/role @role` 设置谁可以使用追踪器。\n• 使用 `/scout` 报告目标。\n• 使用 `/mapa` 获取地图链接。",
    },
    "setup.footer": {
        "en":    "API key stored in memory. Add to .env to persist.",
        "pt-BR": "API key armazenada em memória. Adicione ao .env para persistir.",
        "es":    "API key almacenada en memoria. Agréguela al .env para persistir.",
        "zh":    "API 密钥已存储在内存中。添加到 .env 以持久化。",
    },
    "setup.region_prompt": {
        "en":    "🌐 **Select the Albion Online server region for this guild:**",
        "pt-BR": "🌐 **Defina a região do servidor Albion Online desta guilda:**",
        "es":    "🌐 **Selecciona la región del servidor de Albion Online para este gremio:**",
        "zh":    "🌐 **为本公会选择 Albion Online 服务器区域：**",
    },
    "setup.region_placeholder": {
        "en":    "Select the server region…",
        "pt-BR": "Selecione a região do servidor…",
        "es":    "Selecciona la región del servidor…",
        "zh":    "选择服务器区域…",
    },
    "setup.region_set": {
        "en":    "✅ Region set to **{region}**!",
        "pt-BR": "✅ Região definida como **{region}**!",
        "es":    "✅ ¡Región definida como **{region}**!",
        "zh":    "✅ 区域已设置为 **{region}**！",
    },
    "setup.region_error": {
        "en":    "❌ Error setting region: {error}",
        "pt-BR": "❌ Erro ao definir região: {error}",
        "es":    "❌ Error al definir la región: {error}",
        "zh":    "❌ 设置区域时出错：{error}",
    },
    "setup.lang_prompt": {
        "en":    "🌍 **Select the bot language for this guild:**",
        "pt-BR": "🌍 **Selecione o idioma do bot para esta guilda:**",
        "es":    "🌍 **Selecciona el idioma del bot para este gremio:**",
        "zh":    "🌍 **为本公会选择机器人语言：**",
    },
    "setup.lang_placeholder": {
        "en":    "Select language…",
        "pt-BR": "Selecione o idioma…",
        "es":    "Selecciona el idioma…",
        "zh":    "选择语言…",
    },
    "setup.lang_set": {
        "en":    "✅ Language set to **English**! All bot responses will now be in English.",
        "pt-BR": "✅ Idioma definido como **Português (BR)**! Todas as respostas do bot serão em português.",
        "es":    "✅ ¡Idioma definido como **Español**! Todas las respuestas del bot serán en español.",
        "zh":    "✅ 语言已设置为**中文**！机器人的所有回复将使用中文。",
    },
    "setup.register_error": {
        "en":    "❌ Error registering: {error}",
        "pt-BR": "❌ Erro ao registrar: {error}",
        "es":    "❌ Error al registrar: {error}",
        "zh":    "❌ 注册时出错：{error}",
    },

    # ── scout ─────────────────────────────────────────────────────────────────
    "scout.not_registered": {
        "en":    "❌ This guild is not registered. Use `/setup` first.",
        "pt-BR": "❌ Esta guilda não está registrada. Use `/setup` primeiro.",
        "es":    "❌ Este gremio no está registrado. Use `/setup` primero.",
        "zh":    "❌ 本公会尚未注册。请先使用 `/setup`。",
    },
    "scout.modal_title": {
        "en":    "🗺️ Scout — Report Objective",
        "pt-BR": "🗺️ Scout — Registrar Objetivo",
        "es":    "🗺️ Scout — Reportar Objetivo",
        "zh":    "🗺️ 侦察 — 报告目标",
    },
    "scout.modal_map_label": {
        "en":    "Map",
        "pt-BR": "Mapa",
        "es":    "Mapa",
        "zh":    "地图",
    },
    "scout.modal_map_placeholder": {
        "en":    "Ex: Watchwood Bluffs",
        "pt-BR": "Ex: Watchwood Bluffs",
        "es":    "Ej: Watchwood Bluffs",
        "zh":    "例：Watchwood Bluffs",
    },
    "scout.modal_time_label": {
        "en":    "Time remaining (HH:MM)",
        "pt-BR": "Tempo restante (HH:MM)",
        "es":    "Tiempo restante (HH:MM)",
        "zh":    "剩余时间（HH:MM）",
    },
    "scout.modal_time_placeholder": {
        "en":    "Ex: 01:30  or  00:45",
        "pt-BR": "Ex: 01:30  ou  00:45",
        "es":    "Ej: 01:30  o  00:45",
        "zh":    "例：01:30 或 00:45",
    },
    "scout.time_invalid": {
        "en":    "❌ Invalid time format. Use `HH:MM` (e.g. `01:30`).",
        "pt-BR": "❌ Formato de tempo inválido. Use `HH:MM` (ex: `01:30`).",
        "es":    "❌ Formato de tiempo inválido. Use `HH:MM` (ej: `01:30`).",
        "zh":    "❌ 时间格式无效。请使用 `HH:MM`（例：`01:30`）。",
    },
    "scout.select_type_title": {
        "en":    "Select the objective **type**:",
        "pt-BR": "Selecione o **tipo** de objetivo:",
        "es":    "Selecciona el **tipo** de objetivo:",
        "zh":    "选择目标**类型**：",
    },
    "scout.type_placeholder": {
        "en":    "Select objective type…",
        "pt-BR": "Selecione o tipo de objetivo…",
        "es":    "Selecciona el tipo de objetivo…",
        "zh":    "选择目标类型…",
    },
    "scout.type_selected": {
        "en":    "Type selected: {type}",
        "pt-BR": "Tipo selecionado: {type}",
        "es":    "Tipo seleccionado: {type}",
        "zh":    "已选择类型：{type}",
    },
    "scout.select_objective": {
        "en":    "Now select the objective:",
        "pt-BR": "Agora selecione o objetivo:",
        "es":    "Ahora selecciona el objetivo:",
        "zh":    "现在选择目标：",
    },
    "scout.objective_placeholder": {
        "en":    "Select objective…",
        "pt-BR": "Selecione o objetivo…",
        "es":    "Selecciona el objetivo…",
        "zh":    "选择目标…",
    },
    "scout.select_tier": {
        "en":    "Now select the node **tier**:",
        "pt-BR": "Agora selecione o **tier** do node:",
        "es":    "Ahora selecciona el **tier** del nodo:",
        "zh":    "现在选择节点**等级**：",
    },
    "scout.tier_placeholder": {
        "en":    "Select node tier…",
        "pt-BR": "Selecione o tier do node…",
        "es":    "Selecciona el tier del nodo…",
        "zh":    "选择节点等级…",
    },
    "scout.registered_title": {
        "en":    "✅ Tracker registered!",
        "pt-BR": "✅ Tracker registrado!",
        "es":    "✅ ¡Tracker registrado!",
        "zh":    "✅ 追踪器已注册！",
    },
    "scout.field_map": {
        "en":    "Map",
        "pt-BR": "Mapa",
        "es":    "Mapa",
        "zh":    "地图",
    },
    "scout.field_type": {
        "en":    "Type",
        "pt-BR": "Tipo",
        "es":    "Tipo",
        "zh":    "类型",
    },
    "scout.field_objective": {
        "en":    "Objective",
        "pt-BR": "Objetivo",
        "es":    "Objetivo",
        "zh":    "目标",
    },
    "scout.field_tier": {
        "en":    "Tier",
        "pt-BR": "Tier",
        "es":    "Tier",
        "zh":    "等级",
    },
    "scout.field_time": {
        "en":    "Time remaining",
        "pt-BR": "Tempo restante",
        "es":    "Tiempo restante",
        "zh":    "剩余时间",
    },
    "scout.footer_reported_by": {
        "en":    "Reported by {name}",
        "pt-BR": "Reportado por {name}",
        "es":    "Reportado por {name}",
        "zh":    "由 {name} 报告",
    },
    "scout.error_register": {
        "en":    "❌ Error registering: `{status}` — {text}",
        "pt-BR": "❌ Erro ao registrar: `{status}` — {text}",
        "es":    "❌ Error al registrar: `{status}` — {text}",
        "zh":    "❌ 注册时出错：`{status}` — {text}",
    },
    "scout.error_unexpected": {
        "en":    "❌ Unexpected error: {error}",
        "pt-BR": "❌ Erro inesperado: {error}",
        "es":    "❌ Error inesperado: {error}",
        "zh":    "❌ 意外错误：{error}",
    },
    "scout.objective_title": {
        "en":    "Objective selected",
        "pt-BR": "Objetivo selecionado",
        "es":    "Objetivo seleccionado",
        "zh":    "已选择目标",
    },

    # ── mapa ──────────────────────────────────────────────────────────────────
    "mapa.not_registered_title": {
        "en":    "⚠️ Guild not registered",
        "pt-BR": "⚠️ Guilda não registrada",
        "es":    "⚠️ Gremio no registrado",
        "zh":    "⚠️ 公会未注册",
    },
    "mapa.not_registered_desc": {
        "en":    "This guild has not been registered yet. Use `/setup` to configure the bot.",
        "pt-BR": "Esta guilda ainda não foi registrada. Use `/setup` para configurar o bot.",
        "es":    "Este gremio aún no ha sido registrado. Use `/setup` para configurar el bot.",
        "zh":    "本公会尚未注册。请使用 `/setup` 配置机器人。",
    },
    "mapa.embed_title": {
        "en":    "🗺️ Ultimate Tracker",
        "pt-BR": "🗺️ Ultimate Tracker",
        "es":    "🗺️ Ultimate Tracker",
        "zh":    "🗺️ Ultimate Tracker",
    },
    "mapa.open_map": {
        "en":    "Open Map",
        "pt-BR": "Abrir Mapa",
        "es":    "Abrir Mapa",
        "zh":    "打开地图",
    },
    "mapa.footer": {
        "en":    "Use /scout to report an objective on the map.",
        "pt-BR": "Use /scout para reportar um objetivo no mapa.",
        "es":    "Use /scout para reportar un objetivo en el mapa.",
        "zh":    "使用 /scout 在地图上报告目标。",
    },

    # ── role ──────────────────────────────────────────────────────────────────
    "role.not_registered": {
        "en":    "❌ This guild is not registered. Use `/setup` first.",
        "pt-BR": "❌ Esta guilda não está registrada. Use `/setup` primeiro.",
        "es":    "❌ Este gremio no está registrado. Use `/setup` primero.",
        "zh":    "❌ 本公会尚未注册。请先使用 `/setup`。",
    },
    "role.set_title": {
        "en":    "✅ Role configured!",
        "pt-BR": "✅ Role configurada!",
        "es":    "✅ ¡Rol configurado!",
        "zh":    "✅ 身份组已配置！",
    },
    "role.set_desc": {
        "en":    "Only members with the {role} role will be able to use the bot commands and access the tracking map.",
        "pt-BR": "Apenas membros com a role {role} poderão usar os comandos do bot e acessar o mapa de tracking.",
        "es":    "Solo los miembros con el rol {role} podrán usar los comandos del bot y acceder al mapa de tracking.",
        "zh":    "只有拥有 {role} 身份组的成员才能使用机器人命令并访问追踪地图。",
    },
    "role.error_set": {
        "en":    "❌ Error configuring role: `{status}`",
        "pt-BR": "❌ Erro ao configurar role: `{status}`",
        "es":    "❌ Error al configurar el rol: `{status}`",
        "zh":    "❌ 配置身份组时出错：`{status}`",
    },
    "role.error_unexpected": {
        "en":    "❌ Unexpected error: {error}",
        "pt-BR": "❌ Erro inesperado: {error}",
        "es":    "❌ Error inesperado: {error}",
        "zh":    "❌ 意外错误：{error}",
    },
}

SUPPORTED_LANGUAGES = ["en", "pt-BR", "es", "zh"]
DEFAULT_LANGUAGE = "en"


def t(guild_id: str | int, key: str, **kwargs: str) -> str:
    """Return the translated string for the guild's configured language."""
    lang = config.get_language(str(guild_id))
    translations = _STRINGS.get(key, {})
    text = translations.get(lang) or translations.get(DEFAULT_LANGUAGE, key)
    if kwargs:
        text = text.format(**kwargs)
    return text
