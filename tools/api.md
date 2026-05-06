# 3D Model Slicing API

REST API server for G-code generation from STL files.

## Installation

### Option 1: Using Virtual Environment (Recommended)

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Option 2: Global Installation

```bash
pip install -r requirements.txt
```

## PrusaSlicer Setup

The API requires PrusaSlicer to be installed and accessible. The server will automatically detect:
- Flatpak installation: `com.prusa3d.PrusaSlicer`
- Native installations in common locations
- PrusaSlicer in system PATH

### Flatpak Installation (Recommended for Linux)

```bash
flatpak install flathub com.prusa3d.PrusaSlicer
```

**Note**: PrusaSlicer will use its built-in default settings for slicing. No configuration wizard is required.

## Running the Server

### With Virtual Environment

```bash
# Activate virtual environment first
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Run server
python server.py
```

### Quick Start Script

```bash
# Linux/Mac
chmod +x start_server.sh
./start_server.sh
```

Server will start on `http://0.0.0.0:8080`

---

## API Endpoints

### 1. Health Check

`GET /health`

Returns server status and whether PrusaSlicer is configured.

```bash
curl http://localhost:8080/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "3D Slicing API",
  "prusaslicer_configured": true,
  "prusaslicer_path": "/path/to/prusa-slicer"
}
```

If PrusaSlicer is not found, `prusaslicer_configured` will be `false` and `prusaslicer_path` will be `null`.

---

### 2. Slice STL

`POST /api/slice`

Slices an STL file from `tmp/3d` and writes G-code to `tmp/gcode`.

```bash
curl -X POST http://localhost:8080/api/slice \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "model.stl",
    "output_filename": "output",
    "preset": "normal",
    "material": "pla",
    "color": "white",
    "scale": 100
  }'
```

**Request Body (JSON):**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `filename` | string | yes | — | Name of the STL file in `tmp/3d` |
| `output_filename` | string | yes | — | Output G-code filename (without `.gcode`) |
| `preset` | string | no | `normal` | Print quality preset: `heavy`, `normal`, `draft` |
| `material` | string | no | `pla` | Material type: `pla`, `abs`, `petg`, `pla+` |
| `color` | string | no | `white` | Material color name (e.g. `white`, `black`, `red`) |
| `scale` | number | no | `100` | Scale percentage, 1–1000 |

**Presets:**

| Preset | Layer Height | Infill | Perimeters | Use Case |
|---|---|---|---|---|
| `heavy` | 0.1 mm | 40% | 4 | High quality / strong parts |
| `normal` | 0.2 mm | 20% | 3 | Balanced quality and speed |
| `draft` | 0.3 mm | 10% | 2 | Fast / lightweight prints |

**Response:**
```json
{
  "status": "success",
  "original_file": "model.stl",
  "gcode_file": "output.gcode",
  "gcode_path": "/path/to/tmp/gcode/output.gcode",
  "preset": "normal",
  "material": "pla",
  "color": "white",
  "scale": 100,
  "actual_scale": 100,
  "scale_adjusted": false,
  "scale_was_capped": false,
  "weight": 9.0,
  "dimensions": {
    "width": 28.83,
    "height": 48.4,
    "depth": 35.84
  },
  "print_time": 34
}
```

**Response Fields:**

| Field | Type | Description |
|---|---|---|
| `status` | string | `"success"` when slicing completed |
| `original_file` | string | Input STL filename |
| `gcode_file` | string | Output G-code filename |
| `gcode_path` | string | Absolute path to the G-code file |
| `preset` | string | Preset used |
| `material` | string | Material used |
| `color` | string | Color used |
| `scale` | number | Scale requested by the caller (%) |
| `actual_scale` | number | Scale actually used (may differ if auto-adjusted) |
| `scale_adjusted` | boolean | `true` if model was auto-scaled to fit the print bed |
| `scale_was_capped` | boolean | `true` if requested scale exceeded 1000% and was capped |
| `weight` | number | Estimated filament weight in grams (parsed from G-code) |
| `dimensions` | object | Model dimensions in mm: `width`, `height`, `depth` |
| `print_time` | number | Estimated print time in minutes (parsed from G-code) |
| `warning` | string | (optional) Explanation when scale was auto-adjusted or capped |

