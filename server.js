#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║         AI-POWERED PENTESTING MCP SERVER v3.0           ║
 * ║  Metasploit + Auto-Chain + Report Generation + AI Core  ║
 * ╚══════════════════════════════════════════════════════════╝
 * FOR AUTHORIZED PENTESTING AND CTF USE ONLY
 *
 * Transport: Streamable HTTP (MCP spec compliant)
 * Endpoint:  POST/GET/DELETE /mcp
 */

import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { z } from "zod";
import os from "node:os";

const execAsync = promisify(exec);

// ─── State ─────────────────────────────────────────────────────────────────────
const sessionState = {
  target: null,
  findings: [],
  openPorts: [],
  services: {},
  vulns: [],
  reportPath: `/tmp/pentest_report_${Date.now()}.md`,
  chainLog: [],
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
async function resolveWordlist(wordlistName, fallbackPath = '/usr/share/wordlists/rockyou.txt') {
  if (!wordlistName) return fallbackPath;
  if (wordlistName.startsWith('/')) return wordlistName;
  const commonPaths = [
    '/usr/share/wordlists/' + wordlistName,
    '/usr/share/wordlists/dirb/' + wordlistName,
    '/usr/share/wordlists/dirbuster/' + wordlistName,
    '/usr/share/seclists/Discovery/DNS/' + wordlistName,
    '/usr/share/seclists/Discovery/Web-Content/' + wordlistName,
    '/usr/share/seclists/Passwords/' + wordlistName
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }
  return fallbackPath;
}

async function run(cmd, timeoutMs = 120000) {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout || stderr || "(no output)";
  } catch (e) {
    return `[ERROR] ${e.message}\n${e.stdout || ""}`;
  }
}

