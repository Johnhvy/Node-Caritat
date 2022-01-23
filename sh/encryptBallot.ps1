# Usage: ./encryptBallot.sh ballot.yml publicKey.pem > $USERNAME.json
# requires openssl
# Outputs a json-formatetd string.

$ballotPath = $args[0]
$publicKeyFile = $args[1]

$tmpFile = New-TemporaryFile

# generate aes secret
openssl rand -out "$tmpFile" 32

Write-Host '{"encryptedSecret":"' -NoNewLine

$tmpFile2 = New-TemporaryFile

# encrypt as secret using rsa key
openssl pkeyutl -encrypt -in "$tmpFile" -inkey "$publicKeyFile" -pubin -out "$tmpFile2" `
  -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256


# Encoding in base64 for JSON compat
Write-Host $(openssl enc -base64 -A -in "$tmpFile2") -NoNewline

Remove-Item $tmpFile2

Write-Host  '","data":"' -NoNewLine

# encrypt ballot using aes
Write-Host $(
  openssl enc -aes-256-cbc -salt -iter 100000 -pbkdf2 -in $ballotPath -base64 -A -pass "file:$tmpFile"
) -NoNewline

Remove-Item $tmpFile
  
Write-Host '"}'
