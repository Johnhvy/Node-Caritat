#!/bin/sh

publicKeyFile=$1

[ -z "$OPENSSL_BIN" ] && OPENSSL_BIN=openssl

# tmpFile=$(mktemp -t /tmp/caritat.XXXXXX)

# generate aes secret
secret=$("$OPENSSL_BIN" rand 32)

private="$("$OPENSSL_BIN" genrsa)"

public="$(printf "%s" "$private" | "$OPENSSL_BIN" rsa -outform PEM -pubout)"


echo "publicKey: |"
echo "$public" | awk '{ print "  " $0 }'

echo "encrencryptedPrivateKey: >-"
printf '  '
printf "%s" "$private" | "$OPENSSL_BIN" enc -aes-256-cbc -salt -iter 100000 -pass "pass:$secret" -pbkdf2 -base64 -A

echo

echo "encryptedSecret: >-"
printf '  '
# encrypt as secret using rsa key
printf "%s" "$secret" |\
  "$OPENSSL_BIN" pkeyutl -encrypt -inkey "$publicKeyFile" -pubin \
   -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 |\
# Encoding in base64 for JSON compat
  "$OPENSSL_BIN" enc -base64 -A

  echo