---

## Auto-Scaling Behaviour

The server provides two automatic scale adjustments:

1. **Auto-Capping**: If `scale` > 1000%, it is automatically capped to 1000%.
2. **Auto-Scaling**: If the model doesn't fit the print bed at the requested scale, it is progressively scaled down until it fits (trying 50%, 25%, 10%, 5%, 1% of the original scale).

Both cases set `scale_adjusted: true`, populate `actual_scale` with the scale used, and include a `warning` message.

**Example — scale capped:**
```json
{
  "status": "success",
  "scale": 1500,
  "actual_scale": 1000,
  "scale_adjusted": true,
  "scale_was_capped": true,
  "warning": "Requested scale 1500.00% (15.00x) exceeds maximum. Automatically using maximum scale 1000.00% (10.00x)."
}
```

**Example — auto-scaled to fit bed:**
```json
{
  "status": "success",
  "scale": 500,
  "actual_scale": 50,
  "scale_adjusted": true,
  "scale_was_capped": false,
  "warning": "Model was automatically scaled down from 500.00% (5.00x) to 50.00% (0.5000x) to fit the print bed."
}
```

---

## Directory Structure

```
tmp/
├── 3d/       # Input STL files
└── gcode/    # Output G-code files
```

Files must be placed in `tmp/3d` before calling `/api/slice`. Output G-code is written to `tmp/gcode`.

---

## Example Usage

### Python

```python
import requests

response = requests.post(
    'http://localhost:8080/api/slice',
    json={
        'filename': 'model.stl',
        'output_filename': 'my_print',
        'material': 'pla',
        'color': 'white',
        'preset': 'normal',
        'scale': 100
    }
)
result = response.json()
print(f"G-code: {result['gcode_path']}")
print(f"Weight: {result['weight']}g")
print(f"Print time: {result['print_time']} minutes")
print(f"Dimensions: {result['dimensions']}")
```

### JavaScript

```javascript
const res = await fetch('http://localhost:8080/api/slice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filename: 'model.stl',
    output_filename: 'my_print',
    material: 'pla',
    color: 'white',
    preset: 'normal',
    scale: 100
  })
});
const result = await res.json();
console.log('G-code:', result.gcode_file);
console.log('Weight:', result.weight, 'g');
console.log('Print time:', result.print_time, 'minutes');
```

---

## Error Handling

### 400 — Scale Too Small

Returned when `scale` is below 1%.

```json
{
  "error": "Scale is too small. The minimum scale is 1% (0.01x) but you provided 0.5% (0.01x). Please use a scale between 1% and 1000%.",
  "error_type": "invalid_scale",
  "min_scale": 1,
  "max_scale": 1000,
  "provided_scale": 0.5
}
```

> Scales above 1000% are automatically capped, not rejected.

### 400 — Invalid Model

Returned when the STL has invalid geometry that cannot be sliced.

```json
{
  "error": "The 3D model file has invalid geometry and cannot be sliced.",
  "error_type": "invalid_model"
}
```

Common causes: corrupted file, non-manifold geometry, bad mesh export.  
Solutions: re-export from your CAD tool, or repair with Meshmixer / Netfabb.

### 404 — File Not Found

```json
{
  "error": "File not found in tmp/3d: model.stl"
}
```

### 500 — Slicing Failed

```json
{
  "error": "PrusaSlicer exited with code 1. ...",
  "error_type": "slicing_failed"
}
```

---

## Notes

- Maximum file size: 200 MB
- Supported input format: STL
- Requests are processed synchronously (one at a time)
- `weight`, `dimensions`, and `print_time` are parsed directly from PrusaSlicer's G-code output comments
