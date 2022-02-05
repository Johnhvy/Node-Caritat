<script lang="ts">
  import { beforeUpdate } from "svelte";

  export let encryptDataPromise: Promise<string | never>;

  let copyPromise: Promise<void>;
  let showError: boolean;
  function copyToClipboard(ev?: Event) {
    copyPromise = encryptDataPromise.then((data) =>
      navigator.clipboard.writeText(data)
    );
    // Don't show the error if there was no user interactions:
    showError = ev != null;
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
      {#if showError}
        An error occured: {error?.message ?? error}
      {/if}
    {/await}
  </div>
  <button type="button" on:click={copyToClipboard}>Copy to clipboard</button>
{:catch error}
  An error occured: {error?.message ?? error}
{/await}
