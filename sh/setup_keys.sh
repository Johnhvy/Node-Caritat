#!/bin/sh

[ -z "$OPENSSL_BIN" ] && OPENSSL_BIN=openssl
[ -z "$GPG_BIN" ] && GPG_BIN=gpg

# generate aes secret
secret=$("$OPENSSL_BIN" rand 32)

private="$("$OPENSSL_BIN" genrsa)"

public="$(printf "%s" "$private" | "$OPENSSL_BIN" rsa -outform PEM -pubout)"


echo "publicKey: |"
echo "$public" | awk '{ print "  " $0 }'

echo "encrencryptedPrivateKey: >-"
# encrypt private key using secret
printf "%s" "$private" | "$OPENSSL_BIN" enc -aes-256-cbc -salt -iter 100000 -pass "pass:$secret" -pbkdf2 -base64 | awk '{ print "  " $0 }'

echo

echo "encryptedSecret: >-"
# encrypt secret using GPG key
printf "%s" "$secret" | "$GPG_BIN" --encrypt --default-recipient-self --armor | awk '{ print "  " $0 }'
