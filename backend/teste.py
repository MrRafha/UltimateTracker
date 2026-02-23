import json
aliases=json.load(open('zone_aliases.json','r',encoding='utf-8'))
zones=json.load(open('zones.json','r',encoding='utf-8'))
zone_ids=set(z['zoneId'] for z in zones)

for k in ["battlebrae plain","willowshade sink","whitecliff peak"]:
    print(k, "in aliases?", k in aliases, "->", aliases.get(k))

# checa se aliases apontam para zoneId que existe
bad=[(k,v) for k,v in list(aliases.items())[:500] if v not in zone_ids]
print("sample bad pointers:", bad[:3])
