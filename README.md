# PhotoTagger

Browser-based photo tagging application for managing photo metadata and geolocation.

## Features

- **Folder Access** - Open local folders directly in the browser using File System Access API
- **Photo Viewing** - Lazy-loaded thumbnails, zoom/pan, slideshow mode, fullscreen
- **Date Tagging** - Set year, month, day for photos
- **Geotagging** - Interactive map with location search powered by OpenStreetMap
- **EXIF Writing** - Direct EXIF modification for JPEG files
- **XMP Sidecar** - Metadata support for RAW and non-JPEG formats
- **Batch Editing** - Multi-select with Cmd+click and Shift+click
- **Histogram** - RGB channel display
- **Filtering** - Filter by tagged/untagged, has location, etc.
- **Export** - Export with custom rename patterns

## Supported Formats

JPEG, PNG, GIF, WebP, BMP, TIFF, HEIC, HEIF, AVIF, RAW, CR2, NEF, ARW, DNG, ORF, RW2

## Usage

1. Open `index.html` in Chrome or Edge (requires File System Access API)
2. Click "Open Folder" to select a folder of photos
3. Select photos to view and edit metadata
4. Use the map or location search to set geolocation
5. Click "Save Changes" to write metadata

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` `→` | Navigate photos |
| `Space` | Start slideshow |
| `F` | Toggle fullscreen |
| `H` | Toggle histogram |
| `+` `-` | Zoom in/out |
| `0` | Fit to screen |
| `Cmd+A` | Select all |
| `Cmd+S` | Save changes |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `?` | Show shortcuts |
| `Esc` | Clear selection / Exit mode |

## Export Patterns

Use these variables in export filenames:

- `{original}` - Original filename without extension
- `{year}` - Year from date field
- `{month}` - Month from date field
- `{day}` - Day from date field
- `{index}` - Sequential number (0001, 0002, ...)
- `{location}` - Location search text

Example: `{year}-{month}-{day}_{original}` → `2024-03-15_IMG_1234.jpg`

## Requirements

- Chrome, Edge, or Chromium-based browser (File System Access API required)
- No server needed - runs entirely in the browser

## Libraries

- [Leaflet](https://leafletjs.com/) - Interactive maps
- [exifr](https://github.com/MikeKovaworried/exifr) - EXIF reading
- [piexifjs](https://github.com/hMatoba/piexifjs) - EXIF writing

## License

MIT
