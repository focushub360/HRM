const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // 1. Replace double or single quote enclosed strings
            // "http://localhost:5000/api..." or 'http://127.0.0.1:5000/api...'
            const regexQuotes = /(["'])(http:\/\/localhost:5000\/api|http:\/\/127\.0\.0\.1:5000\/api)(.*?)\1/g;
            content = content.replace(regexQuotes, '`${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? \'http://localhost:5000/api\' : \'https://hrms-backend-22uq.onrender.com/api\')}$3`');

            // 2. Replace template literal enclosed strings (backticks)
            // `http://localhost:5000/api...`
            const regexBackticks = /`(http:\/\/localhost:5000\/api|http:\/\/127\.0\.0\.1:5000\/api)(.*?)`/g;
            content = content.replace(regexBackticks, '`${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? \'http://localhost:5000/api\' : \'https://hrms-backend-22uq.onrender.com/api\')}$2`');

            // 3. Socket URLs
            content = content.replace(/io\(['"]http:\/\/localhost:5000['"]\)/g, "io(import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://hrms-backend-22uq.onrender.com'))");
            content = content.replace(/io\(`http:\/\/localhost:5000`\)/g, "io(import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://hrms-backend-22uq.onrender.com'))");

            // Fix AuthContext specifically because it was const API_URL = 'http://127.0.0.1:5000/api';
            // Actually the regexQuotes catches it and turns it into const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;
            // Which is totally fine!
            
            // Fix config.js
            if (file === 'config.js') {
                content = "export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api');\nexport const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://hrms-backend-22uq.onrender.com');\n";
            }

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed cleanly', fullPath);
            }
        }
    }
}

processDir(path.join(__dirname, 'src'));
