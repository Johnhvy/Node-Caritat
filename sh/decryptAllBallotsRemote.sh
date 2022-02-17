#!/bin/sh

repoUrl=$1
branch=$2
path=$3
privateKey=$4

__dirname="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 || exit ; pwd -P )"

[ -z "$path" ] && path="."
[ ! -x "$__dirname/decryptBallot.sh" ] && echo "Cannot find executable: $__dirname/decryptBallot.sh" && exit
[ ! -x "$__dirname/decryptAllBallotsLocal.sh" ] && echo "Cannot find executable: $__dirname/decryptAllBallotsLocal.sh" && exit

tmpDir=$(mktemp -d 2>/dev/null || mktemp -d -t /tmp/caritat.XXXXXX)

git -C "$tmpDir" clone --branch "$branch" --no-tags --depth=1 "$repoUrl" .

"$__dirname/decryptAllBallotsLocal.sh" "$tmpDir/$path" "$privateKey"
# git -C "$tmpDir" push
code "$tmpDir"

# rm -rf "$tmpDir"