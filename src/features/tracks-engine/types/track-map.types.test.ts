import {
  trackMapRouteParamsSchema,
  trackNodeRouteParamsSchema,
} from "./track-map.types";

describe("track map route schemas", () => {
  it("parses positive integer route parameters", () => {
    expect(
      trackMapRouteParamsSchema.parse({ trackId: "12", focus: "42" }),
    ).toEqual({ trackId: 12, focus: 42 });
    expect(
      trackNodeRouteParamsSchema.parse({ trackId: "12", nodeId: "42" }),
    ).toEqual({ trackId: 12, nodeId: 42 });
  });

  it.each(["", "0", "-1", "1.5", "1abc", "2147483648"])(
    "rejects invalid numeric route ID %s",
    (trackId) => {
      expect(trackMapRouteParamsSchema.safeParse({ trackId }).success).toBe(
        false,
      );
    },
  );

  it("rejects non-string and malformed focus parameters", () => {
    expect(
      trackMapRouteParamsSchema.safeParse({ trackId: "1", focus: ["2"] })
        .success,
    ).toBe(false);
    expect(
      trackMapRouteParamsSchema.safeParse({ trackId: "1", focus: "0" })
        .success,
    ).toBe(false);
  });
});
