import { validatePrintingReadiness } from "../Product";

describe("Product Model - Validation Helper", () => {
  describe("validatePrintingReadiness", () => {
    // Test Requirement 3.2: Not ready allows any G-code state
    it("should not throw when isPrintingReady is false and gcodeUrl is absent", () => {
      expect(() => {
        validatePrintingReadiness(false, undefined);
      }).not.toThrow();
    });

    it("should not throw when isPrintingReady is false and gcodeUrl is present", () => {
      expect(() => {
        validatePrintingReadiness(false, "https://example.com/gcode.gcode");
      }).not.toThrow();
    });

    it("should not throw when isPrintingReady is false and gcodeUrl is empty", () => {
      expect(() => {
        validatePrintingReadiness(false, "");
      }).not.toThrow();
    });

    // Test Requirement 3.1: Ready requires G-code
    it("should not throw when isPrintingReady is true and gcodeUrl is present", () => {
      expect(() => {
        validatePrintingReadiness(true, "https://example.com/gcode.gcode");
      }).not.toThrow();
    });

    it("should throw when isPrintingReady is true and gcodeUrl is absent", () => {
      expect(() => {
        validatePrintingReadiness(true, undefined);
      }).toThrow("Products marked as printing ready must have a G-code URL");
    });

    it("should throw when isPrintingReady is true and gcodeUrl is empty string", () => {
      expect(() => {
        validatePrintingReadiness(true, "");
      }).toThrow("Products marked as printing ready must have a G-code URL");
    });

    it("should throw when isPrintingReady is true and gcodeUrl is whitespace only", () => {
      expect(() => {
        validatePrintingReadiness(true, "   ");
      }).toThrow("Products marked as printing ready must have a G-code URL");
    });

    it("should throw when isPrintingReady is true and gcodeUrl is tabs and newlines", () => {
      expect(() => {
        validatePrintingReadiness(true, "\t\n  \t");
      }).toThrow("Products marked as printing ready must have a G-code URL");
    });
  });
});
