<script lang="ts">
  export let updateAuth, username, token;

  function onSubmit(this: HTMLFormElement, event: SubmitEvent) {
    event.preventDefault();

    updateAuth(this.username.value, this.token.value);
  }
</script>

<summary>GitHub credentials</summary>

<p>
  If you are trying to vote on a private repository, or hitting GitHub API rate
  limits, you can supply a token for the API calls.
</p>

<form on:submit={onSubmit}>
  <div>
    <label
      >Username:
      <input name="username" value={username} /></label
    >
    <label
      >Token:
      <input
        name="token"
        value={token}
        type="password"
        placeholder="gho_…"
      /></label
    >
    <button type="submit">Save</button>
  </div>
</form>

<p>The token should have at least the <code>repo</code> permissions.</p>

<style>
  form div {
    display: flex;
    gap: 2ch;
    flex-direction: column;
  }
  label{
    display: inherit;
    gap: 1ch;
    justify-content: space-between;
  }

  @media screen and (min-width: 800px) {
    form div {
      flex-direction: row;
    }
  }
</style>
