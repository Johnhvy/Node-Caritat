#!/usr/bin/env node

import { stdout, argv } from "process";
import fs from "fs/promises";

import { load } from "js-yaml";
import readStdIn from "../utils/readStdin.js";

const [, , yamlFile] = argv;

let data: string;
if (yamlFile == null) {
  data = await readStdIn(true);
} else {
  data = await fs.readFile(yamlFile, "utf8");
}

stdout.write((load(data) as any).encryptedPrivateKey);
