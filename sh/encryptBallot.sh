#!/bin/sh

# Usage: ./encryptBallot.sh ballot.yml publicKey.pem > $USERNAME.json
# requires openssl
# Outputs a json-formatetd string.

ballotPath=$1
publicKeyFile=$2

# generate aes secret
secret=$(openssl rand 32)

printf '{"encryptedSecret":"'

# encrypt as secret using rsa key
printf "%s" "$secret" |\
  openssl pkeyutl -encrypt -inkey "$publicKeyFile" -pubin \
   -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 |\
# Encoding in base64 for JSON compat
  openssl enc -base64 -A

printf '","data":"'
# encrypt ballot using aes
openssl enc -aes-256-cbc -salt -iter 100000 -in "$ballotPath" -pass "pass:$secret" -pbkdf2 -base64 -A

echo '"}'
