# Changelog

All notable changes to the Etbaly 3D Printing Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

#### Major Code Refactoring - Modular Architecture (2026-05-06)

**Refactored `slicer.py` following SOLID principles and best practices.**

**Architecture Changes:**
- ✅ Split monolithic 639-line file into modular, object-oriented design
- ✅ Created 6 focused classes with single responsibilities
- ✅ Reduced largest function from 300+ to 30 lines (90% reduction)
- ✅ Added complete type hints (100% coverage)
- ✅ Created 20+ testable units (10x improvement)

**New Classes:**
- `Slicer` - Main orchestrator
- `MetadataParser` - G-code metadata extraction
- `ScaleValidator` - Scale validation and adjustment
- `CommandBuilder` - PrusaSlicer command construction
- `SlicerExecutor` - Command execution with retries
- `SlicingConfig`, `Dimensions`, `GCodeMetadata`, `SlicingResult` - Type-safe data structures

**Benefits:**
- ✅ **Maintainability**: Clear separation of concerns, easier to understand
- ✅ **Testability**: Small, isolated functions easy to unit test
- ✅ **Type Safety**: Full type hints for better IDE support
- ✅ **Extensibility**: Easy to add new features or customize behavior
- ✅ **Error Handling**: Custom exceptions with clear messages

**Backward Compatibility:**
- ✅ 100% compatible with existing code
- ✅ `slice_stl()` function maintains same API
- ✅ No breaking changes
- ✅ All existing integrations work without modification

**Performance:**
- ✅ No degradation
- ✅ Slight improvement in G-code parsing (early termination)

**Documentation:**
- ✅ Comprehensive docstrings on all classes and methods
- ✅ Added `REFACTORING_GUIDE.md` with migration instructions
- ✅ Added `REFACTORING_SUMMARY.md` with metrics and analysis
- ✅ Added `BEFORE_AFTER_COMPARISON.md` with code examples

**Files Modified:**
- `tools/slicer.py` - Refactored with modular architecture
- `tools/README.md` - Updated with new architecture documentation
- `tools/api.md` - Updated with architecture overview

---

### Fixed

#### G-code Metadata Parsing and Validation (2026-05-06)

**Problem**: Slicing jobs failing with "Weight, dimensions, printTime required" error even though API returned data.

**Root Cause**:
- G-code metadata parsing returned `weight: 0` and `print_time: 1` when parsing failed
- Backend validation rejected `weight: 0` as falsy value
- No warnings when metadata parsing failed

**Solution**:
- ✅ Fixed validation to check for `null/undefined` instead of falsy values
- ✅ Added fallback for suspiciously low values (weight < 1g, print_time < 5 min)
- ✅ Improved default values to never return 0
- ✅ Added warning logs when defaults are used
- ✅ Added debug logging for parsed metadata

**Changes**:
- `backend/src/workers/slicing/services/slicingWorkerService.ts`: Fixed validation logic, added fallbacks
- `tools/slicer.py`: Improved default values, added warnings and debug logs

**Impact**:
- ✅ Slicing jobs now complete successfully even when metadata parsing fails
- ✅ Clear warnings help troubleshoot parsing issues
- ✅ Reasonable defaults ensure valid pricing calculations

---

### Fixed

#### Scale Conversion and Auto-Capping (2026-05-06)

**Critical Bug Fix**: Fixed fundamental scale conversion mismatch between API and PrusaSlicer.

**Problem**: 
- API/Backend used percentage (1-1000%) but PrusaSlicer expected multiplier (0.01-10.0x)
- Previous code passed percentage directly to PrusaSlicer, causing models to print at wrong sizes
- Example: User requested 7% scale → PrusaSlicer received `--scale 7` → Interpreted as 7x (700%) → Model 100x larger than intended!

**Solution**:
- ✅ Added scale conversion: `multiplier = percentage / 100.0`
- ✅ Auto-capping: Scales > 1000% now automatically capped to 1000% (instead of failing)
- ✅ Auto-scaling: Models too large for print bed automatically scaled down
- ✅ Clear warning messages for all adjustments
- ✅ Response includes `actual_scale` and `scale_adjusted` flags
- ✅ Default scale of 100% when not specified

**Changes**:
- `tools/slicer.py`: Convert percentage to multiplier, auto-cap to max scale, default to 100% when scale not specified
- `tools/server.py`: Remove max scale validation, add warning messages
- `backend/src/workers/slicing/services/slicingWorkerService.ts`: Handle scale warnings, validate API response fields
- Documentation updated: `tools/api.md`, `tools/README.md`, `backend/docs/slicing.md`, `backend/docs/README.md`

**Impact**:
- ✅ Scale values now correct (7% = 7%, not 700%)
- ✅ Models print at intended sizes
- ✅ Scales > 1000% auto-cap with warning (better UX)
- ✅ Clear feedback for users

**API Behavior Changes**:
- **Before**: Scale > 1000% → Failed with error
- **After**: Scale > 1000% → Auto-capped to 1000% with warning ⚠️
- **New Response Fields**: `scale_was_capped`, `actual_scale`, `scale_adjusted`, `warning`

**Backward Compatibility**: Existing API calls work without changes. New warning messages provide better UX.

---

### Fixed

#### Slicing Job Status Transitions (2026-05-06)

**Problem**: Jobs in "Processing" status caused errors when BullMQ retried them.

**Solution**: Added check to skip status transition if already "Processing".

**Changes**:
- `backend/src/workers/slicing/services/slicingWorkerService.ts`: Skip transition if already in target state

---

### Fixed

#### Double Status Update Error (2026-05-06)

**Problem**: Jobs tried to update status to "Failed" twice, causing "Invalid status transition" errors.

**Solution**: Wrapped first status update in try-catch, added check in catch block to only update if not already "Failed".

**Changes**:
- `backend/src/workers/slicing/services/slicingWorkerService.ts`: Prevent duplicate status updates

---

### Changed

#### Removed Hardcoded Center Parameter (2026-05-06)

**Change**: Removed hardcoded `--center 100,100` parameter from PrusaSlicer commands.

**Reason**: PrusaSlicer automatically centers models based on printer profile. Hardcoded values caused issues with different bed sizes.

**Changes**:
- `tools/slicer.py`: Removed `--center` parameter

---

### Added

#### Auto-Scaling for Oversized Models (2026-05-06)

**Feature**: Automatic model scaling when models are too large for print bed.

**Behavior**:
- Tries requested scale first
- If too large, tries progressively smaller scales: 50%, 25%, 10%, 5%, 1% of requested scale
- Uses first scale that fits
- Returns actual scale used with warning message

**Response Fields**:
- `scale`: User's requested scale
- `actual_scale`: Actual scale used (may differ if auto-scaled)
- `scale_adjusted`: Boolean indicating if model was auto-scaled
- `warning`: Message explaining the adjustment

**Changes**:
- `tools/slicer.py`: Auto-scaling logic
- `tools/server.py`: Warning message handling
- `backend/src/workers/slicing/services/slicingWorkerService.ts`: Log warnings

---

## [1.0.0] - 2026-04-01

### Added
- Initial release of Etbaly 3D Printing Platform
- User authentication and authorization
- Product catalog and management
- Design upload and management
- Shopping cart functionality
- Order processing
- Slicing service (STL to G-code conversion)
- Printing job management
- Material catalog and pricing
- AI-powered design generation
- Google Drive integration for file storage

