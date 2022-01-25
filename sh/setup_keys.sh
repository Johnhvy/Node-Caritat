#!/bin/sh

[ -z "$OPENSSL_BIN" ] && OPENSSL_BIN=openssl
[ -z "$GPG_BIN" ] && GPG_BIN=gpg

# generate aes secret
secret=$("$OPENSSL_BIN" rand 32)

private="$("$OPENSSL_BIN" genrsa)"

public="$(printf "%s" "$private" | "$OPENSSL_BIN" rsa -outform PEM -pubout)"


echo "publicKey: |"
echo "$public" | awk '{ print "  " $0 }'

echo "encryptedPrivateKey: |"
# encrypt private key using secret
printf "%s" "$private" | "$GPG_BIN" --encrypt --default-recipient-self --armor | awk '{ print "  " $0 }'
