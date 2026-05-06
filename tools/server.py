#!/usr/bin/env python3
"""
3D Model Slicing API Server
Provides REST endpoints for G-code generation
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
from werkzeug.utils import secure_filename
import uuid

from slicer import slice_stl

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration - Use structured tmp directories
TMP_3D_FOLDER = os.path.join(os.path.dirname(__file__), '../tmp/3d')
TMP_GCODE_FOLDER = os.path.join(os.path.dirname(__file__), '../tmp/gcode')
ALLOWED_EXTENSIONS = {'stl', 'obj'}
MAX_FILE_SIZE = 200 * 1024 * 1024  # 200MB

# Ensure directories exist
os.makedirs(TMP_3D_FOLDER, exist_ok=True)
os.makedirs(TMP_GCODE_FOLDER, exist_ok=True)

app.config['TMP_3D_FOLDER'] = TMP_3D_FOLDER
app.config['TMP_GCODE_FOLDER'] = TMP_GCODE_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    # Check if PrusaSlicer is configured
    import os.path
    
    prusa_configured = False
    prusa_path = None
    try:
        from slicer import find_prusa_slicer
        prusa_path = find_prusa_slicer()
        # Check if it's a flatpak command or a file path
        if prusa_path.startswith("flatpak run"):
            # Verify flatpak is installed
            import subprocess
            result = subprocess.run(
                ["flatpak", "list", "--app"],
                capture_output=True,
                text=True,
                timeout=5
            )
            prusa_configured = "com.prusa3d.PrusaSlicer" in result.stdout
        else:
            prusa_configured = os.path.isfile(prusa_path)
    except Exception as e:
        print(f"[WARN] PrusaSlicer check failed: {e}")
        pass
    
    return jsonify({
        "status": "healthy",
        "service": "3D Slicing API",
        "prusaslicer_configured": prusa_configured,
        "prusaslicer_path": prusa_path if prusa_configured else None,
        "setup_instructions": "See tools/SETUP_INSTRUCTIONS.md if prusaslicer_configured is false"
    }), 200


@app.route('/api/slice', methods=['POST'])
def slice_model():
    """
    Slice an STL file from tmp/3d to G-code in tmp/gcode
    Parameters (JSON):
        - filename: Name of the STL file in tmp/3d directory
        - output_filename: Name for the output G-code file (without extension)
        - preset: heavy/normal/draft (default: normal)
        - material: pla/abs/petg/tpu/resin (default: pla)
        - color: Material color name (default: white)
        - scale: Scale percentage 1-1000 (default: 100)
    Returns: G-code file info with weight, dimensions, and print time
    """
    data = request.get_json()
    if not data or 'filename' not in data or 'output_filename' not in data:
        return jsonify({"error": "filename and output_filename are required"}), 400
    
    filename = secure_filename(data['filename'])
    output_filename = secure_filename(data['output_filename'])
    
    if not filename.lower().endswith('.stl'):
        return jsonify({"error": "Only STL files can be sliced"}), 400
    
    # Get parameters
    preset = data.get('preset', 'normal')
    material = data.get('material', 'pla').lower()
    color = data.get('color', 'white')
    scale = float(data.get('scale', 100))
    max_scale = 1000.0  # Maximum 1000% scale
    
    # Validate scale minimum only (maximum is handled by slicer with auto-capping)
    if scale < 1:
        return jsonify({
            "error": f"Scale is too small. The minimum scale is 1% (0.01x) but you provided {scale}% ({scale/100:.2f}x). Please use a scale between 1% and {max_scale}%.",
            "error_type": "invalid_scale",
            "min_scale": 1,
            "max_scale": max_scale,
            "provided_scale": scale
        }), 400
    
    # Now check if file exists
    filepath = os.path.join(app.config['TMP_3D_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({"error": f"File not found in tmp/3d: {filename}"}), 404
    
    output_path = os.path.join(app.config['TMP_GCODE_FOLDER'], f'{output_filename}.gcode')
    
    # Build extra arguments for slicing (don't rely on profiles that may not exist)
    extra_args = []
    
    # Set layer height based on preset
    if preset == 'heavy':
        extra_args += ['--layer-height', '0.1', '--fill-density', '40%', '--perimeters', '4']
    elif preset == 'draft':
        extra_args += ['--layer-height', '0.3', '--fill-density', '10%', '--perimeters', '2']
    else:  # normal
        extra_args += ['--layer-height', '0.2', '--fill-density', '20%', '--perimeters', '3']
    
    # Add support material
    extra_args += ['--support-material']
    
    try:
        # Slice the model with basic settings (no profiles required)
        result = slice_stl(
            stl_path=filepath,
            output_path=output_path,
            extra_args=extra_args,
            scale=scale,
            max_scale=max_scale
        )
        
        actual_scale = result.get('actual_scale', scale)
        scale_adjusted = actual_scale != scale
        scale_was_capped = result.get('scale_was_capped', False)
        
        response_data = {
            "status": "success",
            "original_file": filename,
            "gcode_file": f'{output_filename}.gcode',
            "gcode_path": output_path,
            "preset": preset,
            "material": material,
            "color": color,
            "scale": scale,
            "actual_scale": actual_scale,
            "scale_adjusted": scale_adjusted,
            "weight": result.get('weight'),
            "dimensions": result.get('dimensions'),
            "print_time": result.get('print_time')
        }
        
        # Add warning message if scale was capped to maximum
        if scale_was_capped:
            original_multiplier = scale / 100.0
            actual_multiplier = actual_scale / 100.0
            response_data["warning"] = (
                f"Requested scale {scale:.2f}% ({original_multiplier:.2f}x) exceeds maximum. "
                f"Automatically using maximum scale {actual_scale:.2f}% ({actual_multiplier:.2f}x)."
            )
        # Add warning message if scale was adjusted due to print bed size
        elif scale_adjusted:
            # Convert percentage to multiplier for display
            original_multiplier = scale / 100.0
            actual_multiplier = actual_scale / 100.0
            response_data["warning"] = (
                f"Model was automatically scaled down from {scale:.2f}% ({original_multiplier:.2f}x) "
                f"to {actual_scale:.2f}% ({actual_multiplier:.4f}x) to fit the print bed."
            )
        
        return jsonify(response_data), 200
        
    except ValueError as e:
        # User-friendly errors (invalid geometry, scale issues, etc.)
        error_msg = str(e)
        error_response = {
            "error": error_msg,
            "error_type": "invalid_model"
        }
        
        # Add scale info if it's a scale error
        if "scale" in error_msg.lower():
            error_response["error_type"] = "invalid_scale"
            error_response["min_scale"] = 1
            error_response["max_scale"] = max_scale
        
        return jsonify(error_response), 400
    except Exception as e:
        # Other errors
        return jsonify({
            "error": str(e),
            "error_type": "slicing_failed"
        }), 500


if __name__ == '__main__':
    print(f"📁 3D Models folder: {TMP_3D_FOLDER}")
    print(f"📁 G-code output folder: {TMP_GCODE_FOLDER}")
    print("🚀 Starting 3D Slicing API Server...")
    print("📡 Available endpoints:")
    print("   GET  /health")
    print("   POST /api/slice (JSON: {filename, output_filename, material, color, preset, scale})")
    
    app.run(host='0.0.0.0', port=8080, debug=True)
