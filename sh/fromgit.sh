#!/bin/sh

# Usage: ./$0.sh <username> <repo-url> <branch-name> [<path-to-vote-folder>]

username=$1
repoUrl=$2
branch=$3
path=$4

tmpDir=$(mktemp -d 2>/dev/null || mktemp -d -t /tmp/caritat.XXXXXX)
echo "$tmpDir"


git clone "$repoUrl" --branch "$branch" --single-branch --depth=1 "$tmpdir"


$EDITOR "$tmpDir/$path/ballot.yml"

./encryptBallot.sh  "$tmpDir/$path/ballot.yml" "$tmpDir/$path/public.pem" > "$username.json"

cd "$tmpDir/$path" || exit 1
git add "$username.json"
git commit -m "vote from $username"

git push "$repoUrl" "HEAD:$branch"

# rm -rf "$tmpDir"

