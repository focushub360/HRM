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

            // Handle http://localhost:5000/api or http://127.0.0.1:5000/api inside template literals
            if (content.includes('`http://localhost:5000/api') || content.includes('`http://127.0.0.1:5000/api')) {
                content = content.replace(/`(http:\/\/localhost:5000\/api|http:\/\/127\.0\.0\.1:5000\/api)/g, '`${import.meta.env.VITE_API_URL || \'http://localhost:5000/api\'}');
                modified = true;
            }

            // Handle "http://localhost:5000/api" or 'http://localhost:5000/api' inside regular strings
            if (content.includes('"http://localhost:5000/api') || content.includes("'http://localhost:5000/api") ||
                content.includes('"http://127.0.0.1:5000/api') || content.includes("'http://127.0.0.1:5000/api")) {
                content = content.replace(/(["'])(http:\/\/localhost:5000\/api|http:\/\/127\.0\.0\.1:5000\/api)/g, '`${import.meta.env.VITE_API_URL || \'http://localhost:5000/api\'}');
                // The trailing quote might still be there if they were string literals, we should replace the trailing quote with a backtick but that requires more complex regex.
                // Let's just do a simpler replacement for regular strings to template literals:
                content = content.replace(/["'](http:\/\/localhost:5000\/api|http:\/\/127\.0\.0\.1:5000\/api)(.*?)["']/g, '`${import.meta.env.VITE_API_URL || \'http://localhost:5000/api\'}$2`');
                modified = true;
            }

            // Handle Socket io('http://localhost:5000')
            if (content.includes("io('http://localhost:5000')") || content.includes('io("http://localhost:5000")')) {
                content = content.replace(/io\(['"]http:\/\/localhost:5000['"]\)/g, "io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000')");
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed', fullPath);
            }
        }
    }
}

processDir(path.join(__dirname, 'src'));
console.log('Done!');
