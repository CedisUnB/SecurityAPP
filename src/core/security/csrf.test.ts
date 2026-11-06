import { isSameOriginRefreshRequest } from "./csrf";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  Reflect.set(process.env, "NODE_ENV", originalNodeEnv);
});

it("allows a matching HTTPS origin in production", () => {
  Reflect.set(process.env, "NODE_ENV", "production");

  expect(
    isSameOriginRefreshRequest(
      new Headers({
        host: "app.example.edu",
        origin: "https://app.example.edu",
        "sec-fetch-site": "same-origin",
      }),
      "POST",
    ),
  ).toBe(true);
});

it.each([
  ["a cross-site origin", { host: "app.example.edu", origin: "https://evil.example" }],
  ["a mismatched host", { host: "app.example.edu", origin: "https://other.example.edu" }],
  ["an insecure production origin", { host: "app.example.edu", origin: "http://app.example.edu" }],
  ["a cross-site fetch", {
    host: "app.example.edu",
    origin: "https://app.example.edu",
    "sec-fetch-site": "cross-site",
  }],
])("rejects %s", (_description, headers) => {
  Reflect.set(process.env, "NODE_ENV", "production");

  expect(isSameOriginRefreshRequest(new Headers(headers), "POST")).toBe(false);
});

it("allows a same-origin browser navigation without an Origin header", () => {
  Reflect.set(process.env, "NODE_ENV", "production");

  expect(
    isSameOriginRefreshRequest(
      new Headers({ host: "app.example.edu", "sec-fetch-site": "same-origin" }),
      "GET",
    ),
  ).toBe(true);
});

it("does not allow a POST refresh without an Origin header", () => {
  Reflect.set(process.env, "NODE_ENV", "development");

  expect(
    isSameOriginRefreshRequest(
      new Headers({ host: "localhost:3000", "sec-fetch-site": "same-origin" }),
      "POST",
    ),
  ).toBe(false);
});
