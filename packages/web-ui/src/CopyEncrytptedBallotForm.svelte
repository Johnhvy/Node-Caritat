<script lang="ts">
  import { beforeUpdate } from "svelte";

  export let url, encryptDataPromise;

  let copyPromise;
  function copyToClipboard() {
    copyPromise = encryptDataPromise.then((data) =>
      navigator.clipboard.writeText(data)
    );
  }

  beforeUpdate(copyToClipboard);
</script>

<summary>Get encrypted ballot</summary>

{#await encryptDataPromise}
  <textarea readonly>Encrypting data… </textarea>
{:then data}
  <textarea readonly>{data}</textarea>
  <div>
    {#await copyPromise}
      Copying to the Clipboard…
    {:then}
      Copied to the clipboard!
    {:catch error}
      An error occured: {error?.message ?? error}
    {/await}
  </div>
  <button type="button" on:click={copyToClipboard}>Copy to clipboard</button>
{:catch error}
  An error occured: {error?.message ?? error}
{/await}
