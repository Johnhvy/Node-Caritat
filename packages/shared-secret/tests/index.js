// const assert = require("assert");
import * as myModule from "../index.js";

console.log(
  Array.from(myModule.generateKeyParts(5, 3, 1), (a) =>
    Buffer.from(a).toString("hex")
  )
);
console.log(
  Buffer.from(
    myModule.reconstructKey(...myModule.generateKeyParts(5, 3, 1))
  ).toString("hex")
);
// assert.deepStrictEqual(myModule.compressKey(), 3);
// console.log("ok");
