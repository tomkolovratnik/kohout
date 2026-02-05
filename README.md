# Kohout

Osobní nástroj pro agregaci ticketů z Jira a Azure DevOps. Importuje tickety do lokální SQLite databáze a nabízí jednotné rozhraní s kanbanem, složkami, vyhledáváním a osobními poznámkami.

## Požadavky

- Node.js 20+
- npm 10+
- Git

## Instalace na novém PC

Jeden příkaz — nainstaluje závislosti, zbuilduje a přidá příkaz `kohout` do PATH:

```bash
npm install -g github:tomkolovratnik/kohout
```

Spuštění:

```bash
kohout
```

Aplikace poběží na `http://localhost:3001`.

### Aktualizace

```bash
npm install -g github:tomkolovratnik/kohout
```

### Alternativa bez globální instalace

```bash
git clone https://github.com/tomkolovratnik/kohout.git
cd kohout
npm install
npm run build
npm start
```

### Konfigurace (volitelné)

Vytvoř `.env` v kořenu projektu:

```env
PORT=3001
DATABASE_PATH=./kohout.db
```

Výchozí umístění databáze je `~/.kohout/kohout.db`.

---

## Automatické spuštění po startu PC

### Windows — Task Scheduler

Po globální instalaci (`npm install -g`) bude příkaz `kohout` v PATH. Otevři PowerShell jako správce:

```powershell
$kohoutPath = (Get-Command kohout).Source

schtasks /create /tn "Kohout" `
  /tr "$kohoutPath" `
  /sc onlogon `
  /rl highest
```

Správa:

```powershell
schtasks /run /tn "Kohout"          # spustit ručně
schtasks /end /tn "Kohout"          # zastavit
schtasks /delete /tn "Kohout" /f    # odebrat z autostartu
```

> Task Scheduler otevře okno konzole. Pokud chceš skrýt okno: otevři Task Scheduler GUI (`taskschd.msc`), najdi úlohu Kohout → Vlastnosti → zaškrtni **Spustit bez ohledu na přihlášení uživatele**. Vyžádá si heslo, ale okno se nezobrazí.

### Linux — systemd

```bash
sudo tee /etc/systemd/system/kohout.service > /dev/null << EOF
[Unit]
Description=Kohout
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/kohout
ExecStart=$(which node) server/dist/index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now kohout
```

Správa:

```bash
sudo systemctl status kohout     # stav
sudo systemctl restart kohout    # restart
sudo journalctl -u kohout -f     # logy
```

### WSL2

Systemd ve WSL2 funguje, pokud je v `/etc/wsl.conf`:

```ini
[boot]
systemd=true
```

Po restartu WSL (`wsl --shutdown` z PowerShell) použij postup pro Linux výše.

WSL2 se ale nezapne automaticky po startu Windows. Pro automatické spuštění vytvoř Windows Task Scheduler úlohu, která nastartuje WSL:

```powershell
schtasks /create /tn "Kohout-WSL" `
  /tr "wsl -d Ubuntu -- bash -lc 'cd ~/kohout && node server/dist/index.js'" `
  /sc onlogon `
  /rl highest
```

Pak v prohlížeči otevři `http://localhost:3001`.
