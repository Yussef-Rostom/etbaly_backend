# 3D Model Slicing Service

Python-based REST API server for converting STL files to G-code using PrusaSlicer.

## Features

- ✅ STL to G-code conversion using PrusaSlicer
- ✅ Multiple quality presets (heavy, normal, draft)
- ✅ Material and color support
- ✅ **Auto-scaling** for models too large for print bed
- ✅ **Auto-capping** for scales > 1000%
- ✅ Scale validation (1% - 1000%)
- ✅ Automatic metadata extraction (weight, dimensions, print time)
- ✅ Comprehensive error handling
- ✅ Health check endpoint

## Quick Start

### 1. Install Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Install PrusaSlicer

**Linux (Flatpak - Recommended):**
```bash
flatpak install flathub com.prusa3d.PrusaSlicer
```

**Other platforms:** Download from [PrusaSlicer website](https://www.prusa3d.com/page/prusaslicer_424/)

### 3. Start Server

```bash
# Using start script
./start_server.sh

# Or manually
source venv/bin/activate
python server.py
```

Server runs on `http://0.0.0.0:8080`

## API Documentation

See [api.md](./api.md) for complete API reference.

### Quick Example

```bash
# Health check
curl http://localhost:8080/health

# Slice a model
curl -X POST http://localhost:8080/api/slice \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "model.stl",
    "output_filename": "output",
    "scale": 100,
    "preset": "normal",
    "material": "pla"
  }'
```

## Auto-Scaling Feature

When a model is too large to fit the print bed at the requested scale, the system automatically scales it down:

1. Tries requested scale first
2. If too large, tries: 50%, 25%, 10%, 5%, 1% of requested scale
3. Uses first scale that fits
4. Returns actual scale used with warning message

**Example Response:**
```json
{
  "status": "success",
  "scale": 500,
  "actual_scale": 50,
  "scale_adjusted": true,
  "warning": "Model was automatically scaled down from 500.0% (5.00x) to 50.0% (0.50x) to fit the print bed.",
  "gcode_file": "output.gcode",
  "weight": 25.0,
  "dimensions": {...},
  "print_time": 120
}
```

## Scale Validation

- **Minimum scale**: 1% (0.01x)
- **Maximum scale**: 1000% (10.0x)
- **Auto-capping**: Scales > 1000% automatically capped to 1000%
- **Auto-scaling**: Models too large automatically scaled down
- Clear warning messages for all adjustments

## Quality Presets

| Preset | Layer Height | Infill | Perimeters | Use Case |
|--------|-------------|--------|------------|----------|
| `heavy` | 0.1mm | 40% | 4 | High quality/strength |
| `normal` | 0.2mm | 20% | 3 | Balanced (default) |
| `draft` | 0.3mm | 10% | 2 | Fast/light prints |

## Supported Materials

- PLA (default)
- ABS
- PETG
- TPU
- RESIN

## Directory Structure

```
tools/
├── server.py              # Flask API server
├── slicer.py             # PrusaSlicer wrapper
├── api.md                # API documentation
├── requirements.txt      # Python dependencies
├── start_server.sh       # Start script
└── venv/                # Virtual environment

../tmp/
├── 3d/                  # Input STL files
└── gcode/               # Output G-code files
```

## Error Handling

The API provides detailed error messages for:

- **Invalid scale**: Scale outside 1% - 1000% range
- **Invalid model**: Corrupted or invalid geometry
- **Model too large**: Even at 1% scale
- **File not found**: STL file doesn't exist
- **Slicing failed**: PrusaSlicer errors

See [api.md](./api.md) for complete error documentation.

## Integration with Backend

The backend worker service (`backend/src/workers/slicing/`) calls this API to slice models:

1. Backend downloads STL from Google Drive
2. Saves to `tmp/3d/` directory
3. Calls `POST /api/slice` with filename and parameters
4. Receives G-code path and metadata
5. Updates SlicingJob with results

## Configuration

Environment variables (set in backend `.env`):

```bash
WORKER_SERVER_HOST=localhost
WORKER_SERVER_PORT=8080
```

## Troubleshooting

### PrusaSlicer not found
```bash
# Check if PrusaSlicer is installed
flatpak list | grep PrusaSlicer

# Install if missing
flatpak install flathub com.prusa3d.PrusaSlicer
```

### Server won't start
```bash
# Check if port 8080 is in use
lsof -i :8080

# Kill existing process
pkill -f "python.*server.py"
```

### Virtual environment issues
```bash
# Recreate virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Performance

- **Slicing time**: 10-60 seconds per model (depends on complexity)
- **Concurrency**: Processes one request at a time (CPU-intensive)
- **File size limit**: 200MB per STL file
- **Timeout**: None (slicing can take time)

## Security

- File uploads validated (STL only)
- Filenames sanitized with `secure_filename()`
- Scale validation prevents resource exhaustion
- No arbitrary code execution

## License

Part of the Etbaly 3D Printing Platform.

## Support

For issues or questions:
1. Check [api.md](./api.md) for API details
2. Check backend logs: `pm2 logs etbaly_backend`
3. Check server logs: `tail -f server.log` (if logging enabled)
4. Run health check: `curl http://localhost:8080/health`
