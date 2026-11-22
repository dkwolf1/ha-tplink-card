import assert from "node:assert/strict";
import { copyFile, readFile, readdir, stat } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (file) => readFile(resolve(root, file), "utf8");
const filename = "tplink-deco-mesh-card.js";
const source = resolve(root, "src", filename);
const distribution = resolve(root, "dist", filename);

if (process.argv[2] === "build") {
  await copyFile(source, distribution);
} else {
  const metadata = JSON.parse(await read("hacs.json"));
  const pkg = JSON.parse(await read("package.json"));
  const lock = JSON.parse(await read("package-lock.json"));
  const moduleText = await read("dist/" + filename);
  assert.deepEqual(metadata, {
    name: "TP-Link Deco Mesh Live",
    filename,
    render_readme: true,
  });
  assert.deepEqual(await readdir(resolve(root, "dist")), [filename]);
  assert.equal(
    moduleText,
    await read("src/" + filename),
    "Run npm run build after changing the source",
  );
  assert.ok(
    moduleText.includes("v" + pkg.version),
    "Package and module versions must agree",
  );
  assert.equal(lock.version, pkg.version);
  assert.deepEqual(lock.packages[""].devDependencies, pkg.devDependencies);
  assert.equal(Object.keys(pkg.dependencies ?? {}).length, 0);
  const syntax = spawnSync(process.execPath, ["--check", distribution], {
    stdio: "inherit",
  });
  assert.equal(
    syntax.status,
    0,
    "Distribution must parse as a JavaScript module",
  );

  const readme = await read("README.md");
  const anchors = new Set(
    Array.from(readme.matchAll(/^#+ (.+)$/gm), ([, title]) =>
      title
        .toLowerCase()
        .replace(/[^\p{L}\p{N} -]/gu, "")
        .replace(/ /g, "-"),
    ),
  );
  let screenshots = 0;
  for (const [link, destination] of readme.matchAll(
    /!?\[[^\]\n]+\]\(([^)\s]+)\)/g,
  )) {
    if (/^https?:\/\//.test(destination)) continue;
    if (destination.startsWith("#")) {
      assert.ok(
        anchors.has(destination.slice(1)),
        "Unknown heading: " + destination,
      );
      continue;
    }
    const path = resolve(
      dirname(resolve(root, "README.md")),
      decodeURIComponent(destination.split("#")[0]),
    );
    assert.ok(
      path.startsWith(root.endsWith(sep) ? root : root + sep),
      "README link leaves the project: " + destination,
    );
    assert.ok(
      (await stat(path)).isFile(),
      "Missing README file: " + destination,
    );
    if (link.startsWith("!") && path.endsWith(".png")) {
      const signature = await readFile(path);
      assert.equal(
        signature.subarray(0, 8).toString("hex"),
        "89504e470d0a1a0a",
        "Invalid PNG: " + destination,
      );
      screenshots++;
    }
  }
  assert.ok(
    screenshots >= 1,
    "Marketplace requires a screenshot in the README",
  );
  console.log(
    "JavaScript module, Marketplace metadata, distribution and README links verified",
  );
}
