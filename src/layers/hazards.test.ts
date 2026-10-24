import { describe, expect, it } from "vitest";

import { hazardStyle } from "./hazards";

describe("hazardStyle", () => {
  it("groups EONET/GDACS categories into three marker styles", () => {
    for (const c of ["wildfires", "volcanoes", "tempExtremes", "drought"]) expect(hazardStyle(c), c).toBe("heat");
    for (const c of ["floods", "severeStorms", "tsunami", "snow"]) expect(hazardStyle(c), c).toBe("water");
    for (const c of ["earthquakes", "landslides", "dustHaze"]) expect(hazardStyle(c), c).toBe("ground");
  });
  it("treats unknown or missing categories as ground", () => {
    expect(hazardStyle(undefined)).toBe("ground");
    expect(hazardStyle("somethingNew")).toBe("ground");
  });
});
