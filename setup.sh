#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║      AI PENTEST MCP SERVER - KALI LINUX SETUP SCRIPT        ║
# ╚══════════════════════════════════════════════════════════════╝
# Run as root or with sudo on Kali Linux

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         AI PENTEST MCP SERVER SETUP v3.0                    ║"
echo "║         Metasploit + Auto-Chain + AI Reasoning              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Step 1: System Dependencies ───────────────────────────────────────────────
echo -e "${YELLOW}[1/5] Installing core MCP server dependencies...${NC}"
apt-get update -qq
apt-get install -y nodejs npm curl wget jq git 2>/dev/null

echo -e "${GREEN}✓ Core dependencies installed${NC}"
echo -e "${CYAN}ℹ Note: Offensive tools (Nmap, Nuclei, Impacket, etc.) are NOT installed automatically. Install them manually as needed to save storage.${NC}"

# ── Step 2: Node.js Version Check ─────────────────────────────────────────────
echo -e "${YELLOW}[2/5] Checking Node.js version...${NC}"
NODE_VER=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo -e "${RED}Node.js 18+ required. Installing via nvm...${NC}"
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
  nvm install 20
  nvm use 20
fi
echo -e "${GREEN}✓ Node.js $(node --version) ready${NC}"

# ── Step 3: Project Setup ──────────────────────────────────────────────────────
echo -e "${YELLOW}[3/5] Setting up pentest-mcp project...${NC}"
mkdir -p ~/pentest-mcp
cp server.js ~/pentest-mcp/
cp package.json ~/pentest-mcp/
cd ~/pentest-mcp
npm install --silent
echo -e "${GREEN}✓ Project dependencies installed (express, zod, @modelcontextprotocol/sdk)${NC}"

# ── Step 4: Firewall Config ───────────────────────────────────────────────────
echo -e "${YELLOW}[4/5] Configuring firewall...${NC}"
ufw allow 8080/tcp 2>/dev/null || true
echo -e "${GREEN}✓ Port 8080 opened${NC}"

# ── Step 5: Create Systemd Service ────────────────────────────────────────────
echo -e "${YELLOW}[5/5] Creating systemd service for auto-start...${NC}"
cat > /etc/systemd/system/pentest-mcp.service << EOF
[Unit]
Description=AI Pentest MCP Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/pentest-mcp
ExecStart=/usr/bin/node /root/pentest-mcp/server.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=PORT=8080

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable pentest-mcp 2>/dev/null || true
echo -e "${GREEN}✓ Systemd service created${NC}"

# ── Get IP ─────────────────────────────────────────────────────────────────────
KALI_IP=$(ip route get 8.8.8.8 | awk '{print $7; exit}')

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                  SETUP COMPLETE! ✓                      ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║${NC} ${GREEN}Kali IP:${NC}    ${YELLOW}${KALI_IP}${NC}"
echo -e "${CYAN}║${NC} ${GREEN}MCP URL:${NC}    ${YELLOW}http://${KALI_IP}:8080/mcp${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  TO START:  systemctl start pentest-mcp                 ║${NC}"
echo -e "${CYAN}║  TO CHECK:  systemctl status pentest-mcp                ║${NC}"
echo -e "${CYAN}║  MANUAL:    cd ~/pentest-mcp && npm start               ║${NC}"
echo -e "${CYAN}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  Open WebUI → Settings → Tools → Add:                  ║${NC}"
echo -e "${CYAN}║  Type: MCP (Streamable HTTP)                            ║${NC}"
echo -e "${CYAN}║  ${YELLOW}http://${KALI_IP}:8080/mcp${CYAN}                           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${RED}⚠  AUTHORIZED PENTESTING AND CTF USE ONLY ⚠${NC}"
echo ""

# Auto-start
read -p "Start the MCP server now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  systemctl start pentest-mcp
  sleep 2
  echo -e "${GREEN}✓ Server started! Check: curl http://${KALI_IP}:8080/health${NC}"
fi
