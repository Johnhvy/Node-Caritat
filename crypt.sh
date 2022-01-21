#!/bin/bash

openssl rand 32 > key.bin
openssl enc -aes-256-cbc -salt -in ballotBob.yml -out ballotBob.yml.enc -pass file:./key.bin -pbkdf2 
openssl rsautl -encrypt -inkey public.pem -pubin -in key.bin -out key.bin.enc
sleep 1
echo '{"key":"'
openssl enc -base64 -in key.bin.enc
echo '","data":"'
openssl enc -base64 -in ballotBob.yml.enc
echo '"}'