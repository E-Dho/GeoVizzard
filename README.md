# GeoVizzard

GeoVizzard is a reusable static React application for exploring geolocation model prediction outputs. It is designed for ancient DNA workflows, but the app is dataset-agnostic and can load any compatible prediction table with true coordinates, predicted coordinates, and sample ages.

The frontend uses React, TypeScript, MapLibre GL, and deck.gl. It provides map layers for true locations, predicted locations, true-to-predicted arrows, uncertainty circles, selected-sample overlays, neighbour links, and a KDE-style heatmap.

## Features

- Load compatible prediction datasets from the browser
- Validate required schema columns with readable errors
- Configure column mappings for datasets with different column names
- Filter by time, group, sequencing type, uncertainty, prediction error, alpha precision, coordinates, and free-text search
- Fade older samples with configurable temporal alpha settings
- Toggle and style true locations, predicted locations, arrows, uncertainty circles, and heatmaps
- Inspect selected samples and neighbour metadata when available
- Export filtered samples and app settings
- Build as a static website with no backend requirement

## Requirements

- Node.js 18 or newer
- npm

## Install

```bash
cd app
npm install
```

## Run Locally

```bash
npm run dev
```

Vite will print a local development URL in the terminal.

## Build

```bash
npm run build
```

The production build is written to:

```text
app/dist
```

The built app can be deployed as a static website.

## Data Loading

GeoVizzard first tries to load:

```text
app/public/data/default.csv
```

Users can also load a dataset from the control panel. CSV, TSV, and TXT files are supported. Parquet files are recognized, but browser-side Parquet parsing is not enabled in this version. The loading code is isolated in:

```text
app/src/data/loadDataset.ts
```

This makes it straightforward to add a browser-compatible Parquet reader such as `hyparquet`, `parquet-wasm`, or Arrow tooling later without changing the app state or layer code.

## Required Schema

Required columns:

```text
sample_id
true_lat
true_lon
pred_lat
pred_lon
age_bp
```

Recommended optional columns:

```text
error_km
sigma_final
alpha_precision
group
sequencing_type
locality_id
mu_knn_lat
mu_knn_lon
sigma_knn_corrected
mu_mlp_lat
mu_mlp_lon
sigma_mlp
neighbor_ids
neighbor_lats
neighbor_lons
neighbor_distances
```

Neighbour columns may be JSON arrays, for example:

```json
["N1", "N2"]
```

They may also be delimiter-separated strings using `|`, `;`, or `,`.

## Column Mapping

Datasets do not need to use the exact internal column names. Edit the column mapping JSON in the app before loading a file.

Example:

```json
{
  "sample_id": "sample_id",
  "true_lat": "true_lat",
  "true_lon": "true_lon",
  "pred_lat": "pred_lat",
  "pred_lon": "pred_lon",
  "age_bp": "age_bp",
  "group": "group",
  "sequencing_type": "sequencing_type",
  "sigma_final": "sigma_final",
  "alpha_precision": "alpha_precision"
}
```

If required mapped columns are missing, GeoVizzard shows a validation error and explains which mappings are missing.

## Dataset-Agnostic Behavior

After loading a dataset, GeoVizzard infers:

- minimum and maximum `age_bp`
- available discrete sample ages for slider snapping
- available groups
- available sequencing types
- coordinate extents
- available optional uncertainty, error, and alpha fields

The time slider is clamped to the loaded data range. The visible time window is clipped to available ages, and temporal fading can keep older samples visible with configurable alpha decay.

## Map Layers

GeoVizzard includes:

- true location points
- predicted location points
- true-to-predicted arrows
- uncertainty circles based on `sigma_final`
- heatmap/KDE surface based on the current filtered sample set
- selected-sample highlighting
- optional neighbour points and neighbour links

All scientific layers are rendered with deck.gl and can be toggled from the control panel.

## Exports

The control panel can export:

- current filtered samples as CSV
- current app settings as JSON
- current map canvas as PNG when the browser allows canvas export

Settings JSON includes filters, time window, fade settings, layer settings, map view, and schema mapping.

## Static Deployment

After running:

```bash
npm run build
```

deploy the contents of `app/dist` to any static hosting provider.
