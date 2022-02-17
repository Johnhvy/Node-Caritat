#!/bin/sh

path=$1
privateKeyFile=$2

__dirname="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 || exit ; pwd -P )"


for file in "$path"/*.json;do
    author=$(jq '.["author"]' "$file")
    printf "Reading ballot from %s...\n" "$author"
    
    encryptedSecret=$(jq --raw-output '.["encryptedSecret"]' "$file")
    base64Ballot=$(jq --raw-output '.["data"]' "$file")
    "$__dirname/decryptBallot.sh" "$encryptedSecret" "$base64Ballot" "$privateKeyFile" > "${file%.*}.yml"
    git -C "$path" add "${file%.*}.yml"
    git -C "$path" rm "$file"
done
git -C "$path" commit -m "decrypt ballots"