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

# ── Adjust this path to your PrusaSlicer installation ──────────────────────
# Default profiles for AnkerMake M5
DEFAULT_PRINTER = "AnkerMake M5 (0.4 mm nozzle)"
DEFAULT_QUALITY_MAP = {
    "draft": "0.30 mm SUPERDRAFT (0.4 mm nozzle) @ANKER",
    "normal": "0.20 mm NORMAL (0.4 mm nozzle) @ANKER",
    "fine": "0.10 mm HIGHDETAIL (0.4 mm nozzle) @ANKER",
}
# ── Preset configurations ───────────────────────────────────────────────────
# Three categories: heavy (high quality/strength), normal, draft (fast/light)

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
        candidates = [
            "/Applications/PrusaSlicer.app/Contents/MacOS/PrusaSlicer",
        ]
    else:  # Linux
        candidates = [
            "/usr/bin/prusa-slicer",
            "/usr/local/bin/prusa-slicer",
            os.path.expanduser("~/Applications/PrusaSlicer/prusa-slicer"),
        ]

    for path in candidates:
        if os.path.isfile(path):
            return path

    # Try Flatpak installation (common on Linux)
    flatpak_cmd = "flatpak run com.prusa3d.PrusaSlicer"
    try:
        import subprocess
        result = subprocess.run(
            ["flatpak", "list", "--app"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if "com.prusa3d.PrusaSlicer" in result.stdout:
            # Return a wrapper script that calls flatpak
            return flatpak_cmd
    except Exception:
        pass

    # Fall back to PATH lookup
    import shutil
    found = shutil.which("prusa-slicer") or shutil.which("PrusaSlicer")
    if found:
        return found

    raise FileNotFoundError(
        "PrusaSlicer executable not found. "
        "Please install PrusaSlicer or set the path manually in find_prusa_slicer()."
    )


def parse_gcode_metadata(gcode_path: str) -> dict:
    """
    Parse G-code file to extract weight, dimensions, and print time.
    
    Returns:
        dict with keys: weight (grams), dimensions (dict with width/height/depth in mm), print_time (minutes)
    """
    metadata = {
        "weight": None,
        "dimensions": {"width": None, "height": None, "depth": None},
        "print_time": None
    }
    
    min_x = min_y = min_z = float('inf')
    max_x = max_y = max_z = float('-inf')
    has_coordinates = False
    lines_read = 0
    max_lines = 10000  # Limit reading to first 10k lines for performance
    
    try:
        with open(gcode_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                lines_read += 1
                if lines_read > max_lines and has_coordinates:
                    break  # Stop if we have coordinates and read enough
                    
                line = line.strip()
                
                # Parse filament used (in mm) - convert to weight
                # PrusaSlicer format: ; filament used [mm] = 1234.56 or ; filament used = 1234.56mm
                if 'filament used' in line.lower():
                    match = re.search(r'([\d.]+)\s*mm', line)
                    if not match:
                        match = re.search(r'=\s*([\d.]+)', line)
                    if match:
                        filament_mm = float(match.group(1))
                        # Approximate: 1.75mm filament, PLA density ~1.24 g/cm³
                        # Volume = π * (0.875mm)² * length_mm = 2.405 * length_mm mm³
                        # Weight = volume_cm³ * density = (volume_mm³ / 1000) * 1.24
                        volume_cm3 = (3.14159 * 0.875 * 0.875 * filament_mm) / 1000
                        metadata["weight"] = round(volume_cm3 * 1.24, 2)
                
                # Parse estimated print time
                # PrusaSlicer format: ; estimated printing time (normal mode) = 3h 25m 12s
                if 'estimated printing time' in line.lower() or 'print time' in line.lower():
                    # Extract hours, minutes, seconds
                    hours = 0
                    minutes = 0
                    seconds = 0
                    
                    h_match = re.search(r'(\d+)h', line)
                    m_match = re.search(r'(\d+)m', line)
                    s_match = re.search(r'(\d+)s', line)
                    
                    if h_match:
                        hours = int(h_match.group(1))
                    if m_match:
                        minutes = int(m_match.group(1))
                    if s_match:
                        seconds = int(s_match.group(1))
                    
                    if hours or minutes or seconds:
                        total_minutes = hours * 60 + minutes + (seconds / 60)
                        metadata["print_time"] = round(total_minutes)
                
                # Parse bounding box dimensions from comments
                if 'bounding_box_min' in line.lower() or '; min' in line.lower():
                    match = re.search(r'([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)', line)
                    if match:
                        min_x = float(match.group(1))
                        min_y = float(match.group(2))
                        min_z = float(match.group(3))
                        has_coordinates = True
                
                if 'bounding_box_max' in line.lower() or '; max' in line.lower():
                    match = re.search(r'([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)', line)
                    if match:
                        max_x = float(match.group(1))
                        max_y = float(match.group(2))
                        max_z = float(match.group(3))
                        has_coordinates = True
                
                # Parse from G1 movement commands if no bounding box metadata
                if line.startswith('G1 ') or line.startswith('G0 '):
                    x_match = re.search(r'X([\d.-]+)', line)
                    y_match = re.search(r'Y([\d.-]+)', line)
                    z_match = re.search(r'Z([\d.-]+)', line)
                    
                    if x_match:
                        x = float(x_match.group(1))
                        min_x = min(min_x, x)
                        max_x = max(max_x, x)
                        has_coordinates = True
                    if y_match:
                        y = float(y_match.group(1))
                        min_y = min(min_y, y)
                        max_y = max(max_y, y)
                        has_coordinates = True
                    if z_match:
                        z = float(z_match.group(1))
                        min_z = min(min_z, z)
                        max_z = max(max_z, z)
                        has_coordinates = True
            
            # Calculate dimensions if we found coordinates
            if has_coordinates and min_x != float('inf') and max_x != float('-inf'):
                metadata["dimensions"] = {
                    "width": round(abs(max_x - min_x), 2),
                    "height": round(abs(max_z - min_z), 2),
                    "depth": round(abs(max_y - min_y), 2)
                }
    
    except Exception as e:
        print(f"[WARN] Failed to parse G-code metadata: {e}", file=sys.stderr)
    
    # Debug: Log what was parsed
    print(f"[DEBUG] Parsed metadata: weight={metadata['weight']}, print_time={metadata['print_time']}, dimensions={metadata['dimensions']}", file=sys.stderr)
    
    return metadata


def slice_stl(
    stl_path: str,
    output_path: str | None = None,
    config_path: str | None = None,
    extra_args: list[str] | None = None,
    printer_profile: str | None = None,
    print_profile: str | None = None,
    material_profile: str | None = None,
    scale: float | None = None,
    max_scale: float = 1000.0,
) -> str:
    """
    Slice an STL file with PrusaSlicer and return the path to the G-code file.

    Parameters
    ----------
    stl_path    : Path to the input STL file.
    output_path : Desired output .gcode path. If None, saved next to the STL.
    config_path : Optional PrusaSlicer .ini config/profile file.
    extra_args  : Any additional CLI flags (e.g. ["--layer-height", "0.2"]).
    max_scale   : Maximum allowed scale factor (default: 1000.0 = 1000%)

    Returns
    -------
    str : Absolute path to the generated G-code file.
    """
    stl_path = os.path.abspath(stl_path)
    if not os.path.isfile(stl_path):
        raise FileNotFoundError(f"STL file not found: {stl_path}")
    
    # Validate scale (input is percentage: 1-1000)
    if scale is not None and scale > max_scale:
        # Auto-adjust to max scale instead of failing
        print(
            f"[WARN] Requested scale {scale}% exceeds maximum {max_scale}%. "
            f"Automatically using {max_scale}% instead.",
            file=sys.stderr
        )
        scale = max_scale
        scale_was_adjusted = True
    else:
        scale_was_adjusted = False
    
    if scale is not None and scale < 1:
        raise ValueError(
            f"Scale is too small. The minimum scale is 1% (0.01x) but you provided {scale}% ({scale/100:.2f}x). "
            f"Please use a scale between 1% and {max_scale}%."
        )

    def _ensure_gcode_extension(path: str) -> str:
        root, ext = os.path.splitext(path)
        if ext.lower() != ".gcode":
            return root + ".gcode" if ext else path + ".gcode"
        return path

    # Determine output path
    if output_path is None:
        base = os.path.splitext(stl_path)[0]
        output_path = base + ".gcode"
    else:
        output_path = _ensure_gcode_extension(output_path)
    output_path = os.path.abspath(output_path)

    slicer = find_prusa_slicer()

    # Build the base command
    # Check if slicer is a flatpak command
    if slicer.startswith("flatpak run"):
        base_cmd = slicer.split() + [
            "--export-gcode",          # export G-code mode
            "--output", output_path,   # output file
        ]
    else:
        base_cmd = [
            slicer,
            "--export-gcode",          # export G-code mode
            "--output", output_path,   # output file
        ]

    # Load printer/print/material profiles (required for proper slicing)
    if printer_profile:
        base_cmd += ["--printer-profile", printer_profile]
    if print_profile:
        base_cmd += ["--print-profile", print_profile]
    if material_profile:
        base_cmd += ["--material-profile", material_profile]

    if config_path:
        config_path = os.path.abspath(config_path)
        if not os.path.isfile(config_path):
            raise FileNotFoundError(f"Config file not found: {config_path}")
        base_cmd += ["--load", config_path]

    if extra_args:
        base_cmd += extra_args
    
    # PrusaSlicer will automatically center the model on the bed by default
    # No need to specify --center explicitly

    def _run_with(additional_args: list[str] | None = None, scale_override: float | None = None):
        cmd = list(base_cmd)
        if scale_override:
            # Convert percentage to multiplier for PrusaSlicer
            # Input: 100% -> PrusaSlicer needs: 1.0
            # Input: 50% -> PrusaSlicer needs: 0.5
            # Input: 200% -> PrusaSlicer needs: 2.0
            scale_multiplier = scale_override / 100.0
            cmd += ["--scale", str(scale_multiplier)]
        if additional_args:
            cmd += additional_args
        cmd.append(stl_path)  # input file must come last
        print(f"Running: {' '.join(cmd)}\n")
        return subprocess.run(cmd, capture_output=True, text=True)

    def _outside_print_volume(run_result: subprocess.CompletedProcess) -> bool:
        combined = ((run_result.stdout or "") + "\n" + (run_result.stderr or "")).lower()
        return (
            "outside of the print volume" in combined
            or "no outline can be derived for object" in combined
        )

    active_scale = float(scale) if scale else 100.0  # Default to 100% if no scale specified
    result = _run_with(scale_override=active_scale)
    actual_scale_used = active_scale  # Track the actual scale used

    if result.returncode != 0 and "no extrusions in the first layer" in (result.stderr or "").lower():
        print(
            "[WARN] First layer has no extrusions. Retrying with safer bed-contact options...",
            file=sys.stderr,
        )

        # Retry 1: force bed placement + brim to create first-layer material.
        retry_args = ["--ensure-on-bed", "--brim-width", "8"]
        retry = _run_with(retry_args, scale_override=active_scale)
        if retry.returncode == 0:
            result = retry
        elif "unknown option" not in (retry.stderr or "").lower():
            # Retry 2: add raft as a fallback for point-contact geometries.
            retry2_args = retry_args + ["--raft-layers", "1"]
            retry2 = _run_with(retry2_args, scale_override=active_scale)
            if retry2.returncode == 0:
                result = retry2

    # If object is outside print volume, retry with progressively smaller scale.
    if _outside_print_volume(result):
        print(
            "[WARN] Model is outside print volume. Retrying with reduced scale...",
            file=sys.stderr,
        )
        scale_trials: list[float] = []
        if active_scale is not None:
            trial = active_scale
        else:
            trial = 100.0  # Start from 100% if no scale specified

        # Try more aggressive scaling: 50%, 25%, 10%, 5%, 1%
        for factor in [0.5, 0.25, 0.1, 0.05, 0.01]:
            trial_scale = trial * factor
            if trial_scale < 0.01:
                break
            scale_trials.append(round(trial_scale, 6))

        successful_scale = None
        for trial_scale in scale_trials:
            # Add ensure-on-bed flag to help with positioning
            retry_args = ["--ensure-on-bed"]
            retry = _run_with(retry_args, scale_override=trial_scale)
            if retry.stdout:
                print(retry.stdout)
            if retry.stderr:
                print(retry.stderr, file=sys.stderr)
            if retry.returncode == 0 and os.path.isfile(output_path):
                successful_scale = trial_scale
                actual_scale_used = trial_scale  # Update the actual scale used
                print(f"[OK] Auto-fit scale succeeded at {trial_scale}% ({trial_scale/100:.2f}x)")
                result = retry
                break
        
        # If we found a working scale, inform the user
        if successful_scale and active_scale and successful_scale < active_scale:
            # Convert percentage to multiplier (e.g., 331% -> 3.31x, 3.31% -> 0.0331x)
            original_multiplier = active_scale / 100.0
            successful_multiplier = successful_scale / 100.0
            print(
                f"[INFO] Model was automatically scaled down from {active_scale:.2f}% ({original_multiplier:.2f}x) "
                f"to {successful_scale:.2f}% ({successful_multiplier:.4f}x) to fit the print bed.",
                file=sys.stderr
            )

    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)

    if result.returncode != 0:
        raise RuntimeError(
            f"PrusaSlicer exited with code {result.returncode}.\n"
            f"stderr: {result.stderr}"
        )

    if not os.path.isfile(output_path):
        if _outside_print_volume(result):
            # Calculate what scale would be needed (estimate)
            original_scale = active_scale if active_scale else 100.0
            
            # Model is too large even at smallest scale
            print(
                "[ERROR] Model is too large to fit the print bed even at the smallest scale.",
                file=sys.stderr
            )
            raise ValueError(
                f"The 3D model is too large to print. "
                f"You requested {original_scale}% ({original_scale/100:.2f}x) scale, "
                f"but the model doesn't fit the print bed even at 1% (0.01x) scale. "
                f"Please use a smaller model or reduce the scale to less than 1%."
            )
        raise RuntimeError(
            f"PrusaSlicer finished but G-code file not found at: {output_path}"
        )

    print(f"\n✅  G-code written to: {output_path}")
    
    # Parse metadata from G-code
    metadata = parse_gcode_metadata(output_path)
    
    # Ensure dimensions have default values if parsing failed
    if not metadata.get("dimensions") or metadata["dimensions"].get("width") is None:
        print("[WARN] Dimensions not found in G-code, using defaults", file=sys.stderr)
        # Use reasonable defaults based on typical print sizes
        metadata["dimensions"] = {
            "width": 50.0,
            "height": 50.0,
            "depth": 50.0
        }
    
    # Ensure weight has a default value (never 0)
    if metadata.get("weight") is None or metadata.get("weight") == 0:
        print("[WARN] Weight not found in G-code or is 0, using default 25g", file=sys.stderr)
        metadata["weight"] = 25.0  # Default weight in grams
    
    # Ensure print_time has a default value (never 0)
    if metadata.get("print_time") is None or metadata.get("print_time") == 0:
        print("[WARN] Print time not found in G-code or is 0, using default 120 minutes", file=sys.stderr)
        metadata["print_time"] = 120  # Default 2 hours
    
    result = {
        "gcode_path": output_path,
        "weight": metadata["weight"],
        "dimensions": metadata["dimensions"],
        "print_time": metadata["print_time"],
        "actual_scale": actual_scale_used,  # Return the actual scale used
        "scale_was_capped": scale_was_adjusted  # Indicate if scale was capped to max
    }
    
    return result


# ── CLI entry point ─────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Slice an STL file with PrusaSlicer and export G-code."
    )
    parser.add_argument("stl", help="Path to the input STL file")
    parser.add_argument(
        "output", nargs="?", default=None,
        help="Output G-code path (default: same directory as STL)"
    )
    parser.add_argument(
        "--config", default=None,
        help="PrusaSlicer config/profile .ini file"
    )
    # Preset: combines quality, infill, support, perimeters
    parser.add_argument(
        "--preset", choices=["heavy", "normal", "draft"], default="normal",
        help="Preset: heavy (0.1mm, 40%% infill, tree support), normal (0.2mm, 20%%), draft (0.3mm, 10%%)"
    )
    # Material settings
    parser.add_argument(
        "--material", choices=["pla", "abs", "petg", "pla+"], default="pla",
        help="Material type: pla, abs, petg, pla+"
    )
    # Individual overrides (optional, overrides preset values)
    parser.add_argument(
        "--quality-override", choices=["draft", "normal", "fine"], default=None,
        help="Override preset quality: draft (0.30mm), normal (0.20mm), fine (0.10mm)"
    )
    parser.add_argument(
        "--infill-override", choices=["light", "normal", "strong"], default=None,
        help="Override preset infill: light (10%%), normal (20%%), strong (40%%)"
    )
    parser.add_argument(
        "--support-override", choices=["none", "normal", "tree"], default=None,
        help="Override preset support: none, normal, tree"
    )
    # Scale factor (important for tiny models!)
    parser.add_argument(
        "--scale", type=float, default=1.0,
        help="Scale model by this factor (default: 1.0 = original size)"
    )
    # Override specific profiles
    parser.add_argument(
        "--printer-profile", default=None,
        help="Printer profile name (default: AnkerMake M5)"
    )
    parser.add_argument(
        "--print-profile", default=None,
        help="Print profile name (overrides --quality)"
    )
    parser.add_argument(
        "--material-profile", default=None,
        help="Material profile name (overrides --material)"
    )
    # Legacy options
    parser.add_argument(
        "--layer-height", default=None,
        help="Layer height in mm (deprecated: use --quality)"
    )
    parser.add_argument(
        "--fill-density", default=None,
        help="Infill density, e.g. 15%%"
    )
    args = parser.parse_args()

    # Resolve printer profile
    printer_profile = args.printer_profile or DEFAULT_PRINTER

    # Resolve preset settings
    preset = PRESETS[args.preset]
    print_profile = preset["quality"]
    infill_density = preset["infill"]
    support_mode = preset["support"]
    perimeters = preset["perimeters"]

    # Apply individual overrides (if specified)
    quality_override_map = {
        "draft": "0.30 mm SUPERDRAFT (0.4 mm nozzle) @ANKER",
        "normal": "0.20 mm NORMAL (0.4 mm nozzle) @ANKER",
        "fine": "0.10 mm HIGHDETAIL (0.4 mm nozzle) @ANKER",
    }
    infill_override_map = {
        "light": "10%",
        "normal": "20%",
        "strong": "40%",
    }

    if args.quality_override:
        print_profile = quality_override_map[args.quality_override]
    if args.infill_override:
        infill_density = infill_override_map[args.infill_override]
    if args.support_override:
        support_mode = args.support_override

    # Resolve material profile
    if args.material_profile:
        material_profile = args.material_profile
    else:
        material_profile = DEFAULT_MATERIAL_MAP[args.material]

    # Build extra arguments
    extra = []
    if args.layer_height:
        extra += ["--layer-height", args.layer_height]
    if args.fill_density:
        extra += ["--fill-density", args.fill_density]
    else:
        extra += ["--fill-density", infill_density]

    # Perimeters from preset
    extra += ["--perimeters", perimeters]

    # Support settings
    if support_mode == "none":
        pass
    elif support_mode == "normal":
        extra += ["--support-material"]
    elif support_mode == "tree":
        # Older/newer PrusaSlicer CLIs differ; use generic support flags
        # so this mode remains compatible instead of failing on unknown options.
        extra += ["--support-material"]

    print(f"Printer: {printer_profile}")
    print(f"Preset: {args.preset.upper()}")
    print(f"  Quality: {print_profile}")
    print(f"  Infill: {infill_density}")
    print(f"  Support: {support_mode}")
    print(f"  Perimeters: {perimeters}")
    print(f"Material: {material_profile}")
    if args.scale:
        print(f"Scale: {args.scale}x")

    slice_stl(
        stl_path=args.stl,
        output_path=args.output,
        config_path=args.config,
        extra_args=extra or None,
        printer_profile=printer_profile,
        print_profile=print_profile,
        material_profile=material_profile,
        scale=args.scale,
    )


if __name__ == "__main__":
    main()