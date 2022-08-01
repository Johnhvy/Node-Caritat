import { fileURLToPath } from "node:url";

import { transform } from "sucrase";

export async function resolve(urlStr, context, next) {
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
