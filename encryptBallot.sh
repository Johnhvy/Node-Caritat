#!/bin/sh

# Usage: ./encryptBallot.sh > $USERNAME.json
# requires openssl
# this file expects a public.pem and ballot.yml in current working directory
# returns a json-formatetd string

printf '{"key":"'
# generate aes secret
openssl rand 32 |\
\
# encrypt as secret using rsa key
openssl rsautl -encrypt -inkey public.pem -pubin | openssl enc -base64 -A

printf '","data":"'
# encrypt ballot using aes
openssl enc -aes-256-cbc -salt -in ballot.yml -pass file:./key.bin -pbkdf2 | openssl enc -base64 -A

echo '"}'
