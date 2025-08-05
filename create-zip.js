
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Cartelle e file da escludere
const excludePatterns = [
    'node_modules',
    '.git',
    '.replit',
    'replit.nix',
    '.gitignore',
    'package-lock.json',
    '.env',
    'dist',
    'build',
    'create-zip.js'
];

function shouldExclude(filePath) {
    return excludePatterns.some(pattern => 
        filePath.includes(pattern) || filePath.endsWith(pattern)
    );
}

function createZip() {
    const output = fs.createWriteStream('calendario-medico-project.zip');
    const archive = archiver('zip', {
        zlib: { level: 9 }
    });

    output.on('close', function() {
        console.log(`ZIP creato con successo! (${archive.pointer()} bytes totali)`);
        console.log('File: calendario-medico-project.zip');
    });

    archive.on('error', function(err) {
        throw err;
    });

    archive.pipe(output);

    function addToArchive(dir, prefix = '') {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const archivePath = prefix ? path.join(prefix, file) : file;
            
            if (shouldExclude(filePath)) {
                return;
            }
            
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                addToArchive(filePath, archivePath);
            } else {
                archive.file(filePath, { name: archivePath });
            }
        });
    }

    addToArchive('.');
    archive.finalize();
}

createZip();
