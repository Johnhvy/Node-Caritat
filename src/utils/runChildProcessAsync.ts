import { spawn } from "child_process";

export default (
  cmd: string,
  args: any[] | readonly string[],
  { captureStdout = false, spawnArgs = {} } = {}
) =>
  new Promise((resolve, reject) => {
    const opt = {
      stdio: captureStdout ? ["inherit", "pipe", "inherit"] : "inherit",
      ...spawnArgs,
    };
    const child = spawn(cmd, args, opt as any);
    let stdout;
    if (captureStdout) {
      stdout = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
    }
    child.once("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`${cmd} ${args} failed: ${code}`));
      }
      return resolve(stdout?.trim());
    });
  }) as Promise<string>;
