# Changelog

## [2.0.0](https://github.com/Johnhvy/Node-Caritat/compare/v1.6.0...v2.0.0) (2024-07-16)


### ⚠ BREAKING CHANGES

* switch to `@node-core` scope ([#11](https://github.com/Johnhvy/Node-Caritat/issues/11))

### Features

* **cli:** add `doNotShuffleCandidates` flag to `generateNewVoteFolder` ([451866a](https://github.com/Johnhvy/Node-Caritat/commit/451866ad266371279e029ae80b3f2ad7245a0eb2))
* **cli:** expose `decryptKeyPart` ([a91ff28](https://github.com/Johnhvy/Node-Caritat/commit/a91ff2845fd00913dcaa8b1c0c8e4fa1e68b7782))
* **core:** add `missingVoices` property to vote result ([#43](https://github.com/Johnhvy/Node-Caritat/issues/43)) ([e4b73b5](https://github.com/Johnhvy/Node-Caritat/commit/e4b73b5c2864bf75d37e4a5a68e7d6ff936ef440))
* **core:** add `pushToRemote` option to more places ([#39](https://github.com/Johnhvy/Node-Caritat/issues/39)) ([cbc8a59](https://github.com/Johnhvy/Node-Caritat/commit/cbc8a596c6e3b2fa6aa924458d1ae383d03c9060))
* **core:** add an abort option when casting a vote ([425ec49](https://github.com/Johnhvy/Node-Caritat/commit/425ec493f76cae60ff208af5fe65fd4e3f4840d4))
* **core:** add an option to skip pushing init vote commit ([#31](https://github.com/Johnhvy/Node-Caritat/issues/31)) ([0760e59](https://github.com/Johnhvy/Node-Caritat/commit/0760e59f15b59141b89d8b2fd8e3fb38a44c4e60))
* **core:** expose private key as an armored string ([f34886e](https://github.com/Johnhvy/Node-Caritat/commit/f34886ea5f03105ca62cd8cd54cbe426336480f4))
* **core:** expose vote summary methods ([120d650](https://github.com/Johnhvy/Node-Caritat/commit/120d650ac3b3afa7fe376cc59c1a05f4e6a07719))
* **core:** generate ballots with non-zero preferences ([b76eed3](https://github.com/Johnhvy/Node-Caritat/commit/b76eed3ba75d5d2c05572acf33d8d01552515f1e))
* empty commit to test the release automation ([730351e](https://github.com/Johnhvy/Node-Caritat/commit/730351e9f5dc59f300558a1053e58a647406ef26))
* **web-ui:** update CSS ([cff6c41](https://github.com/Johnhvy/Node-Caritat/commit/cff6c41dfcfc4add9efa1d5646c3afe3d5040487))


### Bug Fixes

* add `permissions` for GHA workflows ([bb80eca](https://github.com/Johnhvy/Node-Caritat/commit/bb80eca2a9b467361b3d53d9ec5a5dd5cb1b221b))
* **chore:** run `$EDITOR` within a shell ([#23](https://github.com/Johnhvy/Node-Caritat/issues/23)) ([adcbb67](https://github.com/Johnhvy/Node-Caritat/commit/adcbb67903e0d523f70ed0ff995ee5d85cf804e6))
* **cli:** add back support for boolean `--gpg-sign` ([0013834](https://github.com/Johnhvy/Node-Caritat/commit/0013834e2cda5b94d52f222086f6804376846085))
* **cli:** add hashbangs to all executables ([8624faf](https://github.com/Johnhvy/Node-Caritat/commit/8624faf2f6c83cc2c54b4baea73de912a6aa8cad))
* **cli:** add README to the npm package ([e181a15](https://github.com/Johnhvy/Node-Caritat/commit/e181a1524735ccdfeba0505ffe90b63edb0d47b0))
* **cli:** output the private key as armored string in vote summary ([628e77e](https://github.com/Johnhvy/Node-Caritat/commit/628e77e20937af39a16b8be7435b50551f3bb7c0))
* **core:** do not assume cwd is on top of the vote branch ([#46](https://github.com/Johnhvy/Node-Caritat/issues/46)) ([1399904](https://github.com/Johnhvy/Node-Caritat/commit/13999042b3fa452616c07942ac2355805cd237f5))
* **core:** do not crash the vote count in case of invalid ballot ([#45](https://github.com/Johnhvy/Node-Caritat/issues/45)) ([5985ba0](https://github.com/Johnhvy/Node-Caritat/commit/5985ba0885e27396d7f3af0323e0d3415cd14d85))
* **core:** do not remove folders that were not created by us ([c86b35f](https://github.com/Johnhvy/Node-Caritat/commit/c86b35f4a2a8cdecbd6a2ee44254b0a7a16cf403))
* **core:** fix abort request detection ([4b3feaa](https://github.com/Johnhvy/Node-Caritat/commit/4b3feaa2d0cfcbb98ca1fdeb5dc6e15e232ab27b))
* **core:** fix typescript errors ([d543a67](https://github.com/Johnhvy/Node-Caritat/commit/d543a679388ba96145e52a3ec84c0e1e4ca3b101))
* **core:** treat elections with no list of allowed voters as public votes ([ca50b70](https://github.com/Johnhvy/Node-Caritat/commit/ca50b70a7019f098c49eb46b28885ae4fc645eae))
* **core:** use `git restore` to remove vote files ([#25](https://github.com/Johnhvy/Node-Caritat/issues/25)) ([ad5df98](https://github.com/Johnhvy/Node-Caritat/commit/ad5df98ad586a898b9d2bf92f2d67daa12e36172))
* **deploy:** empty commit to trigger a release ([90e26b0](https://github.com/Johnhvy/Node-Caritat/commit/90e26b0d77f4953d10d59bbc8c6f4b6b870be447))
* **deploy:** use `"packages"` field in Release Please config ([d908f95](https://github.com/Johnhvy/Node-Caritat/commit/d908f9549dbd8847e925f9b493efd4a0cd148ed7))
* **deps:** bump npm dependencies ([#34](https://github.com/Johnhvy/Node-Caritat/issues/34)) ([4a290e5](https://github.com/Johnhvy/Node-Caritat/commit/4a290e523acfc365b5d917f5ef4b6596aa9dc23e))
* empty commit to test the release automation ([e4a8299](https://github.com/Johnhvy/Node-Caritat/commit/e4a82993567760e3dde0dd8198deb6c7c6c6959a))
* **web-ui:** do not fetch data about irrelevant commits ([369e613](https://github.com/Johnhvy/Node-Caritat/commit/369e613dc0a34456cd700de9a0032f640e6e1a02))
* **web-ui:** restore support for unauthenticated votes on public repos ([6eb0c50](https://github.com/Johnhvy/Node-Caritat/commit/6eb0c503e423f345b742020c80c625929bd2b02c))
* **web-ui:** support vote happening on the root folder ([39cdd30](https://github.com/Johnhvy/Node-Caritat/commit/39cdd30960e2dc2a9657060d04151e9873d4cd3b))


### Miscellaneous Chores

* switch to `[@node-core](https://github.com/node-core)` scope ([#11](https://github.com/Johnhvy/Node-Caritat/issues/11)) ([54a0d9a](https://github.com/Johnhvy/Node-Caritat/commit/54a0d9acc08a36b5a6a787fba263e7cc6c44f412))

## [1.6.0](https://github.com/nodejs/caritat/compare/v1.5.0...v1.6.0) (2024-06-26)


### Features

* **core:** add `missingVoices` property to vote result ([#43](https://github.com/nodejs/caritat/issues/43)) ([dac0a32](https://github.com/nodejs/caritat/commit/dac0a324f29f6c069d4fcfed172f83ea12233087))


### Bug Fixes

* **core:** do not assume cwd is on top of the vote branch ([#46](https://github.com/nodejs/caritat/issues/46)) ([ed00bfd](https://github.com/nodejs/caritat/commit/ed00bfddc3776cf235fed80669c429e8a3aebfe9))
* **core:** do not crash the vote count in case of invalid ballot ([#45](https://github.com/nodejs/caritat/issues/45)) ([4fcce30](https://github.com/nodejs/caritat/commit/4fcce30cd050e4ba2f27e86f21ed7dda2ae56f78))

## [1.5.0](https://github.com/nodejs/caritat/compare/v1.4.1...v1.5.0) (2024-06-07)


### Features

* **core:** add `pushToRemote` option to more places ([#39](https://github.com/nodejs/caritat/issues/39)) ([a73d9a8](https://github.com/nodejs/caritat/commit/a73d9a836378ba530ea48f7db15ea657ec0b683c))

## [1.4.1](https://github.com/nodejs/caritat/compare/v1.4.0...v1.4.1) (2024-06-06)


### Bug Fixes

* **deps:** bump npm dependencies ([#34](https://github.com/nodejs/caritat/issues/34)) ([b548f76](https://github.com/nodejs/caritat/commit/b548f7692bad85b15ba3f747578dc410abfdc808))

## [1.4.0](https://github.com/nodejs/caritat/compare/v1.3.1...v1.4.0) (2024-06-01)


### Features

* **core:** add an option to skip pushing init vote commit ([#31](https://github.com/nodejs/caritat/issues/31)) ([7da1c6a](https://github.com/nodejs/caritat/commit/7da1c6a29fba9daf43ab08a5d5af1b5d105fb7aa))


### Bug Fixes

* **core:** use `git restore` to remove vote files ([#25](https://github.com/nodejs/caritat/issues/25)) ([562f49b](https://github.com/nodejs/caritat/commit/562f49bbc4e9612a065eef1f7525839ed5c1ce4a))

## [1.3.1](https://github.com/nodejs/caritat/compare/v1.3.0...v1.3.1) (2024-04-30)


### Bug Fixes

* **chore:** run `$EDITOR` within a shell ([#23](https://github.com/nodejs/caritat/issues/23)) ([df3fade](https://github.com/nodejs/caritat/commit/df3fade69edafb7c34ec5f3709c8769a89401c62))

## [1.3.0](https://github.com/nodejs/caritat/compare/v1.2.1...v1.3.0) (2023-11-10)


### Features

* **core:** expose vote summary methods ([ffa5d55](https://github.com/nodejs/caritat/commit/ffa5d556376b464743359ca3d35be1c6d0e7dc3e))
* **core:** generate ballots with non-zero preferences ([6dca5fb](https://github.com/nodejs/caritat/commit/6dca5fb6a50228d2ca8b6b52b58f423ece5f5534))


### Bug Fixes

* **core:** fix abort request detection ([769fbba](https://github.com/nodejs/caritat/commit/769fbbadf01e481a1977aebe1be6da084b58edf8))
* **web-ui:** do not fetch data about irrelevant commits ([3e80952](https://github.com/nodejs/caritat/commit/3e80952a0cffa16ee9374238ec60692bb5b0d640))

## [1.2.1](https://github.com/nodejs/caritat/compare/v1.2.0...v1.2.1) (2023-10-25)


### Bug Fixes

* **core:** do not remove folders that were not created by us ([0562e19](https://github.com/nodejs/caritat/commit/0562e197a3a378d96a0a67111cba5db83cb1e396))

## [1.2.0](https://github.com/nodejs/caritat/compare/v1.1.1...v1.2.0) (2023-09-03)


### Features

* **core:** expose private key as an armored string ([aa7a6ec](https://github.com/nodejs/caritat/commit/aa7a6ec9d3dea44576d66a6221eafa5e351c83db))


### Bug Fixes

* **cli:** output the private key as armored string in vote summary ([648b10a](https://github.com/nodejs/caritat/commit/648b10a46ef72d6b5680d8cb3648f8b448305bd1))

## [1.1.1](https://github.com/nodejs/caritat/compare/v1.1.0...v1.1.1) (2023-08-14)


### Bug Fixes

* **cli:** add hashbangs to all executables ([98750a9](https://github.com/nodejs/caritat/commit/98750a90ffef8330be5f143a2fa98fb6ed49ba11))

## [1.1.0](https://github.com/nodejs/caritat/compare/v1.0.1...v1.1.0) (2023-08-14)


### Features

* **cli:** add `doNotShuffleCandidates` flag to `generateNewVoteFolder` ([bc41029](https://github.com/nodejs/caritat/commit/bc4102991ac4de222c57a44deefd367434b4fd19))
* **cli:** expose `decryptKeyPart` ([d7b60b1](https://github.com/nodejs/caritat/commit/d7b60b1d140d7e9f0dec5e356987727d8ac0388c))
* **core:** add an abort option when casting a vote ([ef5d63c](https://github.com/nodejs/caritat/commit/ef5d63c78dc9e1733f348e4a062ab7483dd7233e))


### Bug Fixes

* **cli:** add back support for boolean `--gpg-sign` ([54f1967](https://github.com/nodejs/caritat/commit/54f19675c6fee1c4c626c5416c204f53af17cf02))
* **core:** treat elections with no list of allowed voters as public votes ([46147b5](https://github.com/nodejs/caritat/commit/46147b58ecb0ce12d9acd5423234d2c259caacd5))
* **web-ui:** restore support for unauthenticated votes on public repos ([d9b1912](https://github.com/nodejs/caritat/commit/d9b19127f1f828777b54d330f8e767f862fd706c))
* **web-ui:** support vote happening on the root folder ([a4e75cf](https://github.com/nodejs/caritat/commit/a4e75cf2725d7ea30b0073e11ba2581d87c39bbc))

## [1.0.1](https://github.com/nodejs/caritat/compare/v1.0.0...v1.0.1) (2023-06-28)


### Bug Fixes

* **core:** fix typescript errors ([e263608](https://github.com/nodejs/caritat/commit/e2636089270e8d822b2aea4e5da3e03bf0d3bc2a))

## [1.0.0](https://github.com/nodejs/caritat/compare/v0.6.2...v1.0.0) (2023-06-28)


### ⚠ BREAKING CHANGES

* switch to `@node-core` scope ([#11](https://github.com/nodejs/caritat/issues/11))

### Features

* **web-ui:** update CSS ([63c6ad6](https://github.com/nodejs/caritat/commit/63c6ad6e471088c3c563a8aab1687d2bc87fca1e))


### Miscellaneous Chores

* switch to `@node-core` scope ([#11](https://github.com/nodejs/caritat/issues/11)) ([9887a8b](https://github.com/nodejs/caritat/commit/9887a8b089ce930b2920bd7e1f78e4210491d16f))

## [0.6.2](https://github.com/aduh95/caritat/compare/v0.6.1...v0.6.2) (2023-06-13)


### Bug Fixes

* empty commit to test the release automation ([831c44f](https://github.com/aduh95/caritat/commit/831c44fc364acf087fa51b5e25c835baded4db52))

## [0.6.1](https://github.com/aduh95/caritat/compare/v0.6.0...v0.6.1) (2023-06-13)


### Bug Fixes

* **cli:** add README to the npm package ([d6e7d26](https://github.com/aduh95/caritat/commit/d6e7d2689ec13feaf326a6d3477fcbd304386f3e))

## [0.6.0](https://github.com/aduh95/caritat/compare/v0.5.1...v0.6.0) (2023-06-13)


### Features

* empty commit to test the release automation ([63bf4ee](https://github.com/aduh95/caritat/commit/63bf4ee931f06a957f5ce7dbac9099016fb0cb5b))
