// Developer: Ahsan Mahmood | https://aoneahsan.com
import { describe, expect, it } from "vitest";
import { apiProxyContext } from "../vite.config";

describe("Vite API proxy", () => {
  const matchesProxy = (path: string) => new RegExp(apiProxyContext).test(path);

  it.each([
    "/api",
    "/api?health=1",
    "/api/invoices",
    "/api/invoices?status=needs_review",
  ])("proxies the API path %s", (path) => {
    expect(matchesProxy(path)).toBe(true);
  });

  it.each(["/api.ts", "/apiary", "/apis/invoices"])(
    "leaves the client path %s with Vite",
    (path) => {
      expect(matchesProxy(path)).toBe(false);
    },
  );
});
