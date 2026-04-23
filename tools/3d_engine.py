import os
import sys
import subprocess
import json
import tempfile

# تأكد من تثبيت مكتبة trimesh: pip install trimesh
try:
    import trimesh
except ImportError:
    print("Installing trimesh...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "trimesh"])
    import trimesh

# ==========================================
# 1. كود بلندر (سيتم كتابته في ملف مؤقت أثناء التشغيل)
# ==========================================
BLENDER_REPAIR_CODE = """
import bpy
import bmesh
import sys
import json

def repair(input_p, output_p):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    if input_p.lower().endswith(".stl"):
        bpy.ops.import_mesh.stl(filepath=input_p)
    else:
        bpy.ops.import_scene.obj(filepath=input_p)

    obj = bpy.context.active_object
    if obj is None:
        return {"status": "error", "message": "Failed to import model"}
    
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # Scale dimensions to fit within 200mm (20cm) for proper slicer interpretation
    dims = obj.dimensions
    max_dim = max(dims.x, dims.y, dims.z)
    max_allowed = 200.0  # 200mm = 20cm
    
    if max_dim > max_allowed:
        scale_factor = max_allowed / max_dim
        obj.scale = (scale_factor, scale_factor, scale_factor)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # High-Fidelity Voxel Remesh
    dims = obj.dimensions
    voxel_res = max(0.05, max(dims) * 0.001) # دقة 0.1%

    remesh = obj.modifiers.new(name="Fix", type='REMESH')
    remesh.mode = 'VOXEL'
    remesh.voxel_size = voxel_res
    remesh.adaptivity = 0.0
    bpy.ops.object.modifier_apply(modifier=remesh.name)

    # Optimize (Decimate)
    decimate = obj.modifiers.new(name="Opt", type='DECIMATE')
    decimate.ratio = 0.5
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    
    # Recalculate normals to ensure proper orientation
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')

    bpy.ops.export_mesh.stl(
        filepath=output_p, 
        use_selection=True,
        ascii=False,
        use_mesh_modifiers=True,
        global_scale=1.0
    )
    
    # Get final dimensions after scaling
    final_dims = obj.dimensions
    return {
        "status": "success", 
        "dims": [final_dims.x, final_dims.y, final_dims.z],
        "scaled": max_dim > max_allowed
    }

if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:]
    res = repair(args[0], args[1])
    print(f"RESULT_START{json.dumps(res)}RESULT_END")
"""

# ==========================================
# 2. وظائف التحليل والإدارة (Main Pipeline)
# ==========================================
def analyze_mesh(path):
    """تحليل الموديل باستخدام Trimesh"""
    mesh = trimesh.load(path)
    if isinstance(mesh, trimesh.Scene):
        mesh = mesh.dump(concatenate=True)
        
    return {
        "is_watertight": mesh.is_watertight,
        "is_manifold": mesh.is_winding_consistent,
        "area": float(mesh.area),
        "faces": len(mesh.faces),
        "printable": mesh.is_watertight
    }

def run_blender_repair(input_path, output_path):
    """إنشاء سكربت بلندر مؤقت وتشغيله"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as tf:
        tf.write(BLENDER_REPAIR_CODE)
        temp_script = tf.name

    try:
        cmd = [
            "blender", "-b", "-P", temp_script, "--",
            input_path, output_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        os.remove(temp_script) # مسح السكربت المؤقت

        if "RESULT_START" in result.stdout:
            data = result.stdout.split("RESULT_START")[1].split("RESULT_END")[0]
            return json.loads(data)
        else:
            return {"status": "error", "message": "No result from Blender script"}
    except FileNotFoundError:
        return {"status": "error", "message": "Blender not found. Please install Blender and add it to PATH"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def main(input_file):
    if not os.path.exists(input_file):
        print(f"❌ File {input_file} not found!")
        return

    print(f"🔍 Analyzing: {input_file}...")
    before = analyze_mesh(input_file)

    if before["printable"]:
        print("✅ Model is already printable. No action needed.")
        return {"status": "ready", "data": before}

    print("🛠 Repairing with Blender (High Fidelity Mode)...")
    fixed_file = os.path.splitext(input_file)[0] + "_fixed.stl"
    
    blender_res = run_blender_repair(input_file, fixed_file)
    
    if blender_res is None:
        print("❌ Blender repair returned no result. Is Blender installed?")
        return {"status": "error", "message": "Blender not found or failed to execute"}
    
    if blender_res.get("status") == "success":
        after = analyze_mesh(fixed_file)
        # حساب نسبة الفقد في التفاصيل
        loss = abs(after["area"] - before["area"]) / before["area"] * 100
        
        report = {
            "status": "repaired",
            "file": fixed_file,
            "quality_loss_percent": round(loss, 2),
            "is_printable": after["printable"],
            "stats": after
        }
        print("🎉 Repair Complete!")
        print(json.dumps(report, indent=4))
        return report
    else:
        print("❌ Repair failed.")
        return blender_res

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python 3d_engine.py model.obj")
    else:
        main(sys.argv[1])
