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
analyze_mesh = engine_3d.analyze_mesh

from slicer import slice_stl

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
UPLOAD_FOLDER = tempfile.mkdtemp(prefix='3d_api_')
ALLOWED_EXTENSIONS = {'stl', 'obj'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "3D Model API"}), 200


@app.route('/api/analyze', methods=['POST'])
def analyze():
    """
    Analyze an STL/OBJ file
    Returns: mesh statistics and printability status
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Only STL and OBJ allowed"}), 400
    
    # Use provided job_id or generate new one
    job_id = request.form.get('job_id', str(uuid.uuid4()))
    job_dir = os.path.join(app.config['UPLOAD_FOLDER'], job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(job_dir, filename)
    file.save(filepath)
    
    try:
        # Analyze the mesh
        result = analyze_mesh(filepath)
        result['job_id'] = job_id
        result['filename'] = filename
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/repair', methods=['POST'])
def repair():
    """
    Repair an STL/OBJ file
    Returns: repaired file info and download link
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Only STL and OBJ allowed"}), 400
    
    # Use provided job_id or generate new one
    job_id = request.form.get('job_id', str(uuid.uuid4()))
    job_dir = os.path.join(app.config['UPLOAD_FOLDER'], job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(job_dir, filename)
    file.save(filepath)
    
    try:
        # Repair the model
        result = repair_model(filepath)
        
        if result and result.get("status") in ["repaired", "ready"]:
            fixed_file = result.get("file", filepath)
            fixed_filename = os.path.basename(fixed_file)
            
            return jsonify({
                "job_id": job_id,
                "status": result["status"],
                "original_file": filename,
                "repaired_file": fixed_filename,
                "download_url": f"/api/download/{job_id}/{fixed_filename}",
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
    Slice an STL file to G-code
    Parameters (form data):
        - file: STL file
        - job_id: (optional) your custom job ID
        - preset: heavy/normal/draft (default: normal)
        - material: pla/abs/petg/pla+ (default: pla)
        - scale: scale factor (default: 100)
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
    
    if not file.filename.lower().endswith('.stl'):
        return jsonify({"error": "Only STL files can be sliced"}), 400
    
    # Get parameters
    job_id = request.form.get('job_id', str(uuid.uuid4()))
    preset = request.form.get('preset', 'normal')
    material = request.form.get('material', 'pla')
    scale = float(request.form.get('scale', 100))
    
    # Save uploaded file
    job_dir = os.path.join(app.config['UPLOAD_FOLDER'], job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(job_dir, filename)
    file.save(filepath)
    
    output_path = os.path.join(job_dir, 'output.gcode')
    
    try:
        # Slice the model
        gcode_path = slice_stl(
            stl_path=filepath,
            output_path=output_path,
            scale=scale
        )
        
        return jsonify({
            "job_id": job_id,
            "status": "success",
            "original_file": filename,
            "gcode_file": "output.gcode",
            "download_url": f"/api/download/{job_id}/output.gcode",
            "preset": preset,
            "material": material,
            "scale": scale
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/download/<job_id>/<filename>', methods=['GET'])
def download(job_id, filename):
    """Download a processed file"""
    job_dir = os.path.join(app.config['UPLOAD_FOLDER'], job_id)
    filepath = os.path.join(job_dir, secure_filename(filename))
    
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404
    
    return send_file(filepath, as_attachment=True, download_name=filename)


@app.route('/api/repair-and-slice', methods=['POST'])
def repair_and_slice():
    """
    Combined endpoint: repair then slice
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400
    
    # Get parameters
    job_id = request.form.get('job_id', str(uuid.uuid4()))
    preset = request.form.get('preset', 'normal')
    material = request.form.get('material', 'pla')
    scale = float(request.form.get('scale', 100))
    
    # Save uploaded file
    job_dir = os.path.join(app.config['UPLOAD_FOLDER'], job_id)
    os.makedirs(job_dir, exist_ok=True)
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(job_dir, filename)
    file.save(filepath)
    
    try:
        # Step 1: Repair
        repair_result = repair_model(filepath)
        
        if not repair_result or repair_result.get("status") not in ["repaired", "ready"]:
            return jsonify({"error": "Repair failed", "details": repair_result}), 500
        
        # Get the repaired file path
        repaired_file = repair_result.get("file", filepath)
        
        # Step 2: Slice
        output_path = os.path.join(job_dir, 'output.gcode')
        gcode_path = slice_stl(
            stl_path=repaired_file,
            output_path=output_path,
            scale=scale
        )
        
        return jsonify({
            "job_id": job_id,
            "status": "success",
            "repair_status": repair_result["status"],
            "quality_loss_percent": repair_result.get("quality_loss_percent", 0),
            "gcode_file": "output.gcode",
            "download_url": f"/api/download/{job_id}/output.gcode",
            "preset": preset,
            "material": material
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/cleanup/<job_id>', methods=['DELETE'])
def cleanup(job_id):
    """Delete job files"""
    job_dir = os.path.join(app.config['UPLOAD_FOLDER'], job_id)
    
    if os.path.exists(job_dir):
        shutil.rmtree(job_dir)
        return jsonify({"status": "deleted", "job_id": job_id}), 200
    else:
        return jsonify({"error": "Job not found"}), 404


if __name__ == '__main__':
    print(f"📁 Upload folder: {UPLOAD_FOLDER}")
    print("🚀 Starting 3D Model API Server...")
    print("📡 Available endpoints:")
    print("   GET  /health")
    print("   POST /api/analyze")
    print("   POST /api/repair")
    print("   POST /api/slice")
    print("   POST /api/repair-and-slice")
    print("   GET  /api/download/<job_id>/<filename>")
    print("   DELETE /api/cleanup/<job_id>")
    
    app.run(host='0.0.0.0', port=8080, debug=True)
