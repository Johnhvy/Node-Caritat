import * as shamir from "../src/shamir.ts";
import { it } from "node:test";

let key = crypto.getRandomValues(new Uint8Array(256));

console.log(shamir.splitKey(key.buffer, 255, 255), key);

it("should reconstruct key from enough shareholders");
