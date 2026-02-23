from __future__ import annotations
from enum import Enum


class TrackerType(str, Enum):
    node = "node"
    orb = "orb"
    vortex = "vortex"


class TrackerObjective(str, Enum):
    # Node
    couro = "couro"
    linho = "linho"
    minerio = "minério"
    madeira = "madeira"
    # Orb
    orb_verde = "verde"
    orb_azul = "azul"
    orb_roxa = "roxa"
    orb_dourada = "dourada"
    # Vortex
    vortex_verde = "verde_vortex"
    vortex_azul = "azul_vortex"
    vortex_roxo = "roxo"
    vortex_dourado = "dourado"


# Valid objectives per type — used for validation
OBJECTIVES_BY_TYPE: dict[str, list[str]] = {
    "node": ["couro", "linho", "minério", "madeira"],
    "orb": ["verde", "azul", "roxa", "dourada"],
    "vortex": ["verde", "azul", "roxo", "dourado"],
}


class TrackerSource(str, Enum):
    discord = "discord"
    web = "web"
