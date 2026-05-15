#!/usr/bin/env python3
import subprocess
import sys
import os
import argparse
import platform
import re
import json

# ── Configuration ──────────────────────────────────────────────────────────
DEFAULT_PRINTER = "AnkerMake M5 (0.4 mm nozzle)"
DEFAULT_MATERIAL_MAP = {
    "pla": "Generic PLA @ANKER",
    "abs": "Generic ABS @ANKER",
    "petg": "Generic PETG @ANKER",
    "pla+": "Generic PLA+ @ANKER",
}
PRESETS = {
    "heavy": {"quality": "0.10 mm HIGHDETAIL (0.4 mm nozzle) @ANKER", "infill": "40%", "support": "tree", "perimeters": "4"},
    "normal": {"quality": "0.20 mm NORMAL (0.4 mm nozzle) @ANKER", "infill": "20%", "support": "normal", "perimeters": "3"},
    "draft": {"quality": "0.30 mm SUPERDRAFT (0.4 mm nozzle) @ANKER", "infill": "10%", "support": "normal", "perimeters": "2"},
}

def find_prusa_slicer():
    system = platform.system()
    
    # Check for Flatpak installation first (common on Linux)
    if system == "Linux":
        flatpak_check = subprocess.run(
            ["flatpak", "list", "--app", "--columns=application"],
            capture_output=True, text=True
        )
        if "com.prusa3d.PrusaSlicer" in flatpak_check.stdout:
            return ["flatpak", "run", "com.prusa3d.PrusaSlicer"]
    
    # Check native installations
    if system == "Windows":
        path = r"C:\Users\DELL\Downloads\PrusaSlicer-2.9.4\PrusaSlicer-2.9.4\prusa-slicer-console.exe"
    elif system == "Darwin":
        path = "/Applications/PrusaSlicer.app/Contents/MacOS/PrusaSlicer"
    else:
        path = "/usr/bin/prusa-slicer"
    
    if os.path.isfile(path): return path
    import shutil
    return shutil.which("prusa-slicer") or shutil.which("PrusaSlicer")

