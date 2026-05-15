#!/usr/bin/env python3
"""
slice_to_gcode.py
-----------------
Takes an STL file and exports G-code using PrusaSlicer's command-line interface.

Usage:
    python slice_to_gcode.py input.stl [output.gcode] [--config profile.ini]

Requirements:
    - PrusaSlicer installed on your system
    - Update PRUSA_SLICER_PATH below if needed
"""

import subprocess
import sys
import os
import argparse
import platform
import re
import json

# ── Adjust this path to your PrusaSlicer installation ──────────────────────
# Default profiles for AnkerMake M5
DEFAULT_PRINTER = "AnkerMake M5 (0.4 mm nozzle)"
DEFAULT_QUALITY_MAP = {
    "draft": "0.30 mm SUPERDRAFT (0.4 mm nozzle) @ANKER",
    "normal": "0.20 mm NORMAL (0.4 mm nozzle) @ANKER",
    "fine": "0.10 mm HIGHDETAIL (0.4 mm nozzle) @ANKER",
}

# ── Preset configurations ───────────────────────────────────────────────────
PRESETS = {
    "heavy": {
        "quality": "0.10 mm HIGHDETAIL (0.4 mm nozzle) @ANKER",
        "infill": "40%",
        "support": "tree",
        "perimeters": "4",
    },
    "normal": {
        "quality": "0.20 mm NORMAL (0.4 mm nozzle) @ANKER",
        "infill": "20%",
        "support": "normal",
        "perimeters": "3",
    },
    "draft": {
        "quality": "0.30 mm SUPERDRAFT (0.4 mm nozzle) @ANKER",
        "infill": "10%",
        "support": "normal",
        "perimeters": "2",
    },
}

DEFAULT_MATERIAL_MAP = {
    "pla": "Generic PLA @ANKER",
    "abs": "Generic ABS @ANKER",
    "petg": "Generic PETG @ANKER",
    "pla+": "Generic PLA+ @ANKER",
}

def find_prusa_slicer() -> str:
    """Return the PrusaSlicer executable path based on the current OS."""
    system = platform.system()
    candidates = []

    if system == "Windows":
        candidates = [
            r"C:\Users\DELL\Downloads\PrusaSlicer-2.9.4\PrusaSlicer-2.9.4\prusa-slicer-console.exe",
            r"C:\Users\DELL\Downloads\PrusaSlicer-2.9.4\PrusaSlicer-2.9.4\prusa-slicer.exe",
        ]
    elif system == "Darwin":  # macOS
        candidates = ["/Applications/PrusaSlicer.app/Contents/MacOS/PrusaSlicer"]
    else:  # Linux
        candidates = [
            "/usr/bin/prusa-slicer",
            "/usr/local/bin/prusa-slicer",
            os.path.expanduser("~/Applications/PrusaSlicer/prusa-slicer"),
        ]

    for path in candidates:
        if os.path.isfile(path):
            return path

    # Try Flatpak
    try:
        result = subprocess.run(["flatpak", "list", "--app"], capture_output=True, text=True, timeout=5)
        if "com.prusa3d.PrusaSlicer" in result.stdout:
            return "flatpak run com.prusa3d.PrusaSlicer"
    except Exception:
        pass

    import shutil
    found = shutil.which("prusa-slicer") or shutil.which("PrusaSlicer")
    if found:
        return found

    raise FileNotFoundError("PrusaSlicer executable not found.")

