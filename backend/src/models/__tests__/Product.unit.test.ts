import { isProductPrintingReady, validateCustomizability, IProduct } from "../Product";

describe("Product Model - Helpers", () => {
  describe("isProductPrintingReady", () => {
    it("returns false when slicingResult is absent", () => {
      expect(isProductPrintingReady({ slicingResult: undefined } as IProduct)).toBe(false);
    });

    it("returns false when slicingResult has no gcodeUrl", () => {
      expect(isProductPrintingReady({ slicingResult: { gcodeUrl: "" } } as any)).toBe(false);
    });

    it("returns true when slicingResult has a gcodeUrl", () => {
      expect(
        isProductPrintingReady({
          slicingResult: { gcodeUrl: "https://example.com/model.gcode" },
        } as any),
      ).toBe(true);
    });
  });

  describe("validateCustomizability", () => {
    it("does not throw when isCustomizable is false", () => {
      expect(() => validateCustomizability(false, undefined)).not.toThrow();
    });

    it("does not throw when isCustomizable is true and customFields are provided", () => {
      expect(() =>
        validateCustomizability(true, [
          { fieldName: "color", fieldType: "text", isRequired: false, label: "Color" },
        ]),
      ).not.toThrow();
    });

    it("throws when isCustomizable is true but customFields is empty", () => {
      expect(() => validateCustomizability(true, [])).toThrow(
        "Products marked as customizable must have at least one custom field defined",
      );
    });

    it("throws when isCustomizable is true but customFields is absent", () => {
      expect(() => validateCustomizability(true, undefined)).toThrow(
        "Products marked as customizable must have at least one custom field defined",
      );
    });
  });
});
