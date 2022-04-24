import { fileURLToPath } from "node:url";

import { transform } from "sucrase";

export async function resolve(url, context, next) {
  try {
    return await next(url, context);
  } catch (err) {
    if (err?.code === "ERR_MODULE_NOT_FOUND" && url.endsWith(".js")) {
      return next(url.replace(/\.js$/, ".ts"), context).catch((err2) => {
        if (err2) {
          err2.cause = err;
          throw err2;
        }
        throw err;
      });
    }
    throw err;
  }
}

export async function load(url, context, next) {
  url = new URL(url);
  if (url.pathname.endsWith(".ts")) {
    const { source } = await next(url, { ...context, format: "module" });
    return {
      source: transform(source.toString("utf-8"), {
        transforms: ["typescript"],
        disableESTransforms: true,
        filePath: fileURLToPath(url),
      }).code,
      format: "module",
    };
  } else {
    return next(url, context);
  }
}
