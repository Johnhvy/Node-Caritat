# Changelog

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
