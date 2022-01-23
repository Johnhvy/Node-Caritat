#!/usr/bin/env node

import parsedArgs from "../utils/parsedArgs.js";
import { loadYmlFile, templateBallot, VoteFileFormat } from "../parser.js";

const voteFile = parsedArgs["file"] ?? parsedArgs["f"];
const username = parsedArgs["username"] ?? parsedArgs["u"];
const emailAddress = parsedArgs["email-address"] ?? parsedArgs["m"];

const vote = loadYmlFile<VoteFileFormat>(voteFile);

console.log(await templateBallot(vote, { username, emailAddress }));
