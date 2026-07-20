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

            // The problem: we have strings that start with a backtick but end with " or '
            // e.g., `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/companies"
            // We want to replace the trailing " or ' with a backtick if it comes after /companies or something similar.

            // Find all instances of: `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}...
            // And ensure they end with a backtick instead of a quote or just nothing.
            
            // A simpler way: just run a regex that captures everything from `${import... to the next " or '
            const regex = /(`\$\{import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/localhost:5000\/api'\}[^`]*?)(["'])/g;
            
            if (regex.test(content)) {
                 content = content.replace(regex, "$1`");
                 modified = true;
            }

            // Also check for the case where there is no trailing quote at all, like `${.../feed/${feedType});
            // Wait, if it was '.../feed/' + feedType, my previous script didn't touch it.
            // But if it was `.../feed/${feedType}`, the backtick was at the end. Did my script delete it?
            // In Feed.jsx: fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/feed/${feedType}`);
            // Let's manually fix Feed.jsx line 37 just in case.
            if (content.includes("fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/feed/${feedType}`);")) {
                content = content.replace("fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/feed/${feedType}`);", "fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/feed/${feedType}`);");
                // wait, if the backtick is missing, it would be: fetch(`${...}/feed/${feedType});
            }
            const badFeedType = "fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/feed/${feedType});";
            if (content.includes(badFeedType)) {
                 content = content.replace(badFeedType, "fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/feed/${feedType}`);");
                 modified = true;
            }
            
            // Wait, in Feed.jsx line 37 from grep:
            // const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/feed/${feedType}`);
            // It actually HAS the backtick in the grep output!
            // Wait! If it HAS the backtick, why did esbuild fail?
            // "Expected ) but found $"
            // Ah! The backtick in the grep output was:
            // fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/feed/${feedType}`);
            // Wait... look closely: `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/feed/${feedType}`
            // This is perfectly valid Javascript! 
            // BUT wait! In LiveTracking.jsx: let url = `${import...}/companies/${user.companyId}/employees`;
            // It might be that the string was already closed earlier?
            // Let's do a more robust fix: just reset the `src/` directory to HEAD and do it properly!

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed quotes in', fullPath);
            }
        }
    }
}

processDir(path.join(__dirname, 'src'));
