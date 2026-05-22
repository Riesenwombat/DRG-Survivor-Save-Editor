# DRG Survivor Save Editor

Save Editor for DRG Survivor.

Ein lokaler Browser-Save-Editor fuer **Deep Rock Galactic: Survivor**.

Die App laedt Save-Dateien direkt im Browser, zeigt die JSON-Struktur als Baum an,
erlaubt das Bearbeiten einzelner Werte und exportiert eine bearbeitete `.dat`-Datei.
Es werden keine Save-Daten an einen Server gesendet.

## Nutzung

1. Original-Save sichern.
2. `index.html` im Browser oeffnen oder die GitHub-Pages-Seite nutzen.
3. Save-Datei laden.
4. Werte bearbeiten.
5. Bearbeitete `.dat` herunterladen und selbst in den Save-Ordner kopieren.

Typischer Save-Ordner unter Windows:

```text
%USERPROFILE%\AppData\LocalLow\Funday Games\DRG Survivor
```

## GitHub Pages

Dieses Repo enthaelt eine GitHub-Actions-Konfiguration unter
`.github/workflows/pages.yml`. Nach dem Push auf `main` wird die statische Seite
automatisch via GitHub Pages deployed.
