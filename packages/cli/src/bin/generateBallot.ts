#!/usr/bin/env node

import parseArgs from "../utils/parseArgs.js";
import {
  loadYmlFile,
  templateBallot,
  VoteFileFormat,
} from "@aduh95/caritat/parser";

const parsedArgs = await parseArgs().options({
  file: {
    alias: "f",
    describe: "Path to YAML file describing the vote options",
    demandOption: true,
    normalize: true,
    type: "string",
  },
  username: {
    alias: "u",
    describe: "Name of the voter (optional)",
    type: "string",
  },
  email: {
    alias: "m",
    describe: "Email address of the voter (optional)",
    type: "string",
  },
}).argv;

const { file, username, email: emailAddress } = parsedArgs;

const vote = loadYmlFile<VoteFileFormat>(file);

console.log(await templateBallot(vote, { username, emailAddress }));
