#!/bin/sh
openssl genpkey -algorithm RSA -out key.pem
openssl pkey -in key.pem -pubout -out public.pem
