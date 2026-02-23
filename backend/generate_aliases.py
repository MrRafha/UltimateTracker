import json

def norm(s: str):
    s = s.lower()
    s = s.replace("_", " ")
    return " ".join(s.split())

with open("zones.json", "r", encoding="utf-8") as f:
    zones = json.load(f)

aliases = {}

for z in zones:
    key = norm(z["displayName"])
    aliases[key] = z["zoneId"]

with open("zone_aliases.json", "w", encoding="utf-8") as f:
    json.dump(aliases, f, indent=2)

print("zone_aliases.json gerado com sucesso.")