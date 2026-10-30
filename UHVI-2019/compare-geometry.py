#!/usr/bin/env python3
"""Compare the archived and current Vienna Zählbezirk boundaries geometrically."""
import json
import urllib.request
from pathlib import Path

from pyproj import Transformer
from shapely import make_valid
from shapely.geometry import shape
from shapely.ops import transform

ARCHIVED = "https://raw.githubusercontent.com/tobiriepl/Livability/9c532d0baf692cf314522ee899735d80310fdf0e/City%20data/Census%20Districts/ZAEHLBEZIRKOGD.json"
CURRENT = "https://data.wien.gv.at/daten/geo/ows?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien%3AZAEHLBEZIRKOGD&srsName=EPSG%3A4326&outputFormat=json"
REPORT = Path(__file__).parent / "geometry-comparison.json"

def read(url):
	request = urllib.request.Request(url, headers={"User-Agent": "Kartensammlung-UHVI/1.0"})
	with urllib.request.urlopen(request, timeout=90) as response:
		geojson = json.load(response)
	assert geojson["type"] == "FeatureCollection" and len(geojson["features"]) == 250
	return {str(f["properties"]["ZBEZ"]): f for f in geojson["features"]}

old, new = read(ARCHIVED), read(CURRENT)
assert set(old) == set(new) and len(old) == 250
to_utm33 = Transformer.from_crs("EPSG:4326", "EPSG:32633", always_xy=True).transform
details = []
invalid_old = invalid_new = 0

for code in sorted(old):
	a = transform(to_utm33, shape(old[code]["geometry"]))
	b = transform(to_utm33, shape(new[code]["geometry"]))
	if not a.is_valid:
		invalid_old += 1
		a = make_valid(a)
	if not b.is_valid:
		invalid_new += 1
		b = make_valid(b)
	union_area = a.union(b).area
	difference_area = a.symmetric_difference(b).area
	ratio = difference_area / union_area if union_area else 0
	details.append({
		"zbez": code,
		"difference_area_m2": round(difference_area, 3),
		"difference_ratio": round(ratio, 9),
		"area_2023_m2": round(a.area, 3),
		"area_current_m2": round(b.area, 3)
	})

report = {
	"archive_geometry_date": "2023-09-15",
	"archive_wfs": ARCHIVED,
	"current_wfs": CURRENT,
	"feature_count_each": 250,
	"join_keys_match": True,
	"comparison_method": "Shapely projected polygon symmetric difference in UTM 33N (EPSG:32633). Invalid source geometries are repaired using make_valid.",
	"invalid_source_polygons_2023": invalid_old,
	"invalid_source_polygons_current": invalid_new,
	"topologically_identical": sum(x["difference_area_m2"] < 0.0005 for x in details),
	"changed_more_than_1_m2": sum(x["difference_area_m2"] > 1 for x in details),
	"changed_more_than_100_m2": sum(x["difference_area_m2"] > 100 for x in details),
	"changed_more_than_0_1_percent": sum(x["difference_ratio"] > 0.001 for x in details),
	"total_symmetric_difference_m2": round(sum(x["difference_area_m2"] for x in details), 3),
	"largest_relative_changes": sorted(details, key=lambda x: x["difference_ratio"], reverse=True)[:10],
	"note": "The published 2019 UHVI GeoJSON uses pinned 2023 boundaries, not the current WFS. Historical 2019 boundaries have not been verified."
}
REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
