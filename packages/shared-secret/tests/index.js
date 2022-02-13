const assert = require("assert");
const myModule = require("..");

console.log(Array.from(myModule.generateKeyParts(5, 3, 32)));
// assert.deepStrictEqual(myModule.compressKey(), 3);
// console.log("ok");
