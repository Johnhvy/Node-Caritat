<script lang="ts">
  // @ts-ignore
  import encryptData from "@aduh95/caritat-crypto/encrypt";
  // @ts-ignore
  import uint8ArrayToBase64 from "./uint8ArrayToBase64.ts";

  export let url, registerEncrypedBallot;

  let fetchedBallot, fetchedPublicKey;
  if (url) {
    fetchedBallot = fetch(url + "ballot.yml").then((response) =>
      response.ok
        ? response.text()
        : Promise.reject(
            new Error(`Fetch error: ${response.status} ${response.statusText}`)
          )
    );
    fetchedPublicKey = fetch(url + "public.pem").then((response) =>
      response.ok
        ? response.arrayBuffer()
        : Promise.reject(
            new Error(`Fetch error: ${response.status} ${response.statusText}`)
          )
    );
  }

  const textEncoder =
    typeof TextEncoder === "undefined" ? { encode() {} } : new TextEncoder();

  function onSubmit(this: HTMLFormElement, event: SubmitEvent) {
    event.preventDefault();
    const textarea = this.elements.namedItem("ballot") as HTMLInputElement;
    registerEncrypedBallot(
      (async () => {
        const { encryptedSecret, data } = await encryptData(
          textEncoder.encode(textarea.value),
          await fetchedPublicKey
        );
        return JSON.stringify({
          encryptedSecret: uint8ArrayToBase64(new Uint8Array(encryptedSecret)),
          data: uint8ArrayToBase64(data),
        });
      })()
    );
  }
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
