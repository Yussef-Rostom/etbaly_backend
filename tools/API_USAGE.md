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

### 2. Analyze Model
Analyze STL/OBJ file for printability.

```bash
curl -X POST http://localhost:8080/api/analyze \
  -F "file=@model.stl"
```

Response:
```json
{
  "job_id": "uuid",
  "filename": "model.stl",
  "is_watertight": true,
  "is_manifold": true,
  "area": 1234.56,
  "faces": 5000,
  "printable": true
}
```

### 3. Repair Model
Repair broken STL/OBJ files.

```bash
curl -X POST http://localhost:8080/api/repair \
  -F "file=@broken_model.stl"
```

**With custom job_id (for queue systems):**
```bash
curl -X POST http://localhost:8080/api/repair \
  -F "file=@broken_model.stl" \
  -F "job_id=ORDER_12345"
```

Response:
```json
{
  "job_id": "uuid",
  "status": "repaired",
  "original_file": "broken_model.stl",
  "repaired_file": "broken_model_fixed.stl",
  "download_url": "/api/download/uuid/broken_model_fixed.stl",
  "quality_loss_percent": 2.5,
  "stats": {...}
}
```

### 4. Slice Model
Convert STL to G-code.

```bash
curl -X POST http://localhost:8080/api/slice \
  -F "file=@model.stl" \
  -F "preset=normal" \
  -F "material=pla" \
  -F "scale=100"
```

Parameters:
- `preset`: heavy/normal/draft (default: normal)
- `material`: pla/abs/petg/pla+ (default: pla)
- `scale`: scale factor (default: 100)

Response:
```json
{
  "job_id": "uuid",
  "status": "success",
  "gcode_file": "output.gcode",
  "download_url": "/api/download/uuid/output.gcode"
}
```

### 5. Repair and Slice (Combined)
Repair then slice in one request.

```bash
curl -X POST http://localhost:8080/api/repair-and-slice \
  -F "file=@broken_model.stl" \
  -F "preset=normal" \
  -F "material=pla"
```

### 6. Download File
Download processed files.

```bash
curl -O http://localhost:8080/api/download/{job_id}/{filename}
```

### 7. Cleanup
Delete job files.

```bash
curl -X DELETE http://localhost:8080/api/cleanup/{job_id}
```

## Example Usage (Python)

```python
import requests

# Repair a model with custom job_id
with open('broken_model.stl', 'rb') as f:
    response = requests.post(
        'http://localhost:8080/api/repair',
        files={'file': f},
        data={'job_id': 'ORDER_12345'}  # Use your queue system ID
    )
    result = response.json()
    print(f"Job ID: {result['job_id']}")
    print(f"Repaired: {result['download_url']}")

# Download repaired file
download_url = f"http://localhost:8080{result['download_url']}"
repaired_file = requests.get(download_url)
with open('repaired.stl', 'wb') as f:
    f.write(repaired_file.content)
```

## Example Usage (JavaScript)

```javascript
// Repair and slice
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('preset', 'normal');
formData.append('material', 'pla');

const response = await fetch('http://localhost:8080/api/repair-and-slice', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('G-code ready:', result.download_url);
```

## Notes

- Maximum file size: 100MB
- Supported formats: STL, OBJ
- Files are stored temporarily and should be cleaned up using `/api/cleanup`
- All dimensions are automatically scaled to fit within 200mm (20cm)
