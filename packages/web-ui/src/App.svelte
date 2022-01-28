<script lang="ts">
  import CopyEncrytptedBallotForm from "./CopyEncrytptedBallotForm.svelte";
  import FillBallotForm from "./FillBallotForm.svelte";
  import FindPrForm from "./FindPRForm.svelte";

  let encryptDataPromise = Promise.reject("no data received");

  let url = globalThis.location?.hash.slice(1);

  let step = url ? 1 : 0;

  addEventListener("hashchange", () => {
    url = globalThis.location?.hash.slice(1);

    step = url ? Math.max(step, 1) : 0;
  });

  function registerEncrypedBallot(promise) {
    encryptDataPromise = promise;
    promise.then(
      () => {
        step = 2;
      },
      () => {
        step = Math.min(step, 1);
      }
    );
  }
</script>

<h1>Caritat</h1>

<details open={step === 0}>
  <FindPrForm {url} />
</details>
<details open={step === 1}>
  <FillBallotForm {url} {registerEncrypedBallot} />
</details>
<details open={step === 2}>
  <CopyEncrytptedBallotForm {encryptDataPromise} />
</details>
