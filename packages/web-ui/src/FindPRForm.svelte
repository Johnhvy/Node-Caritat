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
    flex-direction: column;
  }

  label {
    display: inherit;
    gap: inherit;
    flex-grow: 2;
    line-height: 2.5rem;
  }
  input[type="url"] {
    flex-grow: 2;
    border: 1px solid #ccc;
    border-radius: 5px;
    height: 2.5rem;
  }

  @media screen and (min-width: 800px) {
    form div {
      flex-direction: row;
    }

  }
</style>
