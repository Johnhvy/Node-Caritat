# Usage: ./$0.sh <username> <repo-url> <branch-name> [<path-to-vote-folder>]

$env = Get-Location

$username = $args[0]
$repoUrl = $args[1]
$branch = $args[2]
$path = $args[3]

$tmpDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }

git clone "$repoUrl" --branch "$branch" --single-branch --depth=1 "$tmpDir"

notepad "$tmpDir/$path/ballot.yml" | Out-Null


& sh/encryptBallot.sh "$tmpDir/$path/ballot.yml" "$tmpDir/$path/public.pem" > "$tmpDir/$path/$username.json"

Set-Location "$tmpDir/$path"


git add "$username.json" | Out-Null
git commit -m "vote from $username" | Out-Null

git push "$repoUrl" "HEAD:$branch" | Out-Null


Set-Location $env

Remove-Item -r "$tmpDir" -Force