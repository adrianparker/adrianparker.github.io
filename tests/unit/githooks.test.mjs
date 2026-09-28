import { expect } from "chai";
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";

// Git silently ignores a hook that isn't executable, so a hook committed as
// mode 100644 never runs. Check the mode git records, not the working copy's.
describe("githooks — committed file mode", () => {
  for (const hook of readdirSync(".githooks")) {
    it(`.githooks/${hook} is committed as executable`, () => {
      const entry = execFileSync("git", ["ls-files", "-s", `.githooks/${hook}`], { encoding: "utf8" });
      expect(entry.split(" ")[0]).to.equal("100755");
    });
  }
});
