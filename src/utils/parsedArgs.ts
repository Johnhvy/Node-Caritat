import { argv } from "process";
import * as minimist from "minimist";

export default (minimist as any as { default: typeof minimist }).default(
    argv
  );
