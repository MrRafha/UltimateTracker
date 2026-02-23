import json
import re

with open("zones.json", "r", encoding="utf-8") as f:
    zones = json.load(f)

for z in zones:
    name = z["displayName"]
    # remove parte entre colchetes
    name = re.sub(r"\s*\[.*?\]\s*", "", name).strip()
    z["displayName"] = name

with open("zones.json", "w", encoding="utf-8") as f:
    json.dump(zones, f, indent=2, ensure_ascii=False)

print("zones.json limpo com sucesso.")