# PowerShell Script Dong bo va Publish ma nguon MemoryWeaver len GitHub
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "         MEMORYWEAVER - HUONG DAN VA DONG BO GITHUB CHINH THUC         " -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kiem tra git da cai dat chua
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[LOI] May cua ban chua cai dat Git!" -ForegroundColor Red
    Write-Host "Vui long cai Git tu https://git-scm.com/ va thu lai." -ForegroundColor Yellow
    exit 1
}

# 2. Kiem tra repository
if (-not (Test-Path ".git")) {
    Write-Host "Dang khoi tao Git repository..." -ForegroundColor Green
    git init
    git branch -M main
}

# 3. Kiem tra Remote Origin
$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host "Chua co dia chi GitHub Remote (origin)!" -ForegroundColor Yellow
    Write-Host "Hay nhap URL repository GitHub cua ban" -ForegroundColor White
    Write-Host "(Vi du: https://github.com/TenTaiKhoan/MemoryWeaver.git): " -NoNewline -ForegroundColor Green
    $repoUrl = Read-Host
    if ($repoUrl -and $repoUrl.Trim()) {
        git remote add origin $repoUrl.Trim()
        Write-Host "Da them remote origin: $repoUrl" -ForegroundColor Green
    } else {
        Write-Host "Ban chua nhap URL. Script se chi tao commit tren may cuc bo." -ForegroundColor Yellow
    }
} else {
    Write-Host "Remote hien tai: $remote" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "[1/3] Dang chuan bi tep va kiem tra trang thai..." -ForegroundColor Green
git add .

$status = git status --porcelain
if ($status) {
    Write-Host "[2/3] Dang tao Commit..." -ForegroundColor Green
    $msg = "feat: upgrade MemoryWeaver dual-experience, voice interaction, and medical Alzheimer documentation"
    git commit -m $msg
    Write-Host "Da tao commit: $msg" -ForegroundColor Green
} else {
    Write-Host "Khong co thay doi moi can commit." -ForegroundColor DarkGray
}

# 4. Push len GitHub
$currentRemote = git remote get-url origin 2>$null
if ($currentRemote) {
    Write-Host ""
    Write-Host "[3/3] Ban co muon PUSH ma nguon len GitHub ngay bay gio khong? (Y/N): " -NoNewline -ForegroundColor Yellow
    $ans = Read-Host
    if ($ans -match '^[Yy]') {
        Write-Host "Dang day len nhanh 'main'..." -ForegroundColor Green
        git push -u origin main
        Write-Host ""
        Write-Host "Dang tao va day nhanh 'develop'..." -ForegroundColor Green
        git checkout -b develop 2>$null
        git push -u origin develop 2>$null
        git checkout main
        Write-Host ""
        Write-Host "[THANH CONG] Ma nguon va cac branch da duoc dong bo len GitHub!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  CAC LENH PULL / PUSH NHANH DE SU DUNG HANG NGAY:" -ForegroundColor White
Write-Host "  - Lay code moi nhat ve : git pull origin main" -ForegroundColor Yellow
Write-Host "  - Day code len nhanh   : git add . ; git commit -m 'noi dung' ; git push origin main" -ForegroundColor Yellow
Write-Host "  - Chuyen nhanh phat trien: git checkout develop" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
