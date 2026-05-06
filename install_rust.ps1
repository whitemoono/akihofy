# Rust Installation Script
$env:RUSTUP_DIST_SERVER = "https://mirrors.ustc.edu.cn/rust-static"
$env:RUSTUP_UPDATE_ROOT = "https://mirrors.ustc.edu.cn/rust-static"

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "$env:TEMP\rustup-init.exe"
$psi.Arguments = "--default-toolchain stable --profile minimal --default-host x86_64-pc-windows-gnu"
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $psi
$process.Start() | Out-Null

# Send "1" to proceed with installation
$process.StandardInput.WriteLine("1")
$process.StandardInput.Close()

$stdout = $process.StandardOutput.ReadToEnd()
$stderr = $process.StandardError.ReadToEnd()
$process.WaitForExit()

Write-Output "Exit Code: $($process.ExitCode)"
Write-Output "STDOUT: $stdout"
Write-Output "STDERR: $stderr"
