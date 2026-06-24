const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('./src', function(filePath) {
    if (filePath.endsWith('.tsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content
            .replace(/hover:bg-slate-50\/50(?!\s*dark:)/g, 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50')
            .replace(/hover:bg-slate-50\/80(?!\s*dark:)/g, 'hover:bg-slate-50/80 dark:hover:bg-slate-800/80')
            .replace(/hover:bg-slate-50\b(?!\/)(?!\s*dark:)/g, 'hover:bg-slate-50 dark:hover:bg-slate-800')
            .replace(/hover:bg-slate-100\b(?!\/)(?!\s*dark:)/g, 'hover:bg-slate-100 dark:hover:bg-slate-700')
            .replace(/hover:bg-white\b(?!\/)(?!\s*dark:)/g, 'hover:bg-white dark:hover:bg-slate-800')
            .replace(/hover:bg-slate-200\b(?!\/)(?!\s*dark:)/g, 'hover:bg-slate-200 dark:hover:bg-slate-700')
            .replace(/hover:bg-slate-800\/80(?!\s*dark:)/g, 'hover:bg-slate-800/80 dark:hover:bg-slate-800/80'); // already dark?

        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent);
            console.log('Updated ' + filePath);
        }
    }
});
