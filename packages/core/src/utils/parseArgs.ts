import { argv } from "process";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

export default (args = argv) => yargs(hideBin(args));
