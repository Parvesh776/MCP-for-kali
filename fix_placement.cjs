const fs = require('fs');
let code = fs.readFileSync('c:/shared-folder/MCP sever/server.js', 'utf8');

const markerStart = '  // --- 4 Tools from yesterday ---';
const markerEnd = '// ─── AI Reasoning Engine ───────────────────────────────────────────────────────';
const injectTarget = '  // ─── Core Recon Tools ───';

if (code.indexOf(markerStart) < code.indexOf('function createMcpServer()')) {
  // Extract tools
  const toolsBlock = code.substring(code.indexOf(markerStart), code.indexOf(markerEnd));
  
  // Remove tools from top
  code = code.replace(toolsBlock, '');
  
  // Inject into createMcpServer
  code = code.replace(injectTarget, injectTarget + '\n' + toolsBlock);
  
  fs.writeFileSync('c:/shared-folder/MCP sever/server.js', code);
  console.log('Fixed tools placement!');
} else {
  console.log('Tools already in the right place.');
}
