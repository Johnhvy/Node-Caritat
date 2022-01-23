#!/usr/bin/env node

import { loadYmlFile, templateBallot, VoteFileFormat } from "../parser.js";
import * as minimist from "minimist";
import { argv } from "process";

const parsedArgs = (minimist as any as { default: typeof minimist }).default(
  argv
);

const voteFile = parsedArgs["file"] ?? parsedArgs["f"];
const username = parsedArgs["username"] ?? parsedArgs["u"];
const emailAddress = parsedArgs["email-address"] ?? parsedArgs["m"];

const vote = loadYmlFile<VoteFileFormat>(voteFile);

console.log(await templateBallot(vote, { username, emailAddress }));
