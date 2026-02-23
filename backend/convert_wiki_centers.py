import json
import re

def slugify(name: str) -> str:
    name = name.strip().upper()
    name = re.sub(r"[^A-Z0-9]+", "_", name)
    return name.strip("_")

# 1) cole aqui o JSON copiado do console
with open("wiki_centers.json", "r", encoding="utf-8") as f:
    data = json.load(f)

zones = []

for item in data:
    name = item["name"]
    lat = item["lat"]
    lng = item["lng"]

    zones.append({
        "zoneId": slugify(name),
        "displayName": name,
        "center": {
            "x": lng,
            "y": lat
        }
    })

with open("zones.json", "w", encoding="utf-8") as f:
    json.dump(zones, f, indent=2)

print("zones.json gerado com sucesso.")