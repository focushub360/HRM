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
            let modified = false;

            // The bad replacement for regular string quotes:
            // `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`}"
            const badPattern1 = /\${import\.meta\.env\.VITE_API_URL\s*\|\|\s*`\${import\.meta\.env\.VITE_API_URL\s*\|\|\s*'http:\/\/localhost:5000\/api'}`}(\"|')/g;
            if (badPattern1.test(content)) {
                content = content.replace(badPattern1, "${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}");
                modified = true;
            }

            // The bad replacement for nested template strings:
            // `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`}'}
            const badPattern2 = /\${import\.meta\.env\.VITE_API_URL\s*\|\|\s*`\${import\.meta\.env\.VITE_API_URL\s*\|\|\s*`\${import\.meta\.env\.VITE_API_URL\s*\|\|\s*'http:\/\/localhost:5000\/api'}`}(\"|')}/g;
            if (badPattern2.test(content)) {
                 content = content.replace(badPattern2, "${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}");
                 modified = true;
            }
            
            // Catch-all for deeply nested messes: replace multiple nested `${import.meta...}` with just one.
            while (content.includes("`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`}'")) {
                content = content.replace("`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`}'", "`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`");
                modified = true;
            }
            while (content.includes("`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`}\"")) {
                content = content.replace("`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`}\"", "`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`");
                modified = true;
            }

            // More aggressive catch all: 
            // if we see `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 
            const regexMess = /\$\{import\.meta\.env\.VITE_API_URL\s*\|\|\s*`(\$\{import\.meta\.env\.VITE_API_URL\s*\|\|\s*.*?)`\}/g;
            let prevContent = "";
            while (content !== prevContent) {
                 prevContent = content;
                 content = content.replace(regexMess, "$1");
            }
            if (content !== fs.readFileSync(fullPath, 'utf8')) {
                 modified = true;
            }

            // Cleanup quotes
            content = content.replace(/\$\{import\.meta\.env\.VITE_API_URL\s*\|\|\s*'http:\/\/localhost:5000\/api'\}(\"|')/g, "${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}");
            
            // Also the config.js which was originally export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            // It might have become export const API_URL = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`;
            content = content.replace(/export const API_URL = import\.meta\.env\.VITE_API_URL\s*\|\|\s*`\$\{import\.meta\.env\.VITE_API_URL\s*\|\|\s*'http:\/\/localhost:5000\/api'\}`/, "export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'");

            if (content !== fs.readFileSync(fullPath, 'utf8')) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed syntax in', fullPath);
            }
        }
    }
}

processDir(path.join(__dirname, 'src'));
