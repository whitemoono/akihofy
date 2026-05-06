$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path
cd "d:\dev\AKIHO\akiho-core"
cargo build --release -j 1
