# DRG Survivor Save Editor

A local browser-based save editor for **Deep Rock Galactic: Survivor**.

The app loads save files directly in your browser, displays the JSON structure
as an editable tree, lets you change individual values, and exports an edited
`.dat` file. No save data is uploaded to a server.

## Usage

1. Back up your original save file.
2. Open `index.html` in your browser or use the GitHub Pages version.
3. Load your save file.
4. Edit the values you want to change.
5. Download the edited `.dat` file and copy it back into the save folder.

Typical save folder on Windows:

```text
%USERPROFILE%\AppData\LocalLow\Funday Games\DRG Survivor
```

## GitHub Pages

This repository includes a GitHub Actions workflow at
`.github/workflows/pages.yml`. Every push to `main` publishes the static site
to the `gh-pages` branch.

In the repository settings, configure GitHub Pages with:

- Source: `Deploy from a branch`
- Branch: `gh-pages`
- Folder: `/ (root)`