def parse_gcode_metadata(gcode_path: str) -> dict:
    metadata = {
        "weight": 0.0,
        "dimensions": {"width": 0, "height": 0, "depth": 0},
        "print_time": 0
    }
    
    try:
        with open(gcode_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
            # 1. Print Time
            time_match = re.search(r';\s*estimated printing time.*=\s*((?P<h>\d+)h\s*)?((?P<m>\d+)m\s*)?((?P<s>\d+)s)?', content)
            if time_match:
                h = int(time_match.group('h') or 0)
                m = int(time_match.group('m') or 0)
                s = int(time_match.group('s') or 0)
                metadata["print_time"] = (h * 60) + m + (1 if s > 30 else 0)

            # 2. Weight
            weight_match = re.search(r';\s*(?:total\s+)?filament used \[g\]\s*=\s*([\d.]+)', content, re.IGNORECASE)
            if weight_match:
                metadata["weight"] = float(weight_match.group(1))
            
            # 3. Dimensions (Bounding Box)
            bbox_match = re.search(r';\s*tight bounding box\s*:\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+)\s*:\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+)', content)
            if bbox_match:
                coords = [float(x) for x in bbox_match.groups()]
                metadata["dimensions"] = {
                    "width": round(abs(coords[3] - coords[0]), 2),
                    "depth": round(abs(coords[4] - coords[1]), 2),
                    "height": round(abs(coords[5] - coords[2]), 2)
                }
    except Exception as e:
        print(f"Error parsing metadata: {e}", file=sys.stderr)
    
    return metadata

def calculate_price(weight_g, price_per_kg=20.0):
    """Calculates price based on weight and a default rate ($20/kg)."""
    if not weight_g: return 0.0
    return round((weight_g / 1000.0) * price_per_kg, 2)

def slice_stl(stl_path, output_path=None, config_path=None, extra_args=None, 
              printer_profile=None, print_profile=None, material_profile=None, 
              scale=100.0, max_scale=1000.0):
    
    stl_path = os.path.abspath(stl_path)
    if scale > max_scale: scale = max_scale
    
    if output_path is None:
        output_path = os.path.splitext(stl_path)[0] + ".gcode"
    output_path = os.path.abspath(output_path)

    slicer = find_prusa_slicer()
    base_cmd = slicer.split() if " " in slicer else [slicer]
    base_cmd += ["--export-gcode", "--output", output_path]

    if printer_profile: base_cmd += ["--printer-profile", printer_profile]
    if print_profile: base_cmd += ["--print-profile", print_profile]
    if material_profile: base_cmd += ["--material-profile", material_profile]
    if config_path: base_cmd += ["--load", os.path.abspath(config_path)]
    if extra_args: base_cmd += extra_args
    
    scale_multiplier = scale / 100.0
    cmd = base_cmd + ["--scale", str(scale_multiplier), stl_path]
    
    print(f"Running: {' '.join(cmd)}\n")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        raise RuntimeError(f"Slicing failed: {result.stderr}")

    metadata = parse_gcode_metadata(output_path)
    
    return {
        "gcode_path": output_path,
        "weight": metadata["weight"] or 25.0,
        "dimensions": metadata["dimensions"] if metadata["dimensions"]["width"] else {"width": 50, "height": 50, "depth": 50},
        "print_time": metadata["print_time"] or 120,
        "price": calculate_price(metadata["weight"] or 25.0),
        "actual_scale": scale
    }

def main():
    parser = argparse.ArgumentParser(description="Slice STL to G-code for AnkerMake M5.")
    parser.add_argument("stl", help="Path to input STL")
    parser.add_argument("output", nargs="?", help="Output G-code path")
    parser.add_argument("--preset", choices=["heavy", "normal", "draft"], default="normal")
    parser.add_argument("--material", choices=["pla", "abs", "petg", "pla+"], default="pla")
    parser.add_argument("--scale", type=float, default=100.0)
    parser.add_argument("--printer-profile", default=DEFAULT_PRINTER)
    
    args = parser.parse_args()
    preset_data = PRESETS[args.preset]
    material_p = DEFAULT_MATERIAL_MAP[args.material]
    
    extra = ["--fill-density", preset_data["infill"], "--perimeters", preset_data["perimeters"]]
    if preset_data["support"] != "none":
        extra += ["--support-material"]
        if preset_data["support"] == "tree":
            extra += ["--support-material-style", "tree"]

    result = slice_stl(
        stl_path=args.stl,
        output_path=args.output,
        extra_args=extra,
        printer_profile=args.printer_profile,
        print_profile=preset_data["quality"],
        material_profile=material_p,
        scale=args.scale
    )

    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()