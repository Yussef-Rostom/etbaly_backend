# 3D Model Repair & Slicing API

REST API server for 3D model repair and G-code generation.

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
```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "3D Model API",
  "prusaslicer_configured": true,
  "setup_instructions": "See tools/SETUP_INSTRUCTIONS.md if prusaslicer_configured is false"
}
```

### 2. Repair Model
Repair STL/OBJ files from tmp/3d directory.

```bash
curl -X POST http://localhost:8080/api/repair \
  -H "Content-Type: application/json" \
  -d '{"filename": "model.stl"}'
```

**Request Body (JSON):**
- `filename` (required): Name of the file in tmp/3d directory

**Response:**
```json
{
  "status": "repaired",
  "original_file": "model.stl",
  "repaired_file": "model_fixed.stl",
  "quality_loss_percent": 2.5,
  "stats": {
    "vertices": 1500,
    "faces": 3000
  }
}
```

### 3. Slice Model
Convert STL from tmp/3d to G-code in tmp/gcode.

```bash
curl -X POST http://localhost:8080/api/slice \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "model.stl",
    "output_filename": "output",
    "preset": "normal",
    "material": "pla",
    "scale": 100
  }'
```

**Request Body (JSON):**
- `filename` (required): Name of the STL file in tmp/3d directory
- `output_filename` (required): Name for the output G-code file (without .gcode extension)
- `preset` (optional): heavy/normal/draft (default: normal)
- `material` (optional): pla/abs/petg/pla+ (default: pla)
- `scale` (optional): scale factor (default: 100)

**Response:**
```json
{
  "status": "success",
  "original_file": "model.stl",
  "gcode_file": "output.gcode",
  "gcode_path": "/path/to/tmp/gcode/output.gcode",
  "preset": "normal",
  "material": "pla",
  "scale": 100
}
```

### 4. Repair and Slice (Combined)
Repair then slice in one request.

```bash
curl -X POST http://localhost:8080/api/repair-and-slice \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "model.stl",
    "output_filename": "output",
    "preset": "normal",
    "material": "pla",
    "scale": 100
  }'
```

**Request Body (JSON):**
- `filename` (required): Name of the STL file in tmp/3d directory
- `output_filename` (required): Name for the output G-code file (without .gcode extension)
- `preset` (optional): heavy/normal/draft (default: normal)
- `material` (optional): pla/abs/petg/pla+ (default: pla)
- `scale` (optional): scale factor (default: 100)

**Response:**
```json
{
  "status": "success",
  "repair_status": "repaired",
  "quality_loss_percent": 2.5,
  "gcode_file": "output.gcode",
  "gcode_path": "/path/to/tmp/gcode/output.gcode",
  "preset": "normal",
  "material": "pla"
}
```

## Directory Structure

The API uses a structured tmp directory:

```
tmp/
├── 3d/          # Input STL/OBJ files
├── image/       # Image files (for other services)
└── gcode/       # Output G-code files
```

## Example Usage (Python)

```python
import requests
import json

# Repair a model
response = requests.post(
    'http://localhost:8080/api/repair',
    headers={'Content-Type': 'application/json'},
    data=json.dumps({'filename': 'model.stl'})
)
result = response.json()
print(f"Repaired: {result['repaired_file']}")

# Slice a model
response = requests.post(
    'http://localhost:8080/api/slice',
    headers={'Content-Type': 'application/json'},
    data=json.dumps({
        'filename': 'model.stl',
        'output_filename': 'my_print',
        'material': 'pla',
        'preset': 'normal'
    })
)
result = response.json()
print(f"G-code saved to: {result['gcode_path']}")

# Repair and slice in one call
response = requests.post(
    'http://localhost:8080/api/repair-and-slice',
    headers={'Content-Type': 'application/json'},
    data=json.dumps({
        'filename': 'broken_model.stl',
        'output_filename': 'fixed_print',
        'material': 'petg',
        'scale': 95
    })
)
result = response.json()
print(f"G-code ready: {result['gcode_file']}")
```

## Example Usage (JavaScript)

```javascript
// Repair a model
const repairResponse = await fetch('http://localhost:8080/api/repair', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ filename: 'model.stl' })
});
const repairResult = await repairResponse.json();
console.log('Repaired:', repairResult.repaired_file);

// Slice a model
const sliceResponse = await fetch('http://localhost:8080/api/slice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filename: 'model.stl',
    output_filename: 'my_print',
    material: 'pla',
    preset: 'normal'
  })
});
const sliceResult = await sliceResponse.json();
console.log('G-code ready:', sliceResult.gcode_file);
```

## Notes

- Maximum file size: 200MB
- Supported formats: STL, OBJ
- Files must be placed in tmp/3d directory before calling the API
- G-code output is saved to tmp/gcode directory
- All dimensions are automatically scaled to fit within 200mm (20cm)
- The server processes requests synchronously (one task at a time)
