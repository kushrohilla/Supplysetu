import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("admin reports page", () => {
  it("no longer uses the module unavailable placeholder", async () => {
    const filePath = path.resolve(process.cwd(), "apps/admin-web/app/(protected)/reports/page.tsx");
    const source = await readFile(filePath, "utf8");

    expect(source).toContain("ReportsScreen");
    expect(source).not.toContain("ModuleUnavailableState");
    expect(source).not.toContain("This feature is not available yet.");
  });
});
