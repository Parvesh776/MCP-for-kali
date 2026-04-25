<p align="center">
  <h1 align="center">🛡️ AI Pentest MCP Server v3.0</h1>
  <p align="center">
    <strong>AI-Powered Offensive Penetration Testing via Model Context Protocol</strong>
  </p>
  <p align="center">
    Metasploit · AD Attacks · Post-Exploitation · Credential Store · CVE Lookup · 40+ Tools
  </p>
  <p align="center">
    <a href="#-quick-setup-automated"><img src="https://img.shields.io/badge/Platform-Kali%20Linux-557C94?style=for-the-badge&logo=kalilinux&logoColor=white" alt="Kali Linux"></a>
    <a href="#-available-tools-40"><img src="https://img.shields.io/badge/Tools-40+-E95420?style=for-the-badge" alt="40+ Tools"></a>
    <a href="#-open-webui-integration"><img src="https://img.shields.io/badge/Client-Open%20WebUI-4A90D9?style=for-the-badge" alt="Open WebUI"></a>
    <img src="https://img.shields.io/badge/Transport-Streamable%20HTTP-00C853?style=for-the-badge" alt="Streamable HTTP">
    <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License">
  </p>
</p>

---

An **MCP (Model Context Protocol) server** that turns your **Kali Linux** machine into an AI-driven penetration testing powerhouse. Connect it to **Open WebUI** (or any MCP-compatible client) and control 40+ offensive security tools using natural language.

> **How it works:** Your local LLM (running in Open WebUI) sends MCP tool calls to this server, which executes the actual security tools (Nmap, Metasploit, Nuclei, CrackMapExec, Impacket, etc.) on Kali and returns the results. The LLM then analyzes the output and decides the next steps — all through a chat interface.

---

## 📑 Table of Contents

- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Quick Setup (Automated)](#-quick-setup-automated)
- [Open WebUI Integration](#-open-webui-integration)
- [Available Tools (40+)](#-available-tools-40)
- [Auto-Chain Engine v2](#-auto-chain-engine-v2)
- [Credential Store](#-credential-store)
- [Session Persistence](#-session-persistence)
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
│         │  results & picks │          │  │  Nmap, Nuclei, SQLMap,   │    │
│         │  next actions    │          │  │  Metasploit, Impacket,   │    │
│         └──────────────────│          │  │  CrackMapExec, Hydra,    │    │
│                            │          │  │  Evil-WinRM, LinPEAS...  │    │
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

The included `setup.sh` script handles **everything** — installs all 40+ dependencies, configures the firewall, and creates a systemd service for auto-start.

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
1. Install all system packages (Nmap, Metasploit, Nuclei, CrackMapExec, Impacket, Evil-WinRM, etc.)
2. Verify/install Node.js 18+
3. Copy project files and install npm dependencies
4. Open port `8080` in the firewall
5. Create a `pentest-mcp` systemd service for auto-start on boot

### Step 3 — Start the Server

```bash
# Using systemd (recommended — persists across reboots)
sudo systemctl start pentest-mcp

# Or run manually
cd <current-directory> && npm start
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
  "version": "3.0.0",
  "transport": "streamable-http",
  "endpoint": "/mcp"
}
```

> **💡 Find your Kali IP:** Run `ip a` or `hostname -I` on Kali.

---

## 🌐 Open WebUI Integration

1. Open **Open WebUI** in your browser
2. Go to **⚙️ Settings** → **Tools**
3. Click **Add Tool** (or **+**)
4. Set the following:

| Field | Value |
|---|---|
| **Type** | `MCP (Streamable HTTP)` |
| **URL** | `http://<KALI-IP>:8080/mcp` |

5. Click **Save** and start a new chat

> **⚠️ Important:** Make sure the type is set to **MCP (Streamable HTTP)**, not SSE or WebSocket.

---

## 🛠 Available Tools (40+)

### 🔍 Reconnaissance

| Tool | Description | Key Parameters |
|---|---|---|
| `nmap_scan` | Port scanning, service detection, OS fingerprinting | `target`, `flags` |
| `masscan_scan` | Ultra-fast port scanner for large networks/CIDR | `target`, `ports`, `rate` |
| `whatweb_scan` | Web technology fingerprinting | `target` |
| `whois_lookup` | Domain WHOIS information | `domain` |
| `dns_recon` | DNS record enumeration & brute-forcing | `domain`, `wordlist` |
| `subfinder_scan` | Passive subdomain discovery | `domain` |
| `amass_enum` | Deep subdomain enumeration (passive/active) | `domain`, `wordlist` |
| `assetfinder_scan` | Find related subdomains | `domain` |
| `httpx_check` | Probe live HTTP servers (status, title, tech) | `targets` |
| `httprobe_scan` | Fast probe for working HTTP/HTTPS servers | `domains` |
| `wafw00f_scan` | Identify Web Application Firewalls | `url` |
| `dnsx_scan` | Multi-purpose DNS toolkit | `domains` |
| `chaos_client` | ProjectDiscovery Chaos subdomain enum | `domain` |
| `knockpy_scan` | Python subdomain enumerator | `domain` |
| `findomain_scan`| Cross-platform subdomain enumerator | `domain` |
| `sublist3r_scan`| Fast subdomains enumeration | `domain` |
| `bbot_scan` | Recursive OSINT/recon framework | `domain` |
| `oneforall_scan`| Powerful subdomain integration framework | `domain` |
| `shuffledns_scan`| Resolve subdomains with massdns | `domain`, `wordlist` |
| `puredns_scan` | Fast domain resolver & bruteforcing | `domain`, `wordlist` |
| `altdns_scan` | Subdomain permutations/alterations | `domains_file` |
| `subjack_scan` | Subdomain takeover checker | `domains_file` |
| `subzy_scan` | Subdomain takeover tool | `domains_file` |
| `asnlookup_scan`| Find IP ranges for an ASN | `org` |
| `asnmap_scan` | Map IPs/Domains to ASNs | `input` |
| `mapcidr_scan` | CIDR operations utility | `cidr` |
| `naabu_scan` | Extremely fast Go port scanner | `target`, `ports` |
| `rustscan_scan` | Modern port scanner (3 seconds) | `target` |
| `sandmap_scan` | Nmap wrapper for faster recon | `target` |
| `multi_target_scan` | Scan multiple targets or CIDR ranges | `targets`, `scan_type` |

### 🌐 Web Application Testing

| Tool | Description | Key Parameters |
|---|---|---|
| `nikto_scan` | Web vulnerability scanner | `target`, `flags` |
| `nuclei_scan` | **Template-based vuln scanner (9000+ templates)** | `target`, `templates`, `severity` |
| `sqlmap_scan` | SQL injection detection & exploitation | `url`, `flags` |
| `wpscan_scan` | WordPress vulnerability scanner | `url`, `enumerate` |
| `gobuster_scan` | Directory & file brute-forcing | `target`, `wordlist`, `mode` |
| `ffuf_scan` | Fast web fuzzer | `url`, `wordlist` |
| `dirsearch_scan` | Web path discovery | `url`, `wordlist` |
| `katana_crawl` | Crawl websites to extract endpoints | `url` |
| `gau_wayback` | Fetch known URLs from Wayback Machine | `domain` |
| `testssl_scan` | SSL/TLS vulnerability testing (Heartbleed, POODLE, etc.) | `target` |
| `trufflehog_scan` | **Find exposed secrets/keys in code/Git** | `target`, `type` |
| `feroxbuster_scan`| Fast recursive content discovery | `url`, `wordlist` |
| `wfuzz_scan` | Web application fuzzer | `url`, `wordlist` |
| `waymore_scan` | Fetch URLs from Wayback/AlienVault/VirusTotal | `domain` |
| `subjs_scan` | Fetch JS files from URLs | `domains_file` |
| `getjs_scan` | Extract JS files from URLs | `url` |
| `secretfinder_scan`| Find sensitive data in JS files | `url` |
| `mantra_scan` | Hunt down API keys and secrets | `url` |
| `gitgraber_scan`| Monitor GitHub for sensitive data | `keyword` |
| `aws_cli` | Interact with AWS/S3 | `command` |
| `lazys3_scan` | Bruteforce AWS S3 buckets | `company` |
| `s3scanner_scan`| Scan open S3 buckets & dump contents | `domains_file` |

### 🔓 Exploitation & Brute-Force

| Tool | Description | Key Parameters |
|---|---|---|
| `hydra_bruteforce` | Login brute-force (SSH, FTP, HTTP, SMB) | `target`, `service`, `username`, `wordlist` |
| `enum4linux` | SMB/NetBIOS enumeration | `target` |
| `metasploit_run` | Run any Metasploit module | `module`, `options`, `payload` |
| `metasploit_search` | Search the Metasploit exploit database | `keyword` |
| `searchsploit_scan` | **Offline Exploit-DB search (CVEs, PoCs)** | `keyword`, `examine` |
| `cve_lookup` | **Look up CVEs and exploits for a service/version** | `query` |
| `commix_run` | Command injection exploitation | `url`, `params` |
| `fuxploider_run`| File upload vulnerability scanner | `url` |
| `cmsmap_scan` | WordPress/Joomla/Drupal scanner | `url` |
| `openredirectx_scan`| Open Redirect vulnerability scanner | `urls_file` |
| `lfify_scan` | LFI vulnerability identifier | `url` |

### 🏢 Active Directory & Windows

| Tool | Description | Key Parameters |
|---|---|---|
| `crackmapexec_scan` | **SMB/WinRM/LDAP/MSSQL attacks, pass-the-hash, spraying** | `protocol`, `target`, `username`, `password`, `hash` |
| `impacket_secretsdump` | **Dump SAM/LSA/NTDS hashes from Windows** | `target`, `username`, `password`, `hash` |
| `impacket_psexec` | **Get SYSTEM shell via PsExec** | `target`, `username`, `password`, `hash` |
| `evil_winrm` | **WinRM shell — run PowerShell remotely** | `target`, `username`, `password`, `command` |
| `kerbrute_scan` | **Kerberos user enumeration & brute-force** | `domain`, `dc`, `mode`, `wordlist` |
| `netexec_scan` | **Modern AD pentesting (replaces CME)** | `protocol`, `target`, `username`, `password`, `hash` |
| `bloodhound_python`| **Map Active Directory attack paths** | `domain`, `dc`, `username`, `password`, `hash` |

### 🧗 Post-Exploitation

| Tool | Description | Key Parameters |
|---|---|---|
| `linpeas_run` | **LinPEAS privilege escalation scanner** | `target`, `username`, `password`, `key` |
| `winpeas_run` | **WinPEAS privilege escalation scanner** | `target`, `username`, `password`, `hash` |
| `chisel_tunnel` | **Set up reverse tunnel for pivoting** | `mode`, `listen_port`, `remote` |

### 🔑 Credential Management

| Tool | Description | Key Parameters |
|---|---|---|
| `creds_add` | Store credentials for reuse across tools | `username`, `password`, `hash`, `target` |
| `creds_list` | List all found credentials | — |
| `creds_spray` | **Spray stored creds against targets** | `target`, `protocol` |

### 📦 Loot & Session Management

| Tool | Description | Key Parameters |
|---|---|---|
| `loot_collect` | Save interesting files/data found during pentest | `type`, `content`, `source` |
| `loot_list` | List all collected loot | — |
| `session_save` | **Save session to disk (resume later)** | `filepath` |
| `session_load` | **Load a previously saved session** | `filepath` |
| `session_status` | View current session state | — |
| `set_target` | Set the primary target | `target` |

### 🤖 AI & Automation

| Tool | Description | Key Parameters |
|---|---|---|
| `auto_chain` | **Full automated pentest — recon → vuln scan → analysis** | `target`, `depth` (1–3) |
| `ai_analyze` | AI analyzes findings & recommends next steps | `target` |
| `generate_report` | Generate comprehensive pentest report | `format` (markdown/html) |
| `run_custom_command` | Execute any shell command on Kali | `command` |

---

## 🔁 Auto-Chain Engine v2

The `auto_chain` tool runs a **multi-phase automated penetration test** with a single command:

```
auto_chain("192.168.1.100", depth=2)
```

### Flow

```
auto_chain(target, depth)
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
│  ├─ Web ports → WhatWeb + Gobuster   │
│  ├─ SMB       → Enum4Linux           │
│  └─ FTP       → Anonymous Login      │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Phase 2.5: Vulnerability Scanning   │  ← NEW
│  └─ Nuclei (CVEs, misconfigs, creds) │
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

---

## 🔑 Credential Store

Credentials found during pentesting are **automatically collected** and stored in the session. Tools like `impacket_secretsdump` and `crackmapexec_scan` auto-capture creds.

```
"Dump hashes from 10.10.10.5"  →  secretsdump runs  →  hashes auto-saved to creds store
"Spray those creds on the subnet"  →  creds_spray uses stored hashes  →  finds valid logins
```

You can also manually add creds with `creds_add` and list them with `creds_list`.

---

## 💾 Session Persistence

Save your entire pentest session (findings, credentials, ports, vulnerabilities) to disk and resume later:

```
"Save this session"           →  session_save  →  /tmp/pentest_session_*.json
"Load session from /tmp/..."  →  session_load  →  all data restored
```

---

## 💬 Example Prompts

| Prompt | Tools Triggered |
|---|---|
| `"Run a full auto pentest on 192.168.1.100"` | `auto_chain` (nmap → enum → nuclei → analysis) |
| `"Scan the 10.0.0.0/24 subnet for live hosts"` | `multi_target_scan` |
| `"Find vulnerabilities on http://target.com"` | `nuclei_scan` |
| `"Scan WordPress site at http://blog.target.com"` | `wpscan_scan` |
| `"Check SSL vulnerabilities on target.com:443"` | `testssl_scan` |
| `"Enumerate SMB shares on 10.10.10.5 as admin"` | `crackmapexec_scan` |
| `"Dump hashes from the domain controller"` | `impacket_secretsdump` |
| `"Get a shell on 192.168.1.50 using pass-the-hash"` | `impacket_psexec` or `evil_winrm` |
| `"Enumerate Kerberos users on corp.local"` | `kerbrute_scan` |
| `"Run LinPEAS on the compromised box via SSH"` | `linpeas_run` |
| `"Set up a pivot through the compromised host"` | `chisel_tunnel` |
| `"Look up CVEs for Apache 2.4.49"` | `cve_lookup` |
| `"Spray all found credentials on the network"` | `creds_spray` |
| `"Generate a full pentest report in HTML"` | `generate_report` |
| `"Save this session for later"` | `session_save` |

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
# Start / Stop / Restart
sudo systemctl start pentest-mcp
sudo systemctl stop pentest-mcp
sudo systemctl restart pentest-mcp

# Check status & logs
sudo systemctl status pentest-mcp
sudo journalctl -u pentest-mcp -f
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---|---|
| **Can't reach server from host** | Ensure VMware/VirtualBox network is **Bridged** or **NAT**. Run `ip a` on Kali. |
| **Connection refused on port 8080** | `sudo ufw allow 8080/tcp` and restart service |
| **Metasploit not found** | `sudo apt install metasploit-framework` |
| **Nuclei not found** | `sudo apt install nuclei` or `go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest` |
| **CrackMapExec not found** | `sudo apt install crackmapexec` |
| **Server crashes** | Check logs: `journalctl -u pentest-mcp -f` |
| **Open WebUI won't connect** | Ensure Type is **MCP (Streamable HTTP)** and URL is `http://<IP>:8080/mcp` |
| **Tool timeout** | Long scans (Nuclei, SQLMap) can take 5-10 min. Be patient or narrow scope. |
| **npm install fails** | Delete `node_modules/` and run `npm install` again |

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
