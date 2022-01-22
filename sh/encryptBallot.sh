#!/bin/sh

# Usage: ./encryptBallot.sh ballot.yml publicKey.pem > $USERNAME.json
# requires openssl
# Outputs a json-formatetd string.

ballotPath=$1
publicKeyFile=$2

tmpfile=$(mktemp /tmp/caritat-ballot.XXXXXX)
exec 3>"$tmpfile"
exec 4<"$tmpfile"
rm "$tmpfile"

# generate aes secret
secret=$(openssl rand 32)

printf '{"key":"'

# encrypt as secret using rsa key
echo "$secret" |\
  openssl pkeyutl -encrypt -inkey "$publicKeyFile" -pubin \
   -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha512 |\
# Encoding in base64 for JSON compat
  openssl enc -base64 -A

printf '","data":"'
# encrypt ballot using aes
openssl enc -aes-256-cbc -salt -in "$ballotPath" -pass "pass:$secret" -pbkdf2 -base64 -A

echo '"}'
