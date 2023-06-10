<script lang="ts">
  import { beforeUpdate } from "svelte";

  import encryptData from "@aduh95/caritat-crypto/encrypt";
  import uint8ArrayToBase64 from "./uint8ArrayToBase64.ts";
  import fetchFromGitHub from "./fetchDataFromGitHub.ts";

  export let url, username, token, registerEncryptedBallot;

  let fetchedBallot: Promise<string>, fetchedPublicKey;

  const textEncoder =
    typeof TextEncoder === "undefined" ? { encode() {} } : new TextEncoder();

  function onSubmit(this: HTMLFormElement, event: SubmitEvent) {
    event.preventDefault();
    const textarea = this.elements.namedItem("ballot") as HTMLInputElement;
    registerEncryptedBallot(
      (async () => {
        const { encryptedSecret, saltedCiphertext } = await encryptData(
          textEncoder.encode(textarea.value) as Uint8Array,
          await fetchedPublicKey
        );
        return JSON.stringify({
          encryptedSecret: uint8ArrayToBase64(new Uint8Array(encryptedSecret)),
          data: uint8ArrayToBase64(saltedCiphertext),
        });
      })()
    );
  }

  /*** Fisher-Yates shuffle */
  function shuffle<T>(array: Array<T>): Array<T> {
    let currentIndex = array.length,
      randomIndex: number;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }

    return array;
  }

  fetchedBallot = fetchedPublicKey = Promise.reject("no data");
  beforeUpdate(() => {
    fetchFromGitHub({ url, username, token }, (errOfResult) => {
      [fetchedBallot, fetchedPublicKey] = errOfResult;
      // TODO: make this dependant on the thing in vote.yml
      const shoudlshuffle = true;
      if(shoudlshuffle){
        fetchedBallot = fetchedBallot.then((ballotData)=>{
          const exp = /\n(?!\s)/
          const titleString = "  - title: "
          const sectionString = "\npreferences:\n"
          const parts0 = ballotData.split(sectionString,2)
          const parts1 = parts0[1].split(exp,2)
          const candidates = titleString + shuffle((parts1[0]+"\n").split(titleString).slice(1)).join(titleString)
          return parts0[0]+sectionString+candidates+parts1[1]
        });
      }
    });
  });

</script>

<summary>Fill in ballot</summary>

{#await fetchedBallot}
  <p>...loading as {username || "anonymous"}</p>
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
    An error occurred: {error?.message ?? error}
  </p>

  {#if !token || !username}
    <p>
      Maybe consider providing an access token, authenticated API calls are more
      likely to succeed.
    </p>
  {/if}
{/await}
