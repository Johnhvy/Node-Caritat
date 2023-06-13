import { stdin } from "process";

export default function readStdIn<B extends boolean>(
  isText: B = true as B
): Promise<B extends true ? string : Buffer> {
  const inputChunks = [];

  stdin.resume();
  if (isText) stdin.setEncoding("utf8");

  stdin.on("data", function (chunk) {
    inputChunks.push(chunk);
  });

  return new Promise((resolve, reject) => {
    stdin.on("end", () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolve(isText ? inputChunks.join() : (Buffer.concat(inputChunks) as any))
    );
    stdin.on("error", () => reject(new Error("error during read")));
    stdin.on("timeout", () => reject(new Error("timout during read")));
  });
}
