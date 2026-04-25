const fs = require('fs');

let code = fs.readFileSync('c:/shared-folder/MCP sever/server.js', 'utf8');

if (!code.includes('async function resolveWordlist')) {
  const resolveHelper = "\nasync function resolveWordlist(wordlistName, fallbackPath = '/usr/share/wordlists/rockyou.txt') {\n  if (!wordlistName) return fallbackPath;\n  if (wordlistName.startsWith('/')) return wordlistName;\n  const commonPaths = [\n    '/usr/share/wordlists/' + wordlistName,\n    '/usr/share/wordlists/dirb/' + wordlistName,\n    '/usr/share/wordlists/dirbuster/' + wordlistName,\n    '/usr/share/seclists/Discovery/DNS/' + wordlistName,\n    '/usr/share/seclists/Discovery/Web-Content/' + wordlistName,\n    '/usr/share/seclists/Passwords/' + wordlistName\n  ];\n  for (const p of commonPaths) {\n    if (fs.existsSync(p)) return p;\n  }\n  return fallbackPath;\n}\n";
  code = code.replace('// ─── Helpers ───────────────────────────────────────────────────────────────────', '// ─── Helpers ───────────────────────────────────────────────────────────────────' + resolveHelper);
}

let toolRegex = /server\.tool\(\s*"([^"]+)",\s*"([^"]+)",\s*({[\s\S]*?}),\s*async\s*\({([^}]+)}\)\s*=>\s*{([\s\S]*?})\s*\);/g;
let updatedCode = code.replace(toolRegex, (match, toolName, desc, paramsObj, argsList, body) => {
    if (argsList.includes('flags') || argsList.includes('params') || toolName === "run_custom_command" || toolName === "ai_analyze" || toolName === "generate_report" || toolName === "set_target" || toolName === "session_status" || toolName.includes("creds") || toolName.includes("loot") || toolName === "auto_chain") {
        return match;
    }
    
    let newParamsObj = paramsObj.replace(/,?\s*}\s*$/, ', flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }');
    if (paramsObj.trim() === '{}') {
        newParamsObj = '{ flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }';
    }
    
    let newArgsList = argsList.trim();
    if (newArgsList === '') newArgsList = 'flags';
    else newArgsList += ', flags';
    
    let newBody = '\n      const f = flags ? " " + sanitize(flags) : "";' + body;
    newBody = newBody.replace(/run\(\s*`([^`]+)`/, "run(`$1${f}`");
    
    return "  server.tool(\n    \"" + toolName + "\",\n    \"" + desc + "\",\n    " + newParamsObj + ",\n    async ({ " + newArgsList + " }) => {" + newBody + "\n  );";
});

const newTools = `
  // --- 4 Tools from yesterday ---
  server.tool(
    "searchsploit_scan",
    "Offline Exploit-DB search for finding specific CVEs/PoCs.",
    { keyword: z.string().describe("Keyword to search"), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") },
    async ({ keyword, flags }) => {
      const k = sanitize(keyword);
      const f = flags ? " " + sanitize(flags) : "";
      const result = await run(\`searchsploit \${k}\${f}\`, 120000);
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
      const result = await run(\`trufflehog \${t}\${f} --no-update\`, 300000);
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
      const result = await run(\`nxc \${p} \${t}\${f}\`, 300000);
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
      const result = await run(\`bloodhound-python -d \${d} -dc \${dcIP} -c All\${f}\`, 300000);
      log("bloodhound_python", result);
      return { content: [{ type: "text", text: result }] };
    }
  );

  // --- 36 New Bug Bounty Tools ---
  server.tool("dnsx_scan", "Multi-purpose DNS toolkit allow to run multiple DNS queries.", { domains: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domains, flags }) => { const d = sanitize(domains); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`echo "\${d}" | tr ' ' '\\n' | dnsx -silent -a -aaaa -cname -ns -mx -txt\${f}\`, 120000); log("dnsx_scan", result); return { content: [{ type: "text", text: result }] }; });
  server.tool("chaos_client", "ProjectDiscovery Chaos client for subdomain enumeration.", { domain: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, flags }) => { const d = sanitize(domain); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`chaos -d \${d} -silent\${f}\`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("knockpy_scan", "Python tool designed to enumerate subdomains.", { domain: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, flags }) => { const d = sanitize(domain); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`knockpy \${d} --no-http -t 2\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("findomain_scan", "Cross-platform subdomain enumerator.", { domain: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, flags }) => { const d = sanitize(domain); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`findomain -t \${d} -q\${f}\`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("sublist3r_scan", "Fast subdomains enumeration tool using search engines.", { domain: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, flags }) => { const d = sanitize(domain); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`sublist3r -d \${d} -n\${f}\`, 180000); return { content: [{ type: "text", text: result }] }; });
  server.tool("bbot_scan", "Recursive OSINT/recon framework.", { domain: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, flags }) => { const d = sanitize(domain); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`bbot -t \${d} -f subdomain-enum -s\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("oneforall_scan", "Powerful subdomain integration framework.", { domain: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, flags }) => { const d = sanitize(domain); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`python3 /opt/OneForAll/oneforall.py --target \${d} run\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("shuffledns_scan", "Wrapper around massdns.", { domain: z.string(), wordlist: z.string().optional(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, wordlist, flags }) => { const d = sanitize(domain); const w = await resolveWordlist(wordlist, "/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt"); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`shuffledns -d \${d} -w \${w} -silent\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("puredns_scan", "Fast domain resolver and bruteforcer.", { domain: z.string(), wordlist: z.string().optional(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, wordlist, flags }) => { const d = sanitize(domain); const w = await resolveWordlist(wordlist, "/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt"); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`puredns bruteforce \${w} \${d} -q\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("altdns_scan", "Subdomain permutations.", { domains_file: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domains_file, flags }) => { const d = sanitize(domains_file); const w = "/usr/share/seclists/Discovery/DNS/words.txt"; const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`altdns -i \${d} -w \${w} -o /tmp/altdns_out.txt && head -n 100 /tmp/altdns_out.txt\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("subjack_scan", "Hostile subdomain takeover checker.", { domains_file: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domains_file, flags }) => { const d = sanitize(domains_file); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`subjack -w \${d} -t 100 -timeout 30 -ssl -v\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("subzy_scan", "Subdomain takeover tool.", { domains_file: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domains_file, flags }) => { const d = sanitize(domains_file); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`subzy run --targets \${d}\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("wafw00f_scan", "Identify WAFs.", { url: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, flags }) => { const u = sanitize(url); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`wafw00f \${u}\${f}\`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("asnlookup_scan", "Find IP ranges for an ASN.", { org: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ org, flags }) => { const o = sanitize(org); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`python3 /opt/asnlookup/asnlookup.py -o \${o}\${f}\`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("asnmap_scan", "Map IPs/Domains to ASNs.", { input: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ input, flags }) => { const i = sanitize(input); let fl = "-d"; if(i.startsWith("AS")) fl = "-a"; else if(i.match(/^[0-9\\.]+$/)) fl = "-i"; const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`asnmap \${fl} \${i} -silent\${f}\`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("mapcidr_scan", "CIDR utility.", { cidr: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ cidr, flags }) => { const c = sanitize(cidr); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`echo "\${c}" | mapcidr -silent\${f}\`, 60000); return { content: [{ type: "text", text: result }] }; });
  server.tool("feroxbuster_scan", "Fast recursive content discovery.", { url: z.string(), wordlist: z.string().optional(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, wordlist, flags }) => { const u = sanitize(url); const w = await resolveWordlist(wordlist, "/usr/share/wordlists/dirb/common.txt"); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`feroxbuster -u \${u} -w \${w} -d 2 --silent\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("wfuzz_scan", "Web fuzzer.", { url: z.string(), wordlist: z.string().optional(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, wordlist, flags }) => { const u = sanitize(url); const w = await resolveWordlist(wordlist, "/usr/share/wordlists/dirb/common.txt"); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`wfuzz -c -z file,\${w} --hc 404 \${u}\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("httprobe_scan", "Probe HTTP/HTTPS.", { domains: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domains, flags }) => { const d = sanitize(domains); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`echo "\${d}" | tr ' ' '\\n' | httprobe\${f}\`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("waymore_scan", "Wayback URLs.", { domain: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domain, flags }) => { const d = sanitize(domain); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`python3 /opt/waymore/waymore.py -i \${d} -mode U\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("naabu_scan", "Fast port scanner.", { target: z.string(), ports: z.string().optional(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ target, ports, flags }) => { const t = sanitize(target); const p = sanitize(ports || "top-100"); const pFlag = p === "full" ? "-p -" : \`-p \${p}\`; const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`naabu -host \${t} \${pFlag} -silent\${f}\`, 180000); return { content: [{ type: "text", text: result }] }; });
  server.tool("rustscan_scan", "Modern port scanner.", { target: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ target, flags }) => { const t = sanitize(target); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`rustscan -a \${t} -- -sV\${f}\`, 180000); return { content: [{ type: "text", text: result }] }; });
  server.tool("sandmap_scan", "Nmap wrapper.", { target: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ target, flags }) => { const t = sanitize(target); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`sandmap -d \${t}\${f}\`, 60000); return { content: [{ type: "text", text: result }] }; });
  server.tool("subjs_scan", "Fetch JS files.", { domains_file: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domains_file, flags }) => { const d = sanitize(domains_file); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`cat \${d} | subjs\${f}\`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("getjs_scan", "Extract JS files.", { url: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, flags }) => { const u = sanitize(url); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`getJS --url \${u}\${f}\`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("secretfinder_scan", "Find secrets in JS.", { url: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, flags }) => { const u = sanitize(url); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`python3 /opt/SecretFinder/SecretFinder.py -i \${u} -o cli\${f}\`, 180000); return { content: [{ type: "text", text: result }] }; });
  server.tool("mantra_scan", "Hunt down API keys.", { url: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, flags }) => { const u = sanitize(url); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`echo "\${u}" | mantra\${f}\`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("gitgraber_scan", "GitHub secrets monitor.", { keyword: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ keyword, flags }) => { const k = sanitize(keyword); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`python3 /opt/gitGraber/gitGraber.py -k \${k}\${f}\`, 180000); return { content: [{ type: "text", text: result }] }; });
  server.tool("aws_cli", "AWS operations.", { command: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ command, flags }) => { const c = sanitize(command); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`aws \${c}\${f}\`, 120000); return { content: [{ type: "text", text: result }] }; });
  server.tool("lazys3_scan", "S3 bruteforce.", { company: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ company, flags }) => { const c = sanitize(company); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`ruby /opt/lazys3/lazys3.rb \${c}\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("s3scanner_scan", "Scan S3 buckets.", { domains_file: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ domains_file, flags }) => { const d = sanitize(domains_file); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`s3scanner scan -f \${d}\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("commix_run", "Command injection.", { url: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, flags }) => { const u = sanitize(url); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`commix --url="\${u}" --batch\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("fuxploider_run", "File upload vulns.", { url: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, flags }) => { const u = sanitize(url); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`python3 /opt/fuxploider/fuxploider.py -u "\${u}"\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("cmsmap_scan", "CMS scanner.", { url: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, flags }) => { const u = sanitize(url); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`cmsmap \${u}\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("openredirectx_scan", "Open Redirect scanner.", { urls_file: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ urls_file, flags }) => { const u = sanitize(urls_file); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`python3 /opt/OpenRedireX/openredirex.py -l \${u} --keyword FUZZ\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
  server.tool("lfify_scan", "LFI scanner.", { url: z.string(), flags: z.string().optional().describe("Extra CLI flags to pass to the tool (e.g. -v, -threads 100)") }, async ({ url, flags }) => { const u = sanitize(url); const f = flags ? " " + sanitize(flags) : ""; const result = await run(\`lfify "\${u}"\${f}\`, 300000); return { content: [{ type: "text", text: result }] }; });
`;

if (!updatedCode.includes('dnsx_scan')) {
  updatedCode = updatedCode.replace('// ─── AI Reasoning Engine ───────────────────────────────────────────────────────', newTools + '\n\n// ─── AI Reasoning Engine ───────────────────────────────────────────────────────');
}

fs.writeFileSync('c:/shared-folder/MCP sever/server.js', updatedCode);
console.log("Successfully rebuilt server.js without syntax errors!");
