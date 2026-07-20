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

            const badString = "`${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}}";
            const goodString = "`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`";

            if (content.includes(badString)) {
                content = content.split(badString).join(goodString);
                modified = true;
            }

            // Also check for the variant with a double quote or single quote that might be messed up
            const badString2 = "${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}}";
            const goodString2 = "${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}";
            if (content.includes(badString2)) {
                 content = content.split(badString2).join(goodString2);
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
