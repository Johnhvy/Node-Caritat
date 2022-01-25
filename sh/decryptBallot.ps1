# Usage: ./decryptBallot.sh "base64EncryptedKey" "base64EncryptedBallot" privateKey.pem > $USERNAME.yml
# requires openssl
# Outputs a YAML-formated string.

# Example using jq:
# jq --arg space ' ' --arg script 'sh/decryptBallot.ps1' -r '$script + $space + .encryptedSecret + $space + .data + $space + $key' --arg key 'sh/key.pem'| powershell

$encryptedKey = $args[0]
$encryptedBallot = $args[1]
$privateKeyFile = $args[2]

Write-Host ""

$tmpFile = New-TemporaryFile
$tmpFile2 = New-TemporaryFile

$encryptedKey | openssl enc -d -base64 -A -out "$tmpFile" |
# decrypt AES key
openssl pkeyutl -decrypt -in "$tmpFile" -out "$tmpFile2" -inkey "$privateKeyFile"`
  -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256
Remove-Item $tmpFile

Write-Host $(
  # decrypt ballot using AES key
  $encryptedBallot | 
  openssl enc -d -aes-256-cbc -iter 100000 -md sha256 -salt -base64 -A -pass "file:$tmpFile2" -pbkdf2 -nopad
)
Remove-Item $tmpFile2

