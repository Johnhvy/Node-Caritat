#!/bin/sh

outDir=$1

__dirname="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 || exit ; pwd -P )"

[ -z "$outDir" ] && outDir="./vote"
mkdir -p "$outDir"

[ -z "$OPENSSL_BIN" ] && OPENSSL_BIN=openssl
[ -z "$GPG_BIN" ] && GPG_BIN=gpg
[ -z "$NODE_BIN" ] && NODE_BIN=node

[ -f "$outDir/vote.yml" ] && echo "$outDir/vote.yml already exist, aborting" && exit 1

# generate private key
private="$("$OPENSSL_BIN" genpkey -algorithm RSA)"

# generate aes secret
secret=$("$OPENSSL_BIN" rand 32)

# derive public key from private key
printf "%s" "$private" | "$OPENSSL_BIN" rsa -outform PEM -pubout > "$outDir/public.pem"

{
  cat << EOF
subject: TODO

headerInstructions: TODO or remove this line if you do not need it

candidates:
  - TODO

footerInstructions: TODO or remove this line if you do not need it

method: Condorcet
allowedVoters:
  - TODO

EOF

  echo "publicKey: |"
  awk '{ print "  " $0 }' "$outDir/public.pem"

  echo "encryptedPrivateKey: >-"
  printf "%s" "$private" | "$OPENSSL_BIN" enc -aes-256-cbc -salt -iter 100000 -pass "pass:$secret" -pbkdf2 -base64 -A | awk '{ print "  " $0 }'

  echo 'shares:'
  echo '  - |'
  printf "%s" "$secret" | "$GPG_BIN" --encrypt --default-recipient-self --armor | awk '{ print "    " $0 }'
} > "$outDir/vote.yml"

$EDITOR "$outDir/vote.yml"

"$NODE_BIN" "$__dirname/../packages/core/dist/bin/generateBallot.js" -f "$outDir/vote.yml" > "$outDir/ballot.yml"
