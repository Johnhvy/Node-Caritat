#!/bin/sh

# Usage: ./voteUsingGit.sh <username> <repo-url> <branch-name> [<path-to-vote-folder>]

username=$1
repoUrl=$2
branch=$3
path=$4

__dirname="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 || exit ; pwd -P )"

[ -z "$path" ] && path="."

# shellcheck disable=SC2016
[ -z "$EDITOR" ] && echo 'Please define the $EDITOR env variable' && exit
[ -x "$(command -v "$EDITOR" || echo "$EDITOR")" ] || (\
  echo "Editor defined in the env is not executable; its current value is: $EDITOR" && exit )
[ -x "$__dirname/encryptBallot.sh" ] || ( echo "Cannot find executable: $__dirname/encryptBallot.sh" && exit )

tmpDir=$(mktemp -d 2>/dev/null || mktemp -d -t /tmp/caritat.XXXXXX)

# Cloning the repo in the temp directory.
(cd "$tmpDir" && git clone --branch "$branch" --no-tags --depth=1 "$repoUrl" .)

# Edit the ballot for the user to vote.
$EDITOR "$tmpDir/$path/ballot.yml"

# Encrypt the ballot with the public key
"$__dirname/encryptBallot.sh" "$tmpDir/$path/ballot.yml" "$tmpDir/$path/public.pem" > "$tmpDir/$path/$username.json"

# Commit the encrypted JSON vote data.
(cd "$tmpDir" && \
  git add "$tmpDir/$path/$username.json" && \
  git commit -m "vote from $username")

# Pushing to the remote repository.
(cd "$tmpDir" && \
  git push "$repoUrl" "HEAD:$branch") || \
  (cd "$tmpDir" && \
  # if the push failed, fetch latest commits could resolve the situation.
  git fetch "$repoUrl" "$branch" && \
  git reset --hard && \
  git rebase FETCH_HEAD && \
  git push "$repoUrl" "HEAD:$branch")

# Remove the temp directory.
rm -rf "$tmpDir"