function sanitize(input) {
  if (!input) return "";
  return String(input).replace(/[;&|`$(){}[\]<>\\]/g, "").trim();
}

function log(tool, result) {
  sessionState.findings.push({
    tool,
    timestamp: new Date().toISOString(),
    result: result.slice(0, 2000),
  });
  sessionState.chainLog.push(`[${tool}] executed at ${new Date().toISOString()}`);
}

function parseNmapPorts(nmapOutput) {
  const ports = [];
  const lines = nmapOutput.split("\n");
  for (const line of lines) {
    const match = line.match(/^(\d+)\/(tcp|udp)\s+open\s+(\S+)/);
    if (match) {
      ports.push({ port: match[1], proto: match[2], service: match[3] });
    }
  }
  return ports;
}


// ─── AI Reasoning Engine ───────────────────────────────────────────────────────
async function aiReason(findings, target) {
  // External API removed. The local LLM (running in Open WebUI) will read 
  // the tool output and perform the reasoning itself.
  return {
    vulnerabilities: ["(Local LLM: Please analyze findings for vulnerabilities)"],
    next_steps: [{ "tool": "Local LLM", "reason": "Suggest next tools", "command": "N/A" }],
    risk_score: "Pending Local LLM Analysis",
    metasploit_modules: ["(Local LLM: Suggest Metasploit modules)"],
    summary: "API key requirement removed. You (the local LLM answering the user) must act as the AI reasoning engine. Please read the above tool outputs and provide the penetration testing analysis, risk score, and recommended next steps directly in your response."
  };
}

// ─── Auto-Chain Engine ─────────────────────────────────────────────────────────
async function autoChain(target, depth = 2) {
  const results = [];
  sessionState.target = target;

  // Phase 1: Recon
  results.push("## Phase 1: Reconnaissance");
  const nmapOut = await run(`nmap -sV -sC -O --open -T4 ${sanitize(target)}`, 180000);
  log("nmap_autochain", nmapOut);
  results.push(`### Nmap Results\n\`\`\`\n${nmapOut.slice(0, 3000)}\n\`\`\``);

  const ports = parseNmapPorts(nmapOut);
  sessionState.openPorts = ports;

  // Phase 2: Service-specific scans
  results.push("\n## Phase 2: Service Enumeration");

  const hasWeb = ports.some((p) => ["80", "443", "8080", "8443"].includes(p.port));
  const hasSMB = ports.some((p) => ["445", "139"].includes(p.port));
  const hasFTP = ports.some((p) => p.port === "21");

  if (hasWeb) {
    results.push("### Web Services Detected");
    const protocol = ports.some((p) => p.port === "443") ? "https" : "http";
    const webTarget = `${protocol}://${target}`;

    const whatwebOut = await run(`whatweb ${webTarget} 2>/dev/null`);
    log("whatweb_autochain", whatwebOut);
    results.push(`**WhatWeb:**\n\`\`\`\n${whatwebOut.slice(0, 1000)}\n\`\`\``);

    if (depth >= 2) {
      const gobusterOut = await run(
        `gobuster dir -u ${webTarget} -w /usr/share/wordlists/dirb/common.txt -t 20 -q 2>/dev/null`,
        90000
      );
      log("gobuster_autochain", gobusterOut);
      results.push(`**Gobuster Dirs:**\n\`\`\`\n${gobusterOut.slice(0, 1500)}\n\`\`\``);
    }
  }

  if (hasSMB) {
    results.push("### SMB Detected");
    const smbOut = await run(`enum4linux -a ${sanitize(target)} 2>/dev/null`, 120000);
    log("enum4linux_autochain", smbOut);
    results.push(`**Enum4Linux:**\n\`\`\`\n${smbOut.slice(0, 1500)}\n\`\`\``);
  }

  if (hasFTP) {
    results.push("### FTP Detected - Testing Anonymous Login");
    const ftpOut = await run(
      `echo -e "open ${sanitize(target)}\\nuser anonymous anonymous\\nls\\nquit" | ftp -n 2>&1`
    );
    log("ftp_autochain", ftpOut);
    results.push(`**FTP Anon Check:**\n\`\`\`\n${ftpOut.slice(0, 500)}\n\`\`\``);
  }

  // Phase 3: AI Analysis
  results.push("\n## Phase 3: AI Analysis & Recommendations");
  const aiAnalysis = await aiReason(sessionState.findings, target);
  sessionState.vulns = aiAnalysis.vulnerabilities || [];

  results.push(`**Risk Score:** ${aiAnalysis.risk_score}`);
  results.push(`**Summary:** ${aiAnalysis.summary}`);
  results.push(`\n**Top Vulnerabilities:**`);
  (aiAnalysis.vulnerabilities || []).forEach((v, i) => results.push(`${i + 1}. ${v}`));
  results.push(`\n**Recommended Next Steps:**`);
  (aiAnalysis.next_steps || []).forEach((s) =>
    results.push(`- **${s.tool}**: ${s.reason}\n  Command: \`${s.command}\``)
  );
  if (aiAnalysis.metasploit_modules?.length) {
    results.push(`\n**Metasploit Modules to Try:**`);
    aiAnalysis.metasploit_modules.forEach((m) => results.push(`- \`${m}\``));
  }

  // Save report
  const report = results.join("\n");
  fs.writeFileSync(sessionState.reportPath, `# Auto-Chain Pentest Report\n**Target:** ${target}\n**Date:** ${new Date().toISOString()}\n\n${report}`);

  return report + `\n\n---\n📄 Report saved to: ${sessionState.reportPath}`;
}

// ─── Metasploit RPC Helper ─────────────────────────────────────────────────────
async function msfConsole(commands, timeoutMs = 120000) {
  const rcFile = `/tmp/msf_${Date.now()}.rc`;
  const outputFile = `/tmp/msf_out_${Date.now()}.txt`;
  fs.writeFileSync(rcFile, commands + "\nexit\n");
  const out = await run(
    `msfconsole -q -r ${rcFile} > ${outputFile} 2>&1; cat ${outputFile}`,
    timeoutMs
  );
  try { fs.unlinkSync(rcFile); } catch { }
  try { fs.unlinkSync(outputFile); } catch { }
  return out;
}

// ─── Report Generator ──────────────────────────────────────────────────────────
async function generateReport(format = "markdown") {
  const target = sessionState.target || "Unknown";
  const date = new Date().toISOString();

  let report = `# 🔐 Penetration Test Report
**Target:** ${target}
**Date:** ${date}
**Tools Used:** ${[...new Set(sessionState.findings.map((f) => f.tool))].join(", ")}
**Risk Level:** ${sessionState.vulns.length > 3 ? "HIGH" : sessionState.vulns.length > 1 ? "MEDIUM" : "LOW"}

---

## Executive Summary
Automated penetration test conducted against ${target}. 
${sessionState.findings.length} tool(s) executed. 
${sessionState.openPorts.length} open port(s) discovered.
${sessionState.vulns.length} potential vulnerability/attack vector(s) identified.

---

## Open Ports & Services
| Port | Protocol | Service |
|------|----------|---------|
${sessionState.openPorts.map((p) => `| ${p.port} | ${p.proto} | ${p.service} |`).join("\n") || "| No ports recorded | - | - |"}

---

## Identified Vulnerabilities
${sessionState.vulns.map((v, i) => `${i + 1}. ${v}`).join("\n") || "No vulnerabilities recorded yet. Run auto_chain first."}

---

## Detailed Findings
${sessionState.findings
      .map(
        (f) => `### ${f.tool} (${f.timestamp})
\`\`\`
${f.result.slice(0, 1000)}
\`\`\``
      )
      .join("\n\n")}

---

## Tool Execution Log
${sessionState.chainLog.join("\n")}

---

## Recommendations
1. Patch all identified vulnerabilities immediately
2. Implement network segmentation
3. Enable intrusion detection/prevention systems
4. Conduct regular security audits
5. Apply principle of least privilege

---
*Report generated by AI Pentest MCP Server v3.0*
*FOR AUTHORIZED USE ONLY*`;

  const reportPath = `/tmp/pentest_final_${Date.now()}.md`;
  fs.writeFileSync(reportPath, report);

  if (format === "html") {
    const html = `<!DOCTYPE html><html><head><title>Pentest Report</title>
<style>body{font-family:monospace;background:#0d1117;color:#c9d1d9;padding:2rem;}
h1{color:#58a6ff;}h2{color:#f0883e;border-bottom:1px solid #30363d;padding-bottom:.5rem;}
table{border-collapse:collapse;width:100%;}td,th{border:1px solid #30363d;padding:.5rem;}
th{background:#161b22;}pre{background:#161b22;padding:1rem;overflow-x:auto;border-radius:6px;}
code{color:#79c0ff;}</style></head><body>
<pre>${report.replace(/</g, "&lt;")}</pre></body></html>`;
    const htmlPath = reportPath.replace(".md", ".html");
    fs.writeFileSync(htmlPath, html);
    return `Report saved:\n- Markdown: ${reportPath}\n- HTML: ${htmlPath}\n\n${report.slice(0, 2000)}`;
  }

  return `Report saved to: ${reportPath}\n\n${report.slice(0, 3000)}`;
}

// ─── MCP Server Factory ───────────────────────────────────────────────────────
// Creates a new McpServer instance (one per session for stateful use,
// or shared with stateless approach)
function createMcpServer() {
  const server = new McpServer(
    { name: "ai-pentest-mcp", version: "3.0.0" },
    { capabilities: { tools: {} } }
  );

  // ── Core Recon Tools ──
  server.tool(
    "nmap_scan",
    "Advanced Nmap port and service scan",
    {
      target: z.string().describe("IP or hostname"),
      flags: z.string().optional().default("-sV -sC").describe("Nmap flags e.g. -sV -sC -O -p-"),
    },
    async ({ target, flags }) => {
      const t = sanitize(target);
      const f = sanitize(flags || "-sV -sC");
      if (sessionState.target === null) sessionState.target = t;
      const result = await run(`nmap ${f} ${t}`, 180000);
      const ports = parseNmapPorts(result);
      sessionState.openPorts.push(...ports);
      log("nmap_scan", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

  server.tool(
    "nikto_scan",
    "Nikto web vulnerability scanner",
    {
      target: z.string().describe("Target URL or IP"),
      flags: z.string().optional().default("").describe("Additional Nikto flags"),
    },
    async ({ target, flags }) => {
      const t = sanitize(target);
      const f = sanitize(flags || "");
      const result = await run(`nikto -h ${t} ${f}`, 300000);
      log("nikto_scan", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

  server.tool(
    "sqlmap_scan",
    "SQLMap SQL injection tester",
    {
      url: z.string().describe("Target URL with parameter"),
      flags: z.string().optional().default("--batch --level=3 --risk=2").describe("SQLMap flags"),
    },
    async ({ url, flags }) => {
      const u = sanitize(url);
      const f = sanitize(flags || "--batch --level=3 --risk=2");
      const result = await run(`sqlmap -u "${u}" ${f}`, 300000);
      log("sqlmap_scan", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

    server.tool(
    "gobuster_scan",
    "Directory/file brute-force with Gobuster",
    {
      target: z.string().describe("Target URL"),
      wordlist: z.string().optional().default("/usr/share/wordlists/dirb/common.txt").describe("Wordlist path"),
      mode: z.string().optional().default("dir").describe("dir or dns"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ target, wordlist, mode, flags }) => {
      const f = flags ? " " + sanitize(flags) : "";
      const t = sanitize(target);
      const w = sanitize(wordlist || "/usr/share/wordlists/dirb/common.txt");
      const m = sanitize(mode || "dir");
      const result = await run(`gobuster ${m} -u ${t} -w ${w} -t 20${f}`, 180000);
      log("gobuster_scan", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

    server.tool(
    "ffuf_scan",
    "Fast web fuzzer for directory/file discovery",
    {
      url: z.string().describe("Target URL with FUZZ keyword, e.g. http://example.com/FUZZ"),
      wordlist: z.string().optional().default("/usr/share/wordlists/dirb/common.txt").describe("Wordlist path"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ url, wordlist, flags }) => {
      const f = flags ? " " + sanitize(flags) : "";
      const u = sanitize(url);
      const w = sanitize(wordlist || "/usr/share/wordlists/dirb/common.txt");
      const result = await run(`ffuf -u "${u}" -w ${w} -mc 200,204,301,302,307,401,403,405,500 -t 50 -silent${f}`, 180000);
      log("ffuf_scan", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

    server.tool(
    "dirsearch_scan",
    "Web path discovery tool",
    {
      url: z.string().describe("Target URL"),
      wordlist: z.string().optional().describe("Optional custom wordlist path"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ url, wordlist, flags }) => {
      const f = flags ? " " + sanitize(flags) : "";
      const u = sanitize(url);
      const wFlag = wordlist ? `-w ${sanitize(wordlist)}` : "";
      const result = await run(`dirsearch -u "${u}" -e * -q --format=plain ${wFlag}${f}`, 300000);
      log("dirsearch_scan", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

    server.tool(
    "subfinder_scan",
    "Find subdomains for a domain using subfinder",
    { domain: z.string().describe("Target domain"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ domain, flags }) => {
      const f = flags ? " " + sanitize(flags) : "";
      const d = sanitize(domain);
      const result = await run(`subfinder -d ${d} -silent${f}`, 120000);
      log("subfinder_scan", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

  // --- 4 Tools from yesterday ---
  server.tool(
    "searchsploit_scan",
    "Offline Exploit-DB search for finding specific CVEs/PoCs.",
    { keyword: z.string().describe("Keyword to search"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ keyword, flags }) => {
      const k = sanitize(keyword);
      const f = flags ? " " + sanitize(flags) : "";
      const result = await run(`searchsploit ${k}${f}`, 120000);
      log("searchsploit_scan", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

  server.tool(
    "trufflehog_scan",
    "Automated discovery of API keys and secrets in code/Git/directories.",
    { target: z.string().describe("Target URL or path"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ target, flags }) => {
      const t = sanitize(target);
      const f = flags ? " " + sanitize(flags) : "";
      const result = await run(`trufflehog ${t}${f} --no-update`, 300000);
      log("trufflehog_scan", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

  server.tool(
    "netexec_scan",
    "Modern, high-stability alternative to crackmapexec for AD/SMB/LDAP attacks.",
    { protocol: z.string().describe("Protocol (smb, wmi, winrm, etc)"), target: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ protocol, target, flags }) => {
      const p = sanitize(protocol);
      const t = sanitize(target);
      const f = flags ? " " + sanitize(flags) : "";
      const result = await run(`nxc ${p} ${t}${f}`, 300000);
      log("netexec_scan", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

  server.tool(
    "bloodhound_python",
    "Active Directory data ingestion to map domain attack paths.",
    { domain: z.string(), dc: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ domain, dc, flags }) => {
      const d = sanitize(domain);
      const dcIP = sanitize(dc);
      const f = flags ? " " + sanitize(flags) : "";
      const result = await run(`bloodhound-python -d ${d} -dc ${dcIP} -c All${f}`, 300000);
      log("bloodhound_python", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

  // --- 36 New Bug Bounty Tools ---
  server.tool("dnsx_scan", "Multi-purpose DNS toolkit allow to run multiple DNS queries.", { domains: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domains, flags }) => { const d = sanitize(domains); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`echo "${d}" | tr ' ' '\n' | dnsx -silent -a -aaaa -cname -ns -mx -txt${f}`, 120000); log("dnsx_scan", result); return { content: [{ type: "text", text: result }] }; });
  server.tool("chaos_client", "ProjectDiscovery Chaos client for subdomain enumeration.", { domain: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, flags }) => { const d = sanitize(domain); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`chaos -d ${d} -silent${f}`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("knockpy_scan", "Python tool designed to enumerate subdomains.", { domain: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, flags }) => { const d = sanitize(domain); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`knockpy ${d} --no-http -t 2${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("findomain_scan", "Cross-platform subdomain enumerator.", { domain: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, flags }) => { const d = sanitize(domain); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`findomain -t ${d} -q${f}`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("sublist3r_scan", "Fast subdomains enumeration tool using search engines.", { domain: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, flags }) => { const d = sanitize(domain); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`sublist3r -d ${d} -n${f}`, 180000); return { content: [{ type: "text", text: result }] }; });
  server.tool("bbot_scan", "Recursive OSINT/recon framework.", { domain: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, flags }) => { const d = sanitize(domain); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`bbot -t ${d} -f subdomain-enum -s${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("oneforall_scan", "Powerful subdomain integration framework.", { domain: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, flags }) => { const d = sanitize(domain); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`python3 /opt/OneForAll/oneforall.py --target ${d} run${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("shuffledns_scan", "Wrapper around massdns.", { domain: z.string(), wordlist: z.string().optional(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, wordlist, flags }) => { const d = sanitize(domain); const w = await resolveWordlist(wordlist, "/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt"); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`shuffledns -d ${d} -w ${w} -silent${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("puredns_scan", "Fast domain resolver and bruteforcer.", { domain: z.string(), wordlist: z.string().optional(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, wordlist, flags }) => { const d = sanitize(domain); const w = await resolveWordlist(wordlist, "/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt"); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`puredns bruteforce ${w} ${d} -q${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("altdns_scan", "Subdomain permutations.", { domains_file: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domains_file, flags }) => { const d = sanitize(domains_file); const w = "/usr/share/seclists/Discovery/DNS/words.txt"; const f = flags ? " " + sanitize(flags) : ""; const result = await run(`altdns -i ${d} -w ${w} -o /tmp/altdns_out.txt && head -n 100 /tmp/altdns_out.txt${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("subjack_scan", "Hostile subdomain takeover checker.", { domains_file: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domains_file, flags }) => { const d = sanitize(domains_file); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`subjack -w ${d} -t 100 -timeout 30 -ssl -v${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("subzy_scan", "Subdomain takeover tool.", { domains_file: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domains_file, flags }) => { const d = sanitize(domains_file); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`subzy run --targets ${d}${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("wafw00f_scan", "Identify WAFs.", { url: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, flags }) => { const u = sanitize(url); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`wafw00f ${u}${f}`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("asnlookup_scan", "Find IP ranges for an ASN.", { org: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ org, flags }) => { const o = sanitize(org); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`python3 /opt/asnlookup/asnlookup.py -o ${o}${f}`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("asnmap_scan", "Map IPs/Domains to ASNs.", { input: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ input, flags }) => { const i = sanitize(input); let fl = "-d"; if(i.startsWith("AS")) fl = "-a"; else if(i.match(/^[0-9\.]+$/)) fl = "-i"; const f = flags ? " " + sanitize(flags) : ""; const result = await run(`asnmap ${fl} ${i} -silent${f}`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("mapcidr_scan", "CIDR utility.", { cidr: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ cidr, flags }) => { const c = sanitize(cidr); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`echo "${c}" | mapcidr -silent${f}`, 60000); return { content: [{ type: "text", text: result }] }; });
  server.tool("feroxbuster_scan", "Fast recursive content discovery.", { url: z.string(), wordlist: z.string().optional(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, wordlist, flags }) => { const u = sanitize(url); const w = await resolveWordlist(wordlist, "/usr/share/wordlists/dirb/common.txt"); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`feroxbuster -u ${u} -w ${w} -d 2 --silent${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("wfuzz_scan", "Web fuzzer.", { url: z.string(), wordlist: z.string().optional(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, wordlist, flags }) => { const u = sanitize(url); const w = await resolveWordlist(wordlist, "/usr/share/wordlists/dirb/common.txt"); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`wfuzz -c -z file,${w} --hc 404 ${u}${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("httprobe_scan", "Probe HTTP/HTTPS.", { domains: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domains, flags }) => { const d = sanitize(domains); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`echo "${d}" | tr ' ' '\n' | httprobe${f}`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("waymore_scan", "Wayback URLs.", { domain: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, flags }) => { const d = sanitize(domain); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`python3 /opt/waymore/waymore.py -i ${d} -mode U${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("naabu_scan", "Fast port scanner.", { target: z.string(), ports: z.string().optional(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ target, ports, flags }) => { const t = sanitize(target); const p = sanitize(ports || "top-100"); const pFlag = p === "full" ? "-p -" : `-p ${p}`; const f = flags ? " " + sanitize(flags) : ""; const result = await run(`naabu -host ${t} ${pFlag} -silent${f}`, 180000); return { content: [{ type: "text", text: result }] }; });
  server.tool("rustscan_scan", "Modern port scanner.", { target: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ target, flags }) => { const t = sanitize(target); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`rustscan -a ${t} -- -sV${f}`, 180000); return { content: [{ type: "text", text: result }] }; });
  server.tool("sandmap_scan", "Nmap wrapper.", { target: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ target, flags }) => { const t = sanitize(target); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`sandmap -d ${t}${f}`, 60000); return { content: [{ type: "text", text: result }] }; });
  server.tool("subjs_scan", "Fetch JS files.", { domains_file: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domains_file, flags }) => { const d = sanitize(domains_file); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`cat ${d} | subjs${f}`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("getjs_scan", "Extract JS files.", { url: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, flags }) => { const u = sanitize(url); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`getJS --url ${u}${f}`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("secretfinder_scan", "Find secrets in JS.", { url: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, flags }) => { const u = sanitize(url); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`python3 /opt/SecretFinder/SecretFinder.py -i ${u} -o cli${f}`, 180000); return { content: [{ type: "text", text: result }] }; });
  server.tool("mantra_scan", "Hunt down API keys.", { url: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, flags }) => { const u = sanitize(url); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`echo "${u}" | mantra${f}`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("gitgraber_scan", "GitHub secrets monitor.", { keyword: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ keyword, flags }) => { const k = sanitize(keyword); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`python3 /opt/gitGraber/gitGraber.py -k ${k}${f}`, 180000); return { content: [{ type: "text", text: result }] }; });
  server.tool("aws_cli", "AWS operations.", { command: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ command, flags }) => { const c = sanitize(command); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`aws ${c}${f}`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("lazys3_scan", "S3 bruteforce.", { company: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ company, flags }) => { const c = sanitize(company); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`ruby /opt/lazys3/lazys3.rb ${c}${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("s3scanner_scan", "Scan S3 buckets.", { domains_file: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domains_file, flags }) => { const d = sanitize(domains_file); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`s3scanner scan -f ${d}${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("commix_run", "Command injection.", { url: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, flags }) => { const u = sanitize(url); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`commix --url="${u}" --batch${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("fuxploider_run", "File upload vulns.", { url: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, flags }) => { const u = sanitize(url); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`python3 /opt/fuxploider/fuxploider.py -u "${u}"${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("cmsmap_scan", "CMS scanner.", { url: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, flags }) => { const u = sanitize(url); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`cmsmap ${u}${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("openredirectx_scan", "Open Redirect scanner.", { urls_file: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ urls_file, flags }) => { const u = sanitize(urls_file); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`python3 /opt/OpenRedireX/openredirex.py -l ${u} --keyword FUZZ${f}`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("lfify_scan", "LFI scanner.", { url: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, flags }) => { const u = sanitize(url); const f = flags ? " " + sanitize(flags) : ""; const result = await run(`lfify "${u}"${f}`, 300000); return { content: [{ type: "text", text: result }] }; });


    server.tool(
    "amass_enum",
    "Deep subdomain enumeration using amass",
    {
      domain: z.string().describe("Target domain"),
      wordlist: z.string().optional().describe("Optional custom wordlist for brute-forcing"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ domain, wordlist, flags }) => {
      const f = flags ? " " + sanitize(flags) : "";
      const d = sanitize(domain);
      const mode = wordlist ? "-active" : "-passive";
      const wFlag = wordlist ? `-w ${sanitize(wordlist)}` : "";
      const result = await run(`amass enum -d ${d} ${mode} ${wFlag}${f}`, 300000);
      log("amass_enum", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

    server.tool(
    "assetfinder_scan",
    "Find subdomains related to a domain",
    { domain: z.string().describe("Target domain"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ domain, flags }) => {
      const f = flags ? " " + sanitize(flags) : "";
      const d = sanitize(domain);
      const result = await run(`assetfinder --subs-only ${d}${f}`, 120000);
      log("assetfinder_scan", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

    server.tool(
    "httpx_check",
    "Check live HTTP web servers using httpx",
    { targets: z.string().describe("Space or comma separated list of domains or IPs"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ targets, flags }) => {
      const f = flags ? " " + sanitize(flags) : "";
      const t = sanitize(targets).replace(/,/g, " ");
      const result = await run(`echo ${t} | tr ' ' '\\n' | httpx-toolkit -silent${f}`, 120000);
      log("httpx_check", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

    server.tool(
    "katana_crawl",
    "Crawl websites to extract endpoints using katana",
    { url: z.string().describe("Target URL"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ url, flags }) => {
      const f = flags ? " " + sanitize(flags) : "";
      const u = sanitize(url);
      const result = await run(`katana -u ${u} -silent -d 3${f}`, 180000);
      log("katana_crawl", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

    server.tool(
    "gau_wayback",
    "Fetch known URLs from AlienVault, Wayback Machine, and Common Crawl",
    { domain: z.string().describe("Target domain"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ domain, flags }) => {
      const f = flags ? " " + sanitize(flags) : "";
      const d = sanitize(domain);
      const result = await run(`gau ${d} || waybackurls ${d}${f}`, 180000);
      log("gau_wayback", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

    server.tool(
    "whatweb_scan",
    "Identify web technologies",
    {
      target: z.string().describe("Target URL or IP"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ target, flags }) => {
      const f = flags ? " " + sanitize(flags) : "";
      const result = await run(`whatweb ${sanitize(target)} -v${f}`);
      log("whatweb_scan", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

    server.tool(
    "whois_lookup",
    "WHOIS domain lookup",
    {
      domain: z.string().describe("Domain name"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ domain, flags }) => {
      const f = flags ? " " + sanitize(flags) : "";
      const result = await run(`whois ${sanitize(domain)}${f}`);
      log("whois_lookup", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

    server.tool(
    "dns_recon",
    "DNS enumeration with dnsrecon",
    {
      domain: z.string().describe("Domain name"),
      wordlist: z.string().optional().describe("Optional dictionary file for brute-forcing"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ domain, wordlist, flags }) => {
      const f = flags ? " " + sanitize(flags) : "";
      const d = sanitize(domain);
      const wFlag = wordlist ? `-D ${sanitize(wordlist)} -t brt` : "";
      const result = await run(`dnsrecon -d ${d} ${wFlag} 2>/dev/null${f}`, 120000);
      log("dns_recon", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

    server.tool(
    "hydra_bruteforce",
    "Hydra login brute-force (SSH, FTP, HTTP)",
    {
      target: z.string().describe("Target IP or hostname"),
      service: z.string().describe("ssh | ftp | http-get | smb"),
      username: z.string().describe("Username to brute-force"),
      wordlist: z.string().optional().default("/usr/share/wordlists/rockyou.txt").describe("Wordlist path"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ target, service, username, wordlist, flags }) => {
      const f = flags ? " " + sanitize(flags) : "";
      const t = sanitize(target);
      const s = sanitize(service);
      const u = sanitize(username);
      const w = sanitize(wordlist || "/usr/share/wordlists/rockyou.txt");
      const result = await run(`hydra -l ${u} -P ${w} ${t} ${s} -t 4 -V${f}`, 600000);
      log("hydra_bruteforce", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

    server.tool(
    "enum4linux",
    "SMB/NetBIOS enumeration for Windows targets",
    {
      target: z.string().describe("Target IP or hostname"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ target, flags }) => {
      const f = flags ? " " + sanitize(flags) : "";
      const result = await run(`enum4linux -a ${sanitize(target)}${f}`, 180000);
      log("enum4linux", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

  // ── Metasploit Tools ──
    server.tool(
    "metasploit_run",
    "Run a Metasploit exploit or auxiliary module",
    {
      module: z.string().describe("e.g. exploit/multi/handler or auxiliary/scanner/smb/smb_ms17_010"),
      options: z.record(z.string()).optional().describe("Module options as key-value pairs"),
      payload: z.string().optional().describe("Optional payload e.g. windows/meterpreter/reverse_tcp"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ module: mod, options, payload, flags }) => {
      const f = flags ? " " + sanitize(flags) : "";
      const modSafe = sanitize(mod);
      const opts = options || {};
      const payloadSafe = payload ? sanitize(payload) : null;
      let rcCommands = `use ${modSafe}\n`;
      for (const [k, v] of Object.entries(opts)) {
        rcCommands += `set ${sanitize(k)} ${sanitize(String(v))}\n`;
      }
      if (payloadSafe) rcCommands += `set PAYLOAD ${payloadSafe}\n`;
      rcCommands += "run -j\nsleep 5\njobs\n";
      const result = await msfConsole(rcCommands, 180000);
      log("metasploit_run", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

    server.tool(
    "metasploit_search",
    "Search Metasploit for exploits matching a keyword",
    {
      keyword: z.string().describe("Search term e.g. eternalblue, apache, smb"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ keyword, flags }) => {
      const f = flags ? " " + sanitize(flags) : "";
      const kw = sanitize(keyword);
      const result = await msfConsole(`search ${kw}\n`, 60000);
      log("metasploit_search", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

  // ── AI & Automation Tools ──
  server.tool(
    "auto_chain",
    "AI-powered full auto pentest: runs recon, enumeration, AI analysis, and recommendations automatically",
    {
      target: z.string().describe("Target IP or hostname"),
      depth: z.number().optional().default(2).describe("Scan depth 1=basic, 2=full, 3=aggressive"),
    },
    async ({ target, depth }) => {
      const t = sanitize(target);
      const d = Math.min(3, Math.max(1, depth || 2));
      const result = await autoChain(t, d);
      return { content: [{ type: "text", text: result }] };
    }
  );

  server.tool(
    "ai_analyze",
    "AI analyzes all current scan findings and recommends next attack vectors",
    {
      target: z.string().optional().describe("Target (optional if auto_chain was run)"),
    },
    async ({ target }) => {
      const t = sanitize(target || "") || sessionState.target || "unknown";
      if (sessionState.findings.length === 0) {
        return { content: [{ type: "text", text: "No findings yet. Run nmap_scan, nikto_scan, or auto_chain first." }] };
      }
      const analysis = await aiReason(sessionState.findings, t);
      const result = `## AI Penetration Test Analysis

**Risk Score:** ${analysis.risk_score}

**Summary:** ${analysis.summary}

**Top Vulnerabilities:**
${(analysis.vulnerabilities || []).map((v, i) => `${i + 1}. ${v}`).join("\n")}

**Recommended Next Steps:**
${(analysis.next_steps || []).map((s) => `- **${s.tool}**: ${s.reason}\n  Command: \`${s.command}\``).join("\n")}

**Metasploit Modules:**
${(analysis.metasploit_modules || []).map((m) => `- \`${m}\``).join("\n") || "None identified"}`;
      return { content: [{ type: "text", text: result }] };
    }
  );

  server.tool(
    "generate_report",
    "Generate full penetration test report from all session findings",
    {
      format: z.string().optional().default("markdown").describe("markdown or html"),
    },
    async ({ format }) => {
      const result = await generateReport(format || "markdown");
      return { content: [{ type: "text", text: result }] };
    }
  );

  server.tool(
    "set_target",
    "Set the primary target for this pentest session",
    {
      target: z.string().describe("Target IP or hostname"),
    },
    async ({ target }) => {
      sessionState.target = sanitize(target);
      return { content: [{ type: "text", text: `Target set to: ${sessionState.target}` }] };
    }
  );

  server.tool(
    "session_status",
    "Show current pentest session status and all findings so far",
    {},
    async () => {
      const result = `## Pentest Session Status
**Target:** ${sessionState.target || "Not set"}
**Open Ports:** ${sessionState.openPorts.length} (${sessionState.openPorts.map((p) => p.port).join(", ") || "none"})
**Tools Run:** ${sessionState.findings.length}
**Vulnerabilities Identified:** ${sessionState.vulns.length}
**Report Path:** ${sessionState.reportPath}

**Execution Log:**
${sessionState.chainLog.slice(-10).join("\n") || "No tools run yet"}`;
      return { content: [{ type: "text", text: result }] };
    }
  );

  server.tool(
    "run_custom_command",
    "Run any custom shell command on Kali",
    {
      command: z.string().describe("Shell command to execute"),
    },
    async ({ command }) => {
      const cmd = sanitize(command);
      const result = await run(cmd, 120000);
      log("custom_command", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

  return server;
}

// ─── Express App + Streamable HTTP Transport ───────────────────────────────────
const app = express();

// CORS - required for browser-based clients like Open WebUI
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept", "Authorization", "Mcp-Session-Id"],
  exposedHeaders: ["Mcp-Session-Id"],
}));

app.use(express.json());

// Store transports by session ID
const transports = {};

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    server: "ai-pentest-mcp",
    version: "3.0.0",
    transport: "streamable-http",
    endpoint: "/mcp",
  });
});

// ─── POST /mcp — handle JSON-RPC messages ──────────────────────────────────────
app.post("/mcp", async (req, res) => {
  console.error(`[POST /mcp] ${req.headers["mcp-session-id"] || "new session"}`);

  try {
    const sessionId = req.headers["mcp-session-id"];
    let transport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport for this session
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request — create transport + server
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          console.error(`[MCP] Session initialized: ${newSessionId}`);
          transports[newSessionId] = transport;
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          console.error(`[MCP] Session closed: ${sid}`);
          delete transports[sid];
        }
      };

      // Connect a new MCP server instance to this transport
      const server = createMcpServer();
      await server.connect(transport);

      // Handle the initialization request
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      // Invalid request — no session ID and not an initialization request
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
      return;
    }

    // Handle request with existing transport
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("[POST /mcp] Error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// ─── GET /mcp — SSE stream for server-to-client notifications ──────────────────
app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  console.error(`[GET /mcp] SSE request for session: ${sessionId || "none"}`);

  if (!sessionId || !transports[sessionId]) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Invalid or missing session ID" },
      id: null,
    });
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// ─── DELETE /mcp — session termination ─────────────────────────────────────────
app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  console.error(`[DELETE /mcp] Terminate session: ${sessionId || "none"}`);

  if (!sessionId || !transports[sessionId]) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Invalid or missing session ID" },
      id: null,
    });
    return;
  }

  try {
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("[DELETE /mcp] Error:", error);
    if (!res.headersSent) {
      res.status(500).send("Error processing session termination");
    }
  }
});

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  let localIp = "0.0.0.0";
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        localIp = iface.address;
        break;
      }
    }
    if (localIp !== "0.0.0.0") break;
  }

  console.error(` AI Pentest MCP Server v3.0`);
  console.error(`   Listening: http://${localIp}:${PORT}/mcp`);
  console.error(`   Health:    http://${localIp}:${PORT}/health`);
  console.error(`   Transport: Streamable HTTP`);
  console.error(`   CORS:      enabled (all origins)`);
});

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.error("Shutting down...");
  for (const sessionId in transports) {
    try {
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch { }
  }
  process.exit(0);
});
