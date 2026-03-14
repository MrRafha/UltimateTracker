"""
Gera backend/zone_colors.json mapeando displayName → color (blue/yellow/red/black)
usando os dados do repositório ao-bin-dumps (exportação oficial dos dados do jogo AO).

Lógica de classificação derivada dos nomes dos arquivos cluster:
  - CTY / STT / ISL / _NON  → blue   (cidades, starter areas, ilhas, non-pvp)
  - _OUT                    → black  (Outlands = full-loot PvP)
  - _ROY + T3/T4 tier       → yellow (Royal Continent zona não-letal)
  - _ROY + T5/T6/T7/T8 tier → red   (Royal Continent zona letal)

Referências:
  world.json    : index → displayName
  cluster/      : {index}_...cluster.xml → nomes com tipo/tier embutidos

Execute uma vez e commite o arquivo gerado:
    python backend/scripts/fetch_zone_colors.py
"""
import json
import re
import urllib.request
from pathlib import Path

BASE = "https://raw.githubusercontent.com/broderickhyman/ao-bin-dumps/master"
API  = "https://api.github.com/repos/broderickhyman/ao-bin-dumps"
OUT  = Path(__file__).resolve().parent.parent / "zone_colors.json"

def fetch_json(url: str) -> object:
    req = urllib.request.Request(url, headers={"User-Agent": "ao-zone-colors/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

def classify_cluster(cluster_name):
    """
    Retorna 'blue'|'yellow'|'red'|'black' a partir do nome do arquivo cluster.
    Exemplos:
      2000_CTY_ST_AUTO_T1_NON       → blue
      0202_WRL_SW_AUTO_T3_HER_ROY   → yellow  (T3, Royal)
      3220_WRL_HL_AUTO_T5_KPR_ROY   → red     (T5, Royal)
      3316_WRL_HL_AUTO_T5_KPR_OUT_Q4 → black  (Outlands)
    """
    n = cluster_name.upper()
    parts = n.split("_")
    zone_type = parts[1] if len(parts) > 1 else ""

    # Ilhas de jogador/guild → blue (instância privada)
    if "ISL_DL" in n:
        return "blue"

    # Zonas marcadas explicitamente como non-pvp ou city/starting → blue
    if n.endswith("_NON") or "_NON_" in n:
        return "blue"
    if zone_type in ("CTY", "STT", "STARTINGCITY"):
        return "blue"

    # Outlands → black
    if "_OUT" in n:
        return "black"

    # Royal Continent: classifica pelo tier
    if n.endswith("_ROY") or "_ROY_" in n:
        m = re.search(r"_T(\d+)_", n)
        if m:
            tier = int(m.group(1))
            return "yellow" if tier <= 4 else "red"
        return "red"  # sem tier → assume red

    return None  # Dungeons, Mists, Hellgates, etc. — ignorar

def main() -> None:
    # 1) Baixar world.json: index → displayName
    print("Fetching formatted/world.json...")
    world = fetch_json(f"{BASE}/formatted/world.json")
    index_to_name: dict[str, str] = {}
    for entry in world:
        idx  = str(entry.get("Index", ""))
        name = str(entry.get("UniqueName", ""))
        if idx and name:
            index_to_name[idx] = name
    print(f"  {len(index_to_name)} zone entries in world.json")

    # 2) Listar todos os arquivos cluster via git tree
    print("Fetching git tree (cluster/ directory)...")
    tree_data = fetch_json(f"{API}/git/trees/master?recursive=1")
    cluster_by_index: dict[str, str] = {}
    for node in tree_data.get("tree", []):
        path = node["path"]
        if path.startswith("cluster/") and path.endswith(".cluster.xml"):
            fname = path.split("/")[1].replace(".cluster.xml", "")
            idx   = fname.split("_")[0]
            cluster_by_index[idx] = fname
    print(f"  {len(cluster_by_index)} cluster files found")

    # 3) Carregar zones.json do projeto para obter displayNames únicos
    zones_path = Path(__file__).resolve().parent.parent / "zones.json"
    with open(zones_path, encoding="utf-8") as f:
        zones_raw = json.load(f)
    # Deduplica por displayName
    display_names: set[str] = {z["displayName"] for z in zones_raw}
    print(f"  {len(display_names)} unique zone displayNames in zones.json")

    # 4) Construir nome → índice (world.json tem displayName como UniqueName)
    name_to_index: dict[str, str] = {v: k for k, v in index_to_name.items()}

    # 5) Para cada displayName, determinar a cor
    result: dict[str, str] = {}
    unmatched: list[str] = []

    # Overrides manuais para zonas especiais conhecidas
    MANUAL: dict[str, str] = {
        "Caerleon": "blue",
        "Caerleon Portal": "blue",
        "Astolat": "blue",  # área próxima a Caerleon
    }
    # Portais das cidades reais → blue
    for name in display_names:
        if "portal" in name.lower() and any(
            c in name.lower()
            for c in ["bridgewatch", "lymhurst", "martlock", "thetford", "fort sterling",
                      "caerleon", "royal", "city"]
        ):
            result[name] = "blue"

    for name in sorted(display_names):
        if name in result:
            continue
        if name in MANUAL:
            result[name] = MANUAL[name]
            continue

        idx = name_to_index.get(name)
        if not idx:
            unmatched.append(name)
            continue

        cluster = cluster_by_index.get(idx)
        if not cluster:
            unmatched.append(name)
            continue

        color = classify_cluster(cluster)
        if color:
            result[name] = color
        else:
            unmatched.append(name)

    # 6) Gravar resultado
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2, sort_keys=True)

    print(f"\nDone — {len(result)} zones mapped:")
    from collections import Counter
    counts = Counter(result.values())
    for color, count in sorted(counts.items()):
        print(f"  {color:8}: {count}")
    print(f"  unmatched: {len(unmatched)}")
    if unmatched:
        print("  Sample unmatched:", unmatched[:10])
    print(f"\nWritten to: {OUT}")

if __name__ == "__main__":
    main()
