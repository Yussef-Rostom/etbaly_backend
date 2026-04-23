#!/usr/bin/env python3
"""
3D Model Repair & Slicing API Server
Provides REST endpoints for STL repair and G-code generation
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import tempfile
import shutil
from werkzeug.utils import secure_filename
import uuid

# Import our existing modules
import importlib.util
import sys

# Load 3d_engine module
spec = importlib.util.spec_from_file_location("engine_3d", "3d_engine.py")
engine_3d = importlib.util.module_from_spec(spec)
sys.modules["engine_3d"] = engine_3d
spec.loader.exec_module(engine_3d)

repair_model = engine_3d.main

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
    config_dir = os.path.expanduser('~/.var/app/com.prusa3d.PrusaSlicer/config/PrusaSlicer')
    printer_dir = os.path.join(config_dir, 'printer')
    
    prusa_configured = False
    if os.path.exists(printer_dir):
        printer_profiles = [f for f in os.listdir(printer_dir) if f.endswith('.ini')]
        prusa_configured = len(printer_profiles) > 0
    
    return jsonify({
        "status": "healthy",
        "service": "3D Model API",
        "prusaslicer_configured": prusa_configured,
        "setup_instructions": "See tools/SETUP_INSTRUCTIONS.md if prusaslicer_configured is false"
    }), 200


@app.route('/api/repair', methods=['POST'])
def repair():
    """
    Repair an STL/OBJ file from tmp/3d directory
    Parameters (JSON):
        - filename: Name of the file in tmp/3d directory
    Returns: repaired file info
    """
    data = request.get_json()
    if not data or 'filename' not in data:
        return jsonify({"error": "No filename provided"}), 400
    
    filename = secure_filename(data['filename'])
    filepath = os.path.join(app.config['TMP_3D_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({"error": f"File not found in tmp/3d: {filename}"}), 404
    
    try:
        # Repair the model
        result = repair_model(filepath)
        
        if result and result.get("status") in ["repaired", "ready"]:
            fixed_file = result.get("file", filepath)
            fixed_filename = os.path.basename(fixed_file)
            
            return jsonify({
                "status": result["status"],
                "original_file": filename,
                "repaired_file": fixed_filename,
                "stats": result.get("stats", {}),
                "quality_loss_percent": result.get("quality_loss_percent", 0)
            }), 200
        else:
            return jsonify({"error": "Repair failed", "details": result}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/slice', methods=['POST'])
def slice_model():
    """
    Slice an STL file from tmp/3d to G-code in tmp/gcode
    Parameters (JSON):
        - filename: Name of the STL file in tmp/3d directory
        - output_filename: Name for the output G-code file (without extension)
        - preset: heavy/normal/draft (default: normal)
        - material: pla/abs/petg/pla+ (default: pla)
        - scale: scale factor (default: 100)
    Returns: G-code file info
    """
    data = request.get_json()
    if not data or 'filename' not in data or 'output_filename' not in data:
        return jsonify({"error": "filename and output_filename are required"}), 400
    
    filename = secure_filename(data['filename'])
    output_filename = secure_filename(data['output_filename'])
    
    if not filename.lower().endswith('.stl'):
        return jsonify({"error": "Only STL files can be sliced"}), 400
    
    filepath = os.path.join(app.config['TMP_3D_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({"error": f"File not found in tmp/3d: {filename}"}), 404
    
    # Get parameters
    preset = data.get('preset', 'normal')
    material = data.get('material', 'pla')
    scale = float(data.get('scale', 100))
    
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
        gcode_path = slice_stl(
            stl_path=filepath,
            output_path=output_path,
            extra_args=extra_args,
            scale=scale
        )
        
        return jsonify({
            "status": "success",
            "original_file": filename,
            "gcode_file": f'{output_filename}.gcode',
            "gcode_path": output_path,
            "preset": preset,
            "material": material,
            "scale": scale
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/repair-and-slice', methods=['POST'])
def repair_and_slice():
    """
    Combined endpoint: repair then slice
    Parameters (JSON):
        - filename: Name of the STL file in tmp/3d directory
        - output_filename: Name for the output G-code file (without extension)
        - preset: heavy/normal/draft (default: normal)
        - material: pla/abs/petg/pla+ (default: pla)
        - scale: scale factor (default: 100)
    """
    data = request.get_json()
    if not data or 'filename' not in data or 'output_filename' not in data:
        return jsonify({"error": "filename and output_filename are required"}), 400
    
    filename = secure_filename(data['filename'])
    output_filename = secure_filename(data['output_filename'])
    
    filepath = os.path.join(app.config['TMP_3D_FOLDER'], filename)
    
    if not os.path.exists(filepath):
        return jsonify({"error": f"File not found in tmp/3d: {filename}"}), 404
    
    # Get parameters
    preset = data.get('preset', 'normal')
    material = data.get('material', 'pla')
    scale = float(data.get('scale', 100))
    
    # Build extra arguments for slicing
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
        # Step 1: Repair
        repair_result = repair_model(filepath)
        
        if not repair_result or repair_result.get("status") not in ["repaired", "ready"]:
            return jsonify({"error": "Repair failed", "details": repair_result}), 500
        
        # Get the repaired file path
        repaired_file = repair_result.get("file", filepath)
        
        # Step 2: Slice with basic settings
        output_path = os.path.join(app.config['TMP_GCODE_FOLDER'], f'{output_filename}.gcode')
        gcode_path = slice_stl(
            stl_path=repaired_file,
            output_path=output_path,
            extra_args=extra_args,
            scale=scale
        )
        
        return jsonify({
            "status": "success",
            "repair_status": repair_result["status"],
            "quality_loss_percent": repair_result.get("quality_loss_percent", 0),
            "gcode_file": f'{output_filename}.gcode',
            "gcode_path": output_path,
            "preset": preset,
            "material": material
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print(f"📁 3D Models folder: {TMP_3D_FOLDER}")
    print(f"📁 G-code output folder: {TMP_GCODE_FOLDER}")
    print("🚀 Starting 3D Model API Server...")
    print("📡 Available endpoints:")
    print("   GET  /health")
    print("   POST /api/repair (JSON: {filename})")
    print("   POST /api/slice (JSON: {filename, output_filename})")
    print("   POST /api/repair-and-slice (JSON: {filename, output_filename})")
    
    app.run(host='0.0.0.0', port=8080, debug=True)
