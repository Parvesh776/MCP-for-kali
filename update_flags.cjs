const fs = require('fs');
let code = fs.readFileSync('c:/shared-folder/MCP sever/server.js', 'utf8');

// A simple approach: We will look for each tool block.
let toolRegex = /server\.tool\(\s*"([^"]+)",\s*"([^"]+)",\s*({[\s\S]*?}),\s*async\s*\({([^}]+)}\)\s*=>\s*{([\s\S]*?})\s*\);/g;

let updatedCode = code.replace(toolRegex, (match, toolName, desc, paramsObj, argsList, body) => {
    // If it already has flags or params, skip
    if (argsList.includes('flags') || argsList.includes('params')) {
        return match;
    }
    
    // 1. Add flags to params object
    let newParamsObj = paramsObj.replace(/}\s*$/, `, flags: z.string().optional().describe("Extra CLI flags to pass to the tool") }`);
    if (paramsObj === '{}') {
        newParamsObj = `{ flags: z.string().optional().describe("Extra CLI flags to pass to the tool") }`;
    }
    
    // 2. Add flags to args list
    let newArgsList = argsList.trim();
    if (newArgsList === '') {
        newArgsList = 'flags';
    } else {
        newArgsList += ', flags';
    }
    
    // 3. Add const f = flags ? ` ${sanitize(flags)}` : ""; to body
    let newBody = body.replace(/{\s*/, `{\n      const f = flags ? \\\` \\\${sanitize(flags)}\\\` : "";\n`);
    
    // 4. Inject ${f} into the run() command
    // We look for run(`...`, timeout)
    newBody = newBody.replace(/run\(\s*`([^`]+)`/, (runMatch, cmd) => {
        // If the command already ends with something, we append ${f}
        return `run(\`${cmd}\${f}\``;
    });

    return `server.tool(\n    "${toolName}",\n    "${desc}",\n    ${newParamsObj},\n    async ({ ${newArgsList} }) => ${newBody}\n  );`;
});

fs.writeFileSync('c:/shared-folder/MCP sever/server.js', updatedCode);
console.log("Done updating flags!");
