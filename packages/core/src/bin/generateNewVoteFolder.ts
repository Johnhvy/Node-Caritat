#!/usr/bin/env node

import fs from "fs";
import parseArgs from "../utils/parseArgs.js";

const parsedArgs = parseArgs()
.options({
    directory: {
        describe: 'The directory where the vote files should be created',
        demandOption: true,
        alias: 'd',
    },
    'vote-file': {
        describe: "Path to a YAML file that contains the vote instruction. If not provided, a blank template will be used",
        normalize: true,
        string: true,
    },
    'gpg-binary': {
        describe: "Path to the gpg binary (when not provided, looks in the $PATH)",
        normalize: true,
        string: true,
    }
})


[ -f "$outDir/vote.yml" ] && echo "$outDir/vote.yml already exist, aborting" && exit 1

cat > "$outDir/vote.yml" << EOF
subject: TODO

headerInstructions: TODO or remove this line if you do not need it

candidates:
  - TODO

footerInstructions: TODO or remove this line if you do not need it

method: Condorcet
allowedVoters:
  - TODO

EOF

private="$("$OPENSSL_BIN" genpkey -algorithm RSA -outform PEM)"

printf "%s" "$private" | "$OPENSSL_BIN" rsa -outform PEM -pubout > "$outDir/public.pem"

{
  echo "publicKey: |"
  awk '{ print "  " $0 }' "$outDir/public.pem"

  echo "encryptedPrivateKey: |"
  printf "%s" "$private" | "$GPG_BIN" --encrypt --default-recipient-self --armor | awk '{ print "  " $0 }'
} >> "$outDir/vote.yml"

$EDITOR "$outDir/vote.yml"

node "$__dirname/../packages/core/dist/bin/generateBallot.js" -f "$outDir/vote.yml" > "$outDir/ballot.yml"
