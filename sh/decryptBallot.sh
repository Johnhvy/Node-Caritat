#!/bin/sh

# Usage: ./decryptBallot.sh "base64EncryptedKey" "base64EncryptedBallot" privateKey.pem > $USERNAME.yml
# requires openssl
# Outputs a YAML-formated string.

encryptedKey=$1
encryptedBallot=$2
privateKey=$3

secret=$(\
printf "%s\n" "$encryptedKey" |\
openssl enc -d -base64 -A |\
# decrypt AES key
openssl pkeyutl -decrypt -inkey "$privateKey" \
 -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256)

# decrypt ballot using AES key
printf "%s\n" "$encryptedBallot" | openssl enc -d -aes-256-cbc -iter 100000 -salt -base64 -A -pass "pass:$secret" -pbkdf2
