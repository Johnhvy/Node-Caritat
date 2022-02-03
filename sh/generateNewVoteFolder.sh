#!/bin/sh

outDir=$1

__dirname="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 || exit ; pwd -P )"

[ -z "$outDir" ] && outDir="./vote"
mkdir -p "$outDir"

[ -z "$OPENSSL_BIN" ] && OPENSSL_BIN=openssl
[ -z "$GPG_BIN" ] && GPG_BIN=gpg

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

node "$__dirname/../dist/bin/generateBallot.js" -f "$outDir/vote.yml" > "$outDir/ballot.yml"
