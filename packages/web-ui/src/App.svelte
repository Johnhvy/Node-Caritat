<script lang="ts">
  // @ts-ignore
  import encryptData from "@aduh95/caritat-crypto/encrypt";
  import uint8ArrayToBase64 from "./uint8ArrayToBase64.ts";

  const url = globalThis.location?.hash.slice(1);
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

  async function onSubmit(this: HTMLFormElement, event: SubmitEvent) {
    event.preventDefault();
    const textarea = this.elements.namedItem("ballot") as HTMLInputElement;
    const { encryptedSecret, data } = await encryptData(
      textEncoder.encode(textarea.value),
      await fetchedPublicKey
    );
    textarea.value = JSON.stringify({
      encryptedSecret: uint8ArrayToBase64(new Uint8Array(encryptedSecret)),
      data: uint8ArrayToBase64(data),
    });
    textarea.readOnly = true;
  }
</script>

<h1>Caritat</h1>

{#await fetchedBallot}
  <p>...loading</p>
{:then ballotPlainText}
  <form on:submit={onSubmit}>
    <textarea name="ballot">{ballotPlainText}</textarea>
    {#await fetchedPublicKey}
      <button type="button">Loading public key…</button>
    {:then}
      <button type="submit">Encrypt ballot</button>
    {/await}
  </form>
{:catch error}
  <p>
    Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation
  </p>
{/await}
