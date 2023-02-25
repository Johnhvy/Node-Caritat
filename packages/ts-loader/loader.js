import { readFile, opendir, open } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { transform } from "sucrase";

const ROOT_DIR = new URL("../../packages/", import.meta.url);
const packagesDir = await opendir(ROOT_DIR);
const localPackagesURLs = Object.create(null);
for await (const fsEntry of packagesDir) {
  if (fsEntry.isDirectory()) {
    const localPackagePackageJsonURL = new URL(
      `./${fsEntry.name}/package.json`,
      ROOT_DIR
    );
    try {
      const { name } = JSON.parse(
        await readFile(localPackagePackageJsonURL, "utf-8")
      );
      localPackagesURLs[name] = new URL("./src/", localPackagePackageJsonURL);
    } catch {}
  }
}

const localPackagePattern = /^@aduh95\/caritat(?:-[^/]+)?/;

export async function resolve(urlStr, context, next) {
  const localMatch = localPackagePattern.exec(urlStr);
  if (localMatch != null && localMatch[0] in localPackagesURLs) {
    urlStr = new URL(
      urlStr.slice(localMatch[0].length + 1),
      localPackagesURLs[localMatch[0]]
    ).href;
  }
  try {
    return await next(urlStr, context);
  } catch (err) {
    if (err?.code === "ERR_MODULE_NOT_FOUND" && urlStr.endsWith(".js")) {
      try {
        return await next(urlStr.replace(/\.js$/, ".ts"), context);
      } catch (err2) {
        if (err2) {
          err2.cause = err;
          throw err2;
        }
        throw err;
      }
    }
    throw err;
  }
}

export async function load(urlStr, context, next) {
  const url = new URL(urlStr);
  if (url.pathname.endsWith(".ts")) {
    const { source } = await next(urlStr, { ...context, format: "module" });
    return {
      source: transform(source.toString("utf-8"), {
        transforms: ["typescript"],
        disableESTransforms: true,
        filePath: fileURLToPath(url),
      }).code,
      format: "module",
    };
  } else {
    return next(urlStr, context);
  }
}
