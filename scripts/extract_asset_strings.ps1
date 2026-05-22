param(
  [Parameter(Mandatory = $true)]
  [string]$Path,

  [string]$Pattern = "Quirk|quirk",

  [int]$MinLength = 4
)

$bufferSize = 1MB
$buffer = New-Object byte[] $bufferSize
$builder = New-Object System.Text.StringBuilder
$seen = [System.Collections.Generic.HashSet[string]]::new()
$regex = [regex]::new($Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

function Flush-String {
  param([System.Text.StringBuilder]$Builder)

  if ($Builder.Length -lt $MinLength) {
    [void]$Builder.Clear()
    return
  }

  $value = $Builder.ToString()
  if ($regex.IsMatch($value) -and $seen.Add($value)) {
    $value
  }

  [void]$Builder.Clear()
}

$stream = [System.IO.File]::OpenRead($Path)
try {
  while (($read = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
    for ($i = 0; $i -lt $read; $i++) {
      $byte = $buffer[$i]
      if ($byte -ge 32 -and $byte -le 126) {
        [void]$builder.Append([char]$byte)
      } else {
        Flush-String $builder
      }
    }
  }

  Flush-String $builder
} finally {
  $stream.Dispose()
}
