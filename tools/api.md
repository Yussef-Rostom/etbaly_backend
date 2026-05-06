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

You can also use the provided start script:

```bash
# Linux/Mac
chmod +x start_server.sh
./start_server.sh

# Windows
start_server.bat
```

Server will start on `http://0.0.0.0:8080`

## API Endpoints

### 1. Health Check
Convert STL from tmp/3d to G-code in tmp/gcode.

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
- `filename` (required): Name of the STL file in tmp/3d directory
- `output_filename` (required): Name for the output G-code file (without .gcode extension)
- `preset` (optional): heavy/normal/draft (default: normal)
  - `heavy`: High quality/strength (0.1mm layer height, 40% infill, 4 perimeters)
  - `normal`: Balanced quality (0.2mm layer height, 20% infill, 3 perimeters)
  - `draft`: Fast/light (0.3mm layer height, 10% infill, 2 perimeters)
- `material` (optional): pla/abs/petg/tpu/resin (default: pla)
- `color` (optional): Material color name (e.g., white, black, red, blue, gold) (default: white)
- `scale` (optional): Scale percentage 1-1000 (default: 100)
  - **Note**: If scale exceeds 1000%, it will be automatically capped to 1000% with a warning
  - **Note**: If model is too large at requested scale, it will be automatically scaled down to fit

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
  "weight": 45.5,
  "dimensions": {
    "width": 100,
    "height": 50,
    "depth": 75
  },
  "print_time": 180
}
```

**Response Fields:**
- `status`: "success" if slicing completed
- `scale`: The scale requested by the user
- `actual_scale`: The actual scale used for slicing (may differ if auto-scaled)
- `scale_adjusted`: Boolean indicating if the model was auto-scaled to fit the print bed
- `warning`: (optional) Message explaining why the model was auto-scaled
- `weight`: Estimated filament weight in grams
- `dimensions`: Model dimensions in mm (width, height, depth)
- `print_time`: Estimated print time in minutes

**Auto-Scaling & Auto-Capping:**

The server provides two automatic scale adjustments:

1. **Auto-Capping**: If requested scale > 1000%, automatically caps to 1000%
2. **Auto-Scaling**: If model too large for print bed, automatically scales down

Both adjustments include:
- `scale_adjusted: true`
- `actual_scale`: The scale that was actually used
- `warning`: A message explaining the adjustment

Example with auto-capping:
```json
{
  "status": "success",
  "scale": 1500,
  "actual_scale": 1000,
  "scale_adjusted": true,
  "warning": "Requested scale 1500.00% (15.00x) exceeds maximum. Automatically using maximum scale 1000.00% (10.00x).",
  ...
}
```

Example with auto-scaling:
```json
{
  "status": "success",
  "scale": 500,
  "actual_scale": 50,
  "scale_adjusted": true,
  "warning": "Model was automatically scaled down from 500.0% (5.00x) to 50.0% (0.50x) to fit the print bed.",
  ...
}
```

## Directory Structure

The API uses a structured tmp directory:

```
tmp/
├── 3d/          # Input STL files
└── gcode/       # Output G-code files
```

## Example Usage (Python)

```python
import requests
import json

# Slice a model
response = requests.post(
    'http://localhost:8080/api/slice',
    headers={'Content-Type': 'application/json'},
    data=json.dumps({
        'filename': 'model.stl',
        'output_filename': 'my_print',
        'material': 'pla',
        'color': 'white',
        'preset': 'normal'
    })
)
result = response.json()
print(f"G-code saved to: {result['gcode_path']}")
print(f"Weight: {result['weight']}g, Print time: {result['print_time']} minutes")
```

## Example Usage (JavaScript)

```javascript
// Slice a model
const sliceResponse = await fetch('http://localhost:8080/api/slice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filename: 'model.stl',
    output_filename: 'my_print',
    material: 'pla',
    color: 'white',
    preset: 'normal'
  })
});
const sliceResult = await sliceResponse.json();
console.log('G-code ready:', sliceResult.gcode_file);
console.log('Weight:', sliceResult.weight, 'g');
console.log('Print time:', sliceResult.print_time, 'minutes');
```

## Notes

- Maximum file size: 200MB
- Supported formats: STL
- Files must be placed in tmp/3d directory before calling the API
- G-code output is saved to tmp/gcode directory
- All dimensions are automatically scaled to fit within 200mm (20cm)
- The server processes requests synchronously (one task at a time)
- Weight, dimensions, and print time are extracted from G-code metadata

## Error Handling

The API returns different HTTP status codes based on the error type:

### 400 Bad Request - Invalid Scale
Returned when the scale factor is below the minimum (1%).

**Note**: Scales above 1000% are automatically capped to 1000% with a warning, not rejected.

**Scale Too Small:**
```json
{
  "error": "Scale is too small. The minimum scale is 1% but you provided 0.5%. Please use a scale between 1% and 1000%.",
  "error_type": "invalid_scale",
  "min_scale": 1,
  "max_scale": 1000,
  "provided_scale": 0.5
}
```

### 400 Bad Request - Invalid Model
Returned when the 3D model file has invalid geometry and cannot be sliced.

```json
{
  "error": "The 3D model file has invalid geometry and cannot be sliced. This usually means the file is corrupted or has structural issues. Please try re-exporting the model from your 3D design software, or use a different STL file.",
  "error_type": "invalid_model"
}
```

**Common causes:**
- Corrupted STL file
- Non-manifold geometry (holes, gaps, or overlapping faces)
- Invalid mesh structure
- File exported incorrectly from 3D software

**Solutions:**
- Re-export the model from your 3D design software
- Use mesh repair tools (e.g., Meshmixer, Netfabb)
- Verify the model opens correctly in a 3D viewer
- Try a different STL file

### 500 Internal Server Error - Slicing Failed
Returned when slicing fails due to server issues.

```json
{
  "error": "Error message",
  "error_type": "slicing_failed"
}
```
