<p align="center">
  <h1 align="center">🛡️ AI Pentest MCP Server v2.0</h1>
  <p align="center">
    <strong>AI-Powered Penetration Testing via Model Context Protocol</strong>
  </p>
  <p align="center">
    Metasploit Integration · Auto-Chain Engine · Report Generation · 25+ Security Tools
  </p>
  <p align="center">
    <a href="#-quick-setup-automated"><img src="https://img.shields.io/badge/Platform-Kali%20Linux-557C94?style=for-the-badge&logo=kalilinux&logoColor=white" alt="Kali Linux"></a>
    <a href="#-available-tools-25"><img src="https://img.shields.io/badge/Tools-25+-E95420?style=for-the-badge" alt="25+ Tools"></a>
    <a href="#-open-webui-integration"><img src="https://img.shields.io/badge/Client-Open%20WebUI-4A90D9?style=for-the-badge" alt="Open WebUI"></a>
    <img src="https://img.shields.io/badge/Transport-Streamable%20HTTP-00C853?style=for-the-badge" alt="Streamable HTTP">
    <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License">
  </p>
</p>

---

An **MCP (Model Context Protocol) server** that turns your **Kali Linux** machine into an AI-driven penetration testing powerhouse. Connect it to **Open WebUI** (or any MCP-compatible client) and control 25+ offensive security tools using natural language.

> **How it works:** Your local LLM (running in Open WebUI) sends MCP tool calls to this server, which executes the actual security tools (Nmap, Metasploit, SQLMap, etc.) on Kali and returns the results. The LLM then analyzes the output and decides the next steps — all through a chat interface.

---

## 📑 Table of Contents

- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Quick Setup (Automated)](#-quick-setup-automated)
- [Open WebUI Integration](#-open-webui-integration)
- [Available Tools (25+)](#-available-tools-25)
- [Auto-Chain Engine](#-auto-chain-engine)
- [Example Prompts](#-example-prompts)
- [API Endpoints](#-api-endpoints)
- [Configuration](#%EF%B8%8F-configuration)
- [Troubleshooting](#-troubleshooting)
- [Legal Disclaimer](#%EF%B8%8F-legal-disclaimer)
- [License](#-license)

---

## 🏗 Architecture

```
┌────────────────────────────┐          ┌──────────────────────────────────┐
│       Open WebUI           │          │     Kali Linux (MCP Server)      │
│   (or any MCP client)      │          │                                  │
│                            │   HTTP   │  ┌──────────────────────────┐    │
│  ┌──────────────────────┐  │◄────────►│  │   Express.js + MCP SDK   │    │
│  │  Local LLM (Ollama,  │  │  :8080   │  │   Streamable HTTP        │    │
│  │  LLaMA, Mistral,etc) │  │  /mcp    │  └──────────┬───────────────┘    │
│  └──────────────────────┘  │          │             │                    │
│         ▲                  │          │             ▼                    │
│         │  Analyzes tool   │          │  ┌──────────────────────────┐    │
│         │  results & picks │          │  │  Nmap, Nikto, SQLMap,    │    │
│         │  next actions    │          │  │  Gobuster, Hydra, FFuf,  │    │
│         └──────────────────│          │  │  Metasploit, Subfinder,  │    │
│                            │          │  │  Amass, Katana, ...      │    │
└────────────────────────────┘          │  └──────────────────────────┘    │
                                        └──────────────────────────────────┘
```

---

## 📋 Prerequisites

| Requirement | Details |
|---|---|
| **Operating System** | Kali Linux (VM, bare-metal, or WSL2) |
| **Node.js** | v18.0.0 or higher |
| **npm** | Included with Node.js |
| **Root Access** | Required for most security tools |
| **Network** | Kali must be reachable from your MCP client (NAT/Bridged network for VMware/VirtualBox) |
| **MCP Client** | [Open WebUI](https://openwebui.com/) with MCP support (recommended), or any MCP-compatible client |

---

## 🚀 Quick Setup (Automated)

The included `setup.sh` script handles **everything** — installs all dependencies, configures the firewall, and creates a systemd service for auto-start.

### Step 1 — Clone the Repository on Kali

```bash
git clone https://github.com/Parvesh776/MCP-for-kali.git
cd MCP-for-kali
```

### Step 2 — Run the Setup Script

```bash
chmod +x setup.sh
sudo ./setup.sh
```

The script will:
1. Install all system packages (Nmap, Metasploit, Gobuster, Hydra, SQLMap, etc.)
2. Verify/install Node.js 18+
3. Copy project files and install npm dependencies
4. Open port `8080` in the firewall
5. Create a `pentest-mcp` systemd service for auto-start on boot

### Step 3 — Start the Server

```bash
# Using systemd (recommended — persists across reboots)
sudo systemctl start pentest-mcp

# Or run manually
cd ~/pentest-mcp && npm start
```

### Step 4 — Verify

```bash
curl http://<KALI-IP>:8080/health
```

Expected response:
```json
{
  "status": "ok",
  "server": "ai-pentest-mcp",
  "version": "2.0.0",
  "transport": "streamable-http",
  "endpoint": "/mcp"
}
```

> **💡 Find your Kali IP:** Run `ip a` or `hostname -I` on Kali.

---
---

## 🌐 Open WebUI Integration

Connect this MCP server to Open WebUI so you can run pentests through natural language chat.

### Steps

1. Open **Open WebUI** in your browser
2. Go to **⚙️ Settings** → **Tools**
3. Click **Add Tool** (or **+**)
4. Set the following:

| Field | Value |
|---|---|
| **Type** | `MCP (Streamable HTTP)` |
| **URL** | `http://<KALI-IP>:8080/mcp` |

5. Click **Save**
6. Start a new chat and the MCP tools will be available to the LLM

> **⚠️ Important:** Make sure the type is set to **MCP (Streamable HTTP)**, not SSE or WebSocket. This server uses the native MCP Streamable HTTP transport — no proxy is needed.

---

## 🛠 Available Tools (25+)

### 🔍 Reconnaissance

| Tool | Description | Key Parameters |
|---|---|---|
| `nmap_scan` | Port scanning, service detection, OS fingerprinting | `target`, `flags` (default: `-sV -sC`) |
| `whatweb_scan` | Web technology fingerprinting | `target` |
| `whois_lookup` | Domain WHOIS information | `domain` |
| `dns_recon` | DNS record enumeration & brute-forcing | `domain`, `wordlist` (optional) |
| `subfinder_scan` | Passive subdomain discovery | `domain` |
| `amass_enum` | Deep subdomain enumeration (passive/active) | `domain`, `wordlist` (optional) |
| `assetfinder_scan` | Find related subdomains | `domain` |
| `httpx_check` | Probe live HTTP servers (status, title, tech) | `targets` |

### 🌐 Web Application Testing

| Tool | Description | Key Parameters |
|---|---|---|
| `nikto_scan` | Web vulnerability scanner | `target`, `flags` (optional) |
| `sqlmap_scan` | SQL injection detection & exploitation | `url`, `flags` (default: `--batch --level=3 --risk=2`) |
| `gobuster_scan` | Directory & file brute-forcing | `target`, `wordlist`, `mode` (`dir`/`dns`) |
| `ffuf_scan` | Fast web fuzzer (use `FUZZ` keyword in URL) | `url`, `wordlist` |
| `dirsearch_scan` | Web path discovery | `url`, `wordlist` (optional) |
| `katana_crawl` | Crawl websites to extract endpoints | `url` |
| `gau_wayback` | Fetch known URLs from Wayback Machine & AlienVault | `domain` |

### 🔓 Exploitation & Brute-Force

| Tool | Description | Key Parameters |
|---|---|---|
| `hydra_bruteforce` | Login brute-force (SSH, FTP, HTTP, SMB) | `target`, `service`, `username`, `wordlist` |
| `enum4linux` | SMB/NetBIOS enumeration for Windows targets | `target` |
| `metasploit_run` | Run any Metasploit module (exploit/auxiliary) | `module`, `options`, `payload` |
| `metasploit_search` | Search the Metasploit exploit database | `keyword` |

### 🤖 AI & Automation

| Tool | Description | Key Parameters |
|---|---|---|
| `auto_chain` | **Full automated pentest** — runs recon → enumeration → analysis → report | `target`, `depth` (1–3) |
| `ai_analyze` | Formats all findings for LLM analysis & next-step recommendations | `target` (optional) |
| `generate_report` | Generate a comprehensive pentest report | `format` (`markdown` / `html`) |
| `set_target` | Set the primary target for the session | `target` |
| `session_status` | View current session state (ports, findings, vulns) | — |
| `run_custom_command` | Execute any shell command on Kali | `command` |

---

## 🔁 Auto-Chain Engine

The `auto_chain` tool runs a **multi-phase automated penetration test** with a single command:

```
auto_chain(target, depth)
```

### Flow

```
auto_chain("192.168.1.100", depth=2)
        │
        ▼
┌──────────────────────────────────────┐
│  Phase 1: Reconnaissance            │
│  └─ Nmap scan (ports, services, OS) │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Phase 2: Service Enumeration        │
│  ├─ Web ports (80/443) → WhatWeb     │
│  │                      + Gobuster   │
│  ├─ SMB (445/139)     → Enum4Linux   │
│  └─ FTP (21)          → Anon Login   │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Phase 3: AI Analysis                │
│  ├─ Vulnerability identification     │
│  ├─ Risk scoring                     │
│  ├─ Metasploit module suggestions    │
│  └─ Next-step recommendations        │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  📄 Report saved to /tmp/           │
└──────────────────────────────────────┘
```

### Depth Levels

| Depth | Behavior |
|---|---|
| `1` | Basic — Nmap + service-specific checks |
| `2` | Full — Adds directory brute-forcing (Gobuster) |
| `3` | Aggressive — All Phase 2 checks at maximum coverage |

---

## 💬 Example Prompts

Use these in Open WebUI (or any MCP client) to trigger tools:

| Prompt | Tools Triggered |
|---|---|
| `"Run a full auto pentest on 192.168.1.100"` | `auto_chain` |
| `"Scan 10.10.10.5 for open ports and services"` | `nmap_scan` |
| `"Find web vulnerabilities on http://target.com"` | `nikto_scan` + `gobuster_scan` |
| `"Check for SQL injection at http://app.com/login?id=1"` | `sqlmap_scan` |
| `"Search Metasploit for EternalBlue"` | `metasploit_search` |
| `"Run ms17_010 exploit on 192.168.1.50"` | `metasploit_run` |
| `"Brute-force SSH on 10.10.10.3 with user admin"` | `hydra_bruteforce` |
| `"Find all subdomains of example.com"` | `subfinder_scan` + `amass_enum` |
| `"Generate a full pentest report in HTML"` | `generate_report` |
| `"What should I try next based on findings?"` | `ai_analyze` |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/mcp` | Handle MCP JSON-RPC messages (tool calls, initialization) |
| `GET` | `/mcp` | SSE stream for server-to-client notifications |
| `DELETE` | `/mcp` | Terminate an MCP session |
| `GET` | `/health` | Health check — returns server status and version |

---

## ⚙️ Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Server listening port |

### Systemd Service Management

```bash
# Start the server
sudo systemctl start pentest-mcp

# Stop the server
sudo systemctl stop pentest-mcp

# Restart the server
sudo systemctl restart pentest-mcp

# Check status & logs
sudo systemctl status pentest-mcp
sudo journalctl -u pentest-mcp -f
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---|---|
| **Can't reach server from Windows/host** | Ensure VMware/VirtualBox network is set to **Bridged** or **NAT**. Run `ip a` on Kali to confirm IP. |
| **Connection refused on port 8080** | Run `sudo ufw allow 8080/tcp` and restart the service. |
| **Metasploit not found** | Install it: `sudo apt install metasploit-framework` |
| **Server crashes on startup** | Check logs: `journalctl -u pentest-mcp -f`. Ensure Node.js ≥ 18: `node --version` |
| **Open WebUI won't connect** | Verify the tool type is **MCP (Streamable HTTP)** and the URL is `http://<KALI-IP>:8080/mcp` |
| **Health check fails** | Run `curl http://<KALI-IP>:8080/health` — should return `{"status":"ok"}` |
| **npm install fails** | Delete `node_modules` and `package-lock.json`, then run `npm install` again. |
| **Tool timeout errors** | Some scans (Nmap, SQLMap) can take minutes. Increase timeout or narrow scan scope with specific flags. |
| **CORS errors in browser client** | CORS is enabled for all origins by default. Ensure you're hitting `/mcp`, not the root path. |

---

## ⚖️ Legal Disclaimer

> **⚠️ AUTHORIZED USE ONLY**

This tool is intended **exclusively** for:

- ✅ **CTF (Capture The Flag)** challenges and competitions
- ✅ **Your own** lab environments and home networks
- ✅ **Authorized** penetration tests with **written permission**
- ✅ **Educational** and research purposes

**Do NOT use this tool against any systems you do not own or have explicit, written authorization to test.** Unauthorized access to computer systems is illegal and punishable under laws including the Computer Fraud and Abuse Act (CFAA) and similar legislation worldwide.

The authors are not responsible for any misuse of this software.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  <sub>Built for the cybersecurity community 🔐</sub>
</p>