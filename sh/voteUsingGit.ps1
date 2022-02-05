# Usage: ./voteUsingGit.ps1 <username> <repo-url> <branch-name> [<path-to-vote-folder>]

$ErrorActionPreference = "Stop"

$env = Get-Location

$username = $args[0]
$repoUrl = $args[1]
$branch = $args[2]
$path = $args[3]

$tmpDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }

git clone "$repoUrl" --branch "$branch" --single-branch --depth=1 "$tmpDir"

notepad "$tmpDir/$path/ballot.yml" | Out-Null

& "$PSScriptRoot\encryptBallot.ps1" "$($tmpDir)\$($path)\ballot.yml" "$($tmpDir)\$($path)\public.pem" *>&1 |`
    Out-File -FilePath "$tmpDir/$path/$username.json" -Encoding  ascii -NoNewline

Set-Location "$tmpDir/$path"


git add "$username.json" | Out-Null
git commit -m "vote from $username" | Out-Null

git push "$repoUrl" "HEAD:$branch" | Out-Null


Set-Location $env

Remove-Item -r "$tmpDir" -Force