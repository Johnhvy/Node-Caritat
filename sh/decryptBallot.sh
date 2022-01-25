#!/bin/sh

# Usage: ./decryptBallot.sh "base64EncryptedKey" "base64EncryptedBallot" privateKey.pem > $USERNAME.yml
# requires openssl
# Outputs a YAML-formated string.

# Example using jq:
# jq --arg space ' ' --arg script 'sh/decryptBallot.sh' -r '$script + $space + .encryptedSecret + $space + .data + $space + $key' --arg key 'sh/key.pem'| sh


encryptedKey=$1
encryptedBallot=$2
privateKey=$3

[ -z "$OPENSSL_BIN" ] && OPENSSL_BIN=openssl

secret=$(\
printf "%s\n" "$encryptedKey" |\
"$OPENSSL_BIN" enc -d -base64 -A |\
# decrypt AES key
"$OPENSSL_BIN" pkeyutl -decrypt -inkey "$privateKey" \
 -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256)

# decrypt ballot using AES key
printf "%s\n" "$encryptedBallot" | "$OPENSSL_BIN" enc -d -aes-256-cbc -iter 100000 -md sha256 -salt -base64 -A -pass "pass:$secret" -pbkdf2 -nopad && printf "\n\n\n==================SUCCESS=============\n\n\n" >&2
