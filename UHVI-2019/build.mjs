import { readFile, writeFile } from "node:fs/promises";

const ARCHIVED_WFS = "https://raw.githubusercontent.com/tobiriepl/Livability/9c532d0baf692cf314522ee899735d80310fdf0e/City%20data/Census%20Districts/ZAEHLBEZIRKOGD.json";
const CURRENT_WFS = "https://data.wien.gv.at/daten/geo/ows?service=WFS&request=GetFeature&version=1.1.0&typeName=ogdwien%3AZAEHLBEZIRKOGD&srsName=EPSG%3A4326&outputFormat=json";

function check(ok, message) {
	if (!ok) throw new Error(message);
}

async function fetchFeatures(url) {
	const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
	check(response.ok, "WFS HTTP " + response.status + ": " + url);
	const json = await response.json();
	check(json.type === "FeatureCollection" && json.features?.length === 250, "Expected 250 GeoJSON features: " + url);
	return new Map(json.features.map((feature) => [String(feature.properties.ZBEZ), feature]));
}

function loadRows(csv) {
	const lines = csv.trim().split(/\r?\n/);
	const headers = lines.shift().split(";");
	const rows = new Map();
	for (const line of lines) {
		const cells = line.split(";");
		check(cells.length === headers.length, "Malformed CSV row");
		const row = Object.fromEntries(headers.map((name, i) => [name, cells[i]]));
		check(!rows.has(row.SUB_DISTRICT_CODE_VIE), "Duplicate CSV code");
		rows.set(row.SUB_DISTRICT_CODE_VIE, row);
	}
	check(rows.size === 250, "Expected 250 CSV rows");
	return rows;
}

function validate(features, rows, label) {
	check(features.size === 250, "Duplicate geometry codes in " + label);
	for (const [code, feature] of features) {
		check(/^\d{4}$/.test(code), "Invalid ZBEZ in " + label + ": " + code);
		const row = rows.get(String(90000 + Number(code)));
		check(row, "Unmatched code in " + label + ": " + code);
		check(Number(feature.properties.BEZ) === Number(code.slice(0, 2)), "Bad district: " + code);
		check(Number(row.DISTRICT_CODE) === 90000 + Number(feature.properties.BEZ) * 100, "CSV district mismatch: " + code);
		check(["Polygon", "MultiPolygon"].includes(feature.geometry?.type), "Invalid polygon in " + label + ": " + code);
	}
}

async function main() {
	const rows = loadRows((await readFile(new URL("../averageurbanheatvulnerabilityindex.csv", import.meta.url))).toString("latin1"));
	const [oldFeatures, currentFeatures] = await Promise.all([fetchFeatures(ARCHIVED_WFS), fetchFeatures(CURRENT_WFS)]);
	validate(oldFeatures, rows, "archived WFS 2023");
	validate(currentFeatures, rows, "current WFS");

	const changed = [...oldFeatures.keys()].sort().filter(code =>
		JSON.stringify(oldFeatures.get(code).geometry) !== JSON.stringify(currentFeatures.get(code).geometry)
	);
	const report = {
		archive_geometry_date: "2023-09-15",
		archive_wfs: ARCHIVED_WFS,
		checked_live_wfs: CURRENT_WFS,
		archived_feature_count: oldFeatures.size,
		current_feature_count: currentFeatures.size,
		csv_rows_matched_both: rows.size,
		coordinate_arrays_different: changed.length,
		codes_with_different_coordinate_arrays: changed,
		note: "Exact coordinate-array comparison; not a topological equality analysis. The published UHVI uses the pinned 2023 archival geometry, not current boundaries."
	};
	const features = [...oldFeatures.keys()].sort().map(code => {
		const geometry = oldFeatures.get(code).geometry;
		const r = rows.get(String(90000 + Number(code)));
		const value = key => {
			const n = Number(r[key].replace(",", "."));
			check(Number.isFinite(n) && n >= 0 && n <= 1, "Invalid " + key + " in " + code);
			return n;
		};
		return {
			type: "Feature",
			id: String(90000 + Number(code)),
			properties: {
				ZBEZ: code,
				BEZ: Number(oldFeatures.get(code).properties.BEZ),
				SUB_DISTRICT_CODE_VIE: Number(r.SUB_DISTRICT_CODE_VIE),
				SUB_DISTRICT_CODE_STATA: r.SUB_DISTRICT_CODE_STATA,
				NAME_VIE: r.NAME_VIE,
				AVG_UHVI_A: value("AVG_UHVI_A"),
				AVG_UHVI_O: value("AVG_UHVI_O"),
				AVG_UHVI_Y: value("AVG_UHVI_Y")
			},
			geometry
		};
	});
	await writeFile(new URL("./uhvi-2019.geojson", import.meta.url), JSON.stringify({ type: "FeatureCollection", features }) + "\n");
	await writeFile(new URL("./geometry-comparison.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
	console.log(JSON.stringify(report, null, 2));
}

await main();
