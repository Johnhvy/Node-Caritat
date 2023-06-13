import { readFile, opendir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { transform } from "sucrase";

/**
 * Maps all the possible import specifier to the absolute URL of the source file.
 *
 * This is necessary to make sure we load the source file, rather than the maybe
 * outdated transpiled file.
 *
 * @type {Record<string, string>}
 */
const localPackagesURLs = Object.create(null);
/**
 * Maps all the directory names to the name of their local dependencies, plus
 * the name their own package.
 *
 * This is used to send an error if a package tries to load something that's not
 * in its dependencies.
 *
 * @type {Record<string, string[]>}
 */
const packagesDirLocalDeps = Object.create(null);

const ROOT_DIR = new URL("../../packages/", import.meta.url);

for await (const fsEntry of await opendir(ROOT_DIR)) {
  if (fsEntry.isDirectory()) {
    const localPackagePackageJsonURL = new URL(
      `./${fsEntry.name}/package.json`,
      ROOT_DIR
    );
    try {
      const { name, exports, dependencies } = JSON.parse(
        await readFile(localPackagePackageJsonURL, "utf-8")
      );
      if (!name) continue;
      if (exports) {
        for (const [exportedPath, url] of Object.entries(exports)) {
          localPackagesURLs[exportedPath.replace(".", () => name)] = new URL(
            url.replace(/\/dist\/(.+)\.js$/, "/src/$1.ts"),
            localPackagePackageJsonURL
          ).href;
        }
      }
      packagesDirLocalDeps[fsEntry.name] = dependencies
        ? Object.keys(dependencies).filter((name) =>
            dependencies[name].startsWith("workspace:")
          )
        : [];
      // To make self-reference work:
      packagesDirLocalDeps[fsEntry.name].push(name);
    } catch {
      // ignore errors
    }
  }
}

const localModuleURLPattern = /\/packages\/([^/]+)\//;

export async function resolve(urlStr, context, next) {
  if (context.parentURL?.startsWith(ROOT_DIR) && urlStr in localPackagesURLs) {
    const parentURLPackageDirName = localModuleURLPattern.exec(
      context.parentURL
    );
    if (
      parentURLPackageDirName != null &&
      packagesDirLocalDeps[parentURLPackageDirName[1]]?.every(
        (depName) => !urlStr.startsWith(depName)
      )
    ) {
      throw new Error(
        `${context.parentURL} tried to import ${urlStr}, which correspond to the local module ${localPackagesURLs[urlStr]}, but it is not listed in its dependencies`
      );
    }
    urlStr = localPackagesURLs[urlStr];
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
