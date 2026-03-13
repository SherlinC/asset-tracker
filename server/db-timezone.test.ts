import { describe, expect, it } from "vitest";

import { buildMysqlPoolOptions } from "./db";

describe("database timezone configuration", () => {
  it("forces mysql connections to use UTC", () => {
    const options = buildMysqlPoolOptions(
      "mysql://user:pass@localhost:3306/asset_tracker"
    );

    expect(options.timezone).toBe("Z");
    expect(options.uri).toBe("mysql://user:pass@localhost:3306/asset_tracker");
  });
});
