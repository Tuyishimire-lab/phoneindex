import fs from "fs";
import path from "path";
import { compile, optimize, Polyfills } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

async function buildCss() {
  const rootDir = process.cwd();
  const inputPath = path.join(rootDir, "src", "app", "tailwind-input.css");
  const outputPath = path.join(rootDir, "src", "app", "globals.css");
  const cssInput = fs.readFileSync(inputPath, "utf-8");

  const compiler = await compile(cssInput, {
    from: inputPath,
    base: path.dirname(inputPath),
    shouldRewriteUrls: true,
    onDependency: () => {},
    polyfills: Polyfills.All,
  });

  const scanner = new Scanner({
    sources: [
      {
        base: path.join(rootDir, "src"),
        pattern: "**/*",
        negated: false,
      },
    ],
  });

  const candidates = scanner.scan();
  const rawCss = compiler.build(candidates);
  const optimized = optimize(rawCss, { minify: false }).code;

  fs.writeFileSync(outputPath, optimized, "utf-8");
  console.log(`Compiled Tailwind CSS (${candidates.length} candidates) -> src/app/globals.css`);
}

buildCss().catch((err) => {
  console.error("CSS build failed:", err);
  process.exit(1);
});
