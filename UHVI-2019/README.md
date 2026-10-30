# Urban Heat Vulnerability Index (UHVI), Wien 2019

Der archivierte Originaldatensatz liegt unverändert unter [averageurbanheatvulnerabilityindex.csv](../averageurbanheatvulnerabilityindex.csv).
Quelle: https://www.wien.gv.at/data/ogd/ma20/averageurbanheatvulnerabilityindex.csv

- CSV SHA-256: 86223858adaaf2fd0c42d29e9bc415ef1f68c9917650ae2ea4074340c0a5d1d4
- 250 Zählbezirke; drei numerische Indizes: AVG_UHVI_A (0–14 und ab 60 Jahre gemeinsam), AVG_UHVI_O (ab 60), AVG_UHVI_Y (0–14).
- Der ausgegebene GeoJSON-Layer verwendet geometrische Grenzen aus der archivierten originalen WFS-Abfrage mit AKT_TIMESTAMP 15.09.2023, nicht Grenzen aus 2019.
- Geometriequelle (fest auf Commit gepinnt): https://github.com/tobiriepl/Livability/blob/9c532d0baf692cf314522ee899735d80310fdf0e/City%20data/Census%20Districts/ZAEHLBEZIRKOGD.json
- Aktueller amtlicher WFS-Layer: ogdwien:ZAEHLBEZIRKOGD
- Die Erzeugung wird durch build.mjs reproduzierbar beschrieben. Der Build muss alle 250 Kennungen sowohl in der Archivgeometrie als auch im aktuellen WFS zuordnen können. Der aktuelle WFS wird nur für einen Vergleich herangezogen.
- Die Datei geometry-comparison.json dokumentiert die Anzahl exakter Unterschiede der Koordinatenarrays zwischen der archivierten und aktuellen Geometrie. Eine topologische Gleichheitsanalyse oder Verifikation von Zählbezirksgrenzen aus 2019 ist dies nicht.
- Zuordnung: SUB_DISTRICT_CODE_VIE = 90000 + Number(ZBEZ).
- Quellenangabe: Datenquelle Stadt Wien – data.wien.gv.at; UHVI: ECOTEN 2019; Geometriekopie: Stadt Wien OGD. Die OGD-Daten sind laut Herausgeber CC BY 4.0.

Der UHVI ist ein normierter, modellbasierter Index und kein orts- oder personengenaues Hitze-/Gesundheitsrisiko.