def parse_gcode_metadata(gcode_path):
    meta = {"weight": 0.0, "dimensions": {"width": 0, "height": 0, "depth": 0}, "print_time": 0}
    min_x, min_y, min_z = float('inf'), float('inf'), float('inf')
    max_x, max_y, max_z = float('-inf'), float('-inf'), float('-inf')
    filament_length_mm = 0.0
    
    if not os.path.exists(gcode_path): return meta

    with open(gcode_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            # Dimensions logic: Track min/max coordinates
            if line.startswith(('G0 ', 'G1 ')):
                mx, my, mz = re.search(r'X([\d.-]+)', line), re.search(r'Y([\d.-]+)', line), re.search(r'Z([\d.-]+)', line)
                if mx: val = float(mx.group(1)); min_x, max_x = min(min_x, val), max(max_x, val)
                if my: val = float(my.group(1)); min_y, max_y = min(min_y, val), max(max_y, val)
                if mz: val = float(mz.group(1)); min_z, max_z = min(min_z, val), max(max_z, val)

            # Print Time logic
            if 'estimated printing time' in line.lower():
                match = re.search(r'=\s*((?P<h>\d+)h\s*)?((?P<m>\d+)m\s*)?((?P<s>\d+)s)?', line)
                if match:
                    h, m, s = int(match.group('h') or 0), int(match.group('m') or 0), int(match.group('s') or 0)
                    meta["print_time"] = (h * 60) + m + (1 if s > 30 else 0)

            # Weight logic - try multiple formats
            if 'total filament used [g]' in line.lower():
                w = re.search(r'=\s*([\d.]+)', line)
                if w and float(w.group(1)) > 0:
                    meta["weight"] = round(float(w.group(1)), 2)
            elif 'filament used [g]' in line.lower() and meta["weight"] == 0:
                w = re.search(r'=\s*([\d.]+)', line)
                if w and float(w.group(1)) > 0:
                    meta["weight"] = round(float(w.group(1)), 2)
            elif 'filament used [mm]' in line.lower():
                # Store filament length for fallback calculation
                length_match = re.search(r'=\s*([\d.]+)', line)
                if length_match:
                    filament_length_mm = float(length_match.group(1))
            elif 'filament used [cm3]' in line.lower() and meta["weight"] == 0:
                v = re.search(r'=\s*([\d.]+)', line)
                if v and float(v.group(1)) > 0:
                    meta["weight"] = round(float(v.group(1)) * 1.24, 2)  # PLA density

    # Fallback: Calculate weight from filament length if weight is still 0
    if meta["weight"] == 0 and filament_length_mm > 0:
        # Formula: weight = π × r² × length × density
        # For 1.75mm filament: r = 0.875mm = 0.0875cm
        # PLA density = 1.24 g/cm³
        radius_cm = 0.0875
        length_cm = filament_length_mm / 10.0
        volume_cm3 = 3.14159 * (radius_cm ** 2) * length_cm
        meta["weight"] = round(volume_cm3 * 1.24, 2)

    if max_x != float('-inf'):
        meta["dimensions"] = {
            "width": round(max_x - min_x, 2),
            "depth": round(max_y - min_y, 2),
            "height": round(max_z - min_z, 2)
        }
    return meta

def slice_stl(stl_path, output_path, extra_args=None, scale=100.0, max_scale=1000.0):
    """
    Slice an STL file to G-code using PrusaSlicer.
    
    Args:
        stl_path: Path to input STL file
        output_path: Path for output G-code file
        extra_args: List of additional PrusaSlicer arguments
        scale: Scale percentage (1-1000)
        max_scale: Maximum allowed scale percentage
    
    Returns:
        dict with keys: weight, dimensions, print_time, actual_scale, scale_was_capped
    """
    if extra_args is None:
        extra_args = []
    
    # Cap scale to maximum if needed
    scale_was_capped = False
    if scale > max_scale:
        scale_was_capped = True
        scale = max_scale
    
    slicer_bin = find_prusa_slicer()
    if not slicer_bin:
        raise RuntimeError("PrusaSlicer not found")
    
    # Scale: Treat values >= 1 as percentages (e.g. 100 = 1.0x)
    scale_multiplier = scale / 100.0
    
    # Build Command
    # slicer_bin can be a list (for Flatpak) or a string (for native)
    if isinstance(slicer_bin, list):
        cmd = slicer_bin + ["--export-gcode"]
    else:
        cmd = [slicer_bin, "--export-gcode"]
    
    cmd += [
        "--output", output_path,
        "--scale", str(scale_multiplier),
        stl_path
    ]
    
    # Add extra arguments (layer height, infill, etc.)
    cmd += extra_args
    
    # Execute
    process = subprocess.run(cmd, capture_output=True, text=True)
    
    if process.returncode != 0:
        error_msg = process.stderr if process.stderr else "PrusaSlicer failed with no error message"
        raise RuntimeError(error_msg)
    
    # Check if gcode file was actually created
    if not os.path.exists(output_path):
        raise RuntimeError(f"PrusaSlicer finished but G-code file not found at: {output_path}")
    
    # Parse metadata
    final_meta = parse_gcode_metadata(output_path)
    
    # Validate that we have weight - fail if not
    if final_meta["weight"] <= 0:
        raise ValueError("Failed to parse weight from G-code. Weight is required for pricing.")
    
    return {
        "weight": final_meta["weight"],
        "dimensions": final_meta["dimensions"],
        "print_time": final_meta["print_time"],
        "actual_scale": scale,
        "scale_was_capped": scale_was_capped
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("stl", help="Path to input STL")
    parser.add_argument("--output", help="Optional output path")
    parser.add_argument("--preset", choices=["heavy", "normal", "draft"], default="normal")
    parser.add_argument("--material", choices=["pla", "abs", "petg", "pla+"], default="pla")
    parser.add_argument("--scale", type=float, default=100.0)
    args = parser.parse_args()

    # Path Handling
    stl_full_path = os.path.abspath(args.stl)
    if args.output:
        gcode_out = os.path.abspath(args.output)
    else:
        gcode_out = os.path.splitext(stl_full_path)[0] + ".gcode"

    slicer_bin = find_prusa_slicer()
    if not slicer_bin:
        print(json.dumps({"status": "error", "message": "PrusaSlicer not found"}))
        sys.exit(1)
    
    preset_cfg = PRESETS[args.preset]
    
    # Scale: Treat values >= 1 as percentages (e.g. 100 = 1.0x)
    scale_multiplier = args.scale / 100.0

    # Build Command
    # slicer_bin can be a list (for Flatpak) or a string (for native)
    if isinstance(slicer_bin, list):
        cmd = slicer_bin + ["--export-gcode"]
    else:
        cmd = [slicer_bin, "--export-gcode"]
    
    cmd += [
        "--output", gcode_out,
        "--fill-density", preset_cfg["infill"],
        "--perimeters", preset_cfg["perimeters"],
        "--scale", str(scale_multiplier),
        stl_full_path
    ]
    
    # Add layer height based on preset
    if args.preset == "heavy":
        cmd += ["--layer-height", "0.1"]
    elif args.preset == "normal":
        cmd += ["--layer-height", "0.2"]
    elif args.preset == "draft":
        cmd += ["--layer-height", "0.3"]

    # Supports
    if preset_cfg["support"] != "none":
        cmd.append("--support-material")
        if preset_cfg["support"] == "tree":
            cmd += ["--support-material-style", "tree"]

    # Execute
    process = subprocess.run(cmd, capture_output=True, text=True)
    
    if process.returncode != 0:
        error_msg = process.stderr if process.stderr else "PrusaSlicer failed with no error message"
        print(json.dumps({"status": "error", "message": error_msg}))
        sys.exit(1)
    
    # Check if gcode file was actually created
    if not os.path.exists(gcode_out):
        print(json.dumps({
            "status": "error",
            "message": f"PrusaSlicer finished but G-code file not found at: {gcode_out}"
        }))
        sys.exit(1)

    # Parse and Respond
    final_meta = parse_gcode_metadata(gcode_out)
    
    # Validate that we have weight - fail if not
    if final_meta["weight"] <= 0:
        print(json.dumps({
            "status": "error",
            "message": "Failed to parse weight from G-code. Weight is required for pricing."
        }))
        sys.exit(1)
    
    response = {
        "gcode_path": gcode_out,
        "weight": final_meta["weight"],
        "dimensions": final_meta["dimensions"],
        "print_time": final_meta["print_time"],
        "price": round((final_meta["weight"] / 1000.0) * 20.0, 2), # Assumes $20/kg
        "actual_scale": args.scale
    }

    print(json.dumps(response, indent=2))

if __name__ == "__main__":
    main()
