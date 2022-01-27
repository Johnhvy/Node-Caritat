<script lang="ts">
    // @ts-ignore
     import encryptDataPromise from "@aduh95/caritat-crypto/encrypt";

const url = globalThis.location?.hash.slice(1)
let fetchedBallot, fetchedPublicKey
if(url) {
    fetchedBallot = fetch(url+"ballot.yml").then(response=>response.ok?response.text():Promise.reject(new Error(`Fetch error: ${response.status} ${response.statusText}`)))
    fetchedPublicKey = fetch(url+"public.pem").then(response=>response.ok?response.arrayBuffer():Promise.reject(new Error(`Fetch error: ${response.status} ${response.statusText}`)))
}

async function onSubmit(this:HTMLFormElement, event:SubmitEvent) {
    event.preventDefault()
    const {default:encryptData} = await encryptDataPromise
    const { encryptedSecret, data } = await encryptData(this.elements.namedItem('ballot')!.value, await fetchedPublicKey);
    console.log({encryptedSecret, data})
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
    {:catch error}
    {/await}
</form>
{:catch error}
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
{/await}
