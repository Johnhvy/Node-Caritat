import { IOType, spawn } from "child_process";

export default (
  cmd: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[] | readonly string[],
  {
    captureStdout = false,
    captureStderr = false,
    trimOutput = true,
    spawnArgs = {},
  } = {}
) =>
  new Promise((resolve, reject) => {
    const opt = {
      stdio: captureStdout
        ? (["inherit", "pipe", "inherit"] as IOType[])
        : captureStderr
        ? (["inherit", "inherit", "pipe"] as IOType[])
        : ("inherit" as IOType),
      ...spawnArgs,
    };
    const child = spawn(cmd, args as string[], opt);
    let stdout;
    if (captureStdout) {
      stdout = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
    } else if (captureStderr) {
      stdout = "";
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk) => {
        stdout += chunk;
      });
    }
    child.once("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`${cmd} ${args} failed: ${code}`));
      }
      return resolve(trimOutput ? stdout?.trim() : stdout);
    });
  }) as Promise<string>;
