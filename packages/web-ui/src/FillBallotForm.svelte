<script lang="ts">
  import { beforeUpdate } from "svelte";

  // @ts-ignore
  import encryptData from "@aduh95/caritat-crypto/encrypt";
  // @ts-ignore
  import uint8ArrayToBase64 from "./uint8ArrayToBase64.ts";
  // @ts-ignore
  import fetchFromGitHub from "./fetchDataFromGitHub.ts";

  export let url, registerEncrypedBallot;

  let fetchedBallot, fetchedPublicKey;

  const textEncoder =
    typeof TextEncoder === "undefined" ? { encode() {} } : new TextEncoder();

  function onSubmit(this: HTMLFormElement, event: SubmitEvent) {
    event.preventDefault();
    const textarea = this.elements.namedItem("ballot") as HTMLInputElement;
    registerEncrypedBallot(
      (async () => {
        const { encryptedSecret, saltedCiphertext } = await encryptData(
          textEncoder.encode(textarea.value),
          await fetchedPublicKey
        );
        return JSON.stringify({
          encryptedSecret: uint8ArrayToBase64(new Uint8Array(encryptedSecret)),
          data: uint8ArrayToBase64(saltedCiphertext),
        });
      })()
    );
  }

  fetchedBallot = fetchedPublicKey = Promise.reject("no data");
  beforeUpdate(() => {
    fetchFromGitHub(url, (errOfResult) => {
      [fetchedBallot, fetchedPublicKey] = errOfResult;
    });
  });
</script>

<summary>Fill in ballot</summary>

{#await fetchedBallot}
  <p>...loading</p>
{:then ballotPlainText}
  <form on:submit={onSubmit}>
    <textarea name="ballot">{ballotPlainText}</textarea>
    {#await fetchedPublicKey}
      <button type="submit" disabled>Loading public key…</button>
    {:then}
      <button type="submit">Encrypt ballot</button>
    {/await}
  </form>
{:catch error}
  <p>
    An error occured: {error?.message ?? error}
  </p>
{/await}
