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

            // Replace all occurrences of localhost with the live backend URL
            content = content.replace(/http:\/\/localhost:5000\/api/g, 'https://hrms-backend-22uq.onrender.com/api');
            content = content.replace(/http:\/\/localhost:5000/g, 'https://hrms-backend-22uq.onrender.com');
            content = content.replace(/http:\/\/127\.0\.0\.1:5000\/api/g, 'https://hrms-backend-22uq.onrender.com/api');
            content = content.replace(/http:\/\/127\.0\.0\.1:5000/g, 'https://hrms-backend-22uq.onrender.com');

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed cleanly', fullPath);
            }
        }
    }
}

processDir(path.join(__dirname, 'src'));
