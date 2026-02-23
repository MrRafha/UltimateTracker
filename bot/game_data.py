from __future__ import annotations

# These must match backend/constants.py and frontend/app/types.ts exactly.

TRACKER_TYPES = ["node", "orb", "vortex"]

OBJECTIVES_BY_TYPE: dict[str, list[str]] = {
    "node":   ["couro", "linho", "minério", "madeira"],
    "orb":    ["verde", "azul", "roxa", "dourada"],
    "vortex": ["verde", "azul", "roxo", "dourado"],
}

TYPE_EMOJI = {
    "node":   "🌿",
    "orb":    "🔮",
    "vortex": "🌀",
}

OBJECTIVE_EMOJI = {
    "couro":   "🐂",
    "linho":   "🌾",
    "minério": "⛏️",
    "madeira": "🌲",
    "verde":   "🟢",
    "azul":    "🔵",
    "roxa":    "🟣",
    "dourada": "🟡",
    "roxo":    "🟣",
    "dourado": "🟡",
}
