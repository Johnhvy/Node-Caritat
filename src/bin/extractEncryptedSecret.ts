#!/usr/bin/env node

import { stdin, stdout, argv } from "process";
import fs from "fs/promises";

import { load } from "js-yaml";

const [, , yamlFile] = argv;

let data: string;
if (yamlFile == null) {
  const inputChunks = [];

  stdin.resume();
  stdin.setEncoding("utf8");

  stdin.on("data", function (chunk) {
    inputChunks.push(chunk);
  });

  data = await new Promise((resolve, reject) => {
    stdin.on("end", () => resolve(inputChunks.join()));
    stdin.on("error", () => reject(new Error("error during read")));
    stdin.on("timeout", () => reject(new Error("timout during read")));
  });
} else {
  data = await fs.readFile(yamlFile, "utf8");
}

stdout.write((load(data) as any).encryptedPrivateKey);
