<script lang="ts">
  export let url;

  function onSubmit(this: HTMLFormElement, event: SubmitEvent) {
    event.preventDefault();
    globalThis.location.hash = (
      this.elements.namedItem("url") as HTMLInputElement
    ).value;
  }
</script>

<summary>Get URL to load the data</summary>

<form on:submit={onSubmit}>
  <div>
    <label
      >URL:
      <input type="url" value={url} name="url" /></label
    >
    <input type="submit" value="Load data" />
  </div>
</form>

<style>
  form div {
    display: flex;
    gap: 1ch;
  }
  label {
    display: inherit;
    gap: inherit;
    flex-grow: 2;
  }
  input[type="url"] {
    flex-grow: 2;
  }
</style>
