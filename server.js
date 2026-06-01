const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.json': 'application/json'
};

const PROPERTIES_FILE = path.join(__dirname, 'properties.json');
const UPLOAD_DIR = path.join(__dirname, 'assets', 'images');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

http.createServer((req, res) => {
    // 1. Decodes URL and parses components
    const decodedUrl = decodeURIComponent(req.url);
    const urlObj = new URL(decodedUrl, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;

    // 2. Intercept Dynamic API Calls
    if (pathname === '/api/properties') {
        
        // GET Request: Serve all properties
        if (req.method === 'GET') {
            fs.readFile(PROPERTIES_FILE, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Failed to read database file" }));
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
            });
            return;
        }
        
        // POST Request: Add new property with image decoding
        else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                try {
                    const newProperty = JSON.parse(body);
                    
                    // Validate basic metadata
                    if (!newProperty.name || !newProperty.builderName || !newProperty.price || !newProperty.location) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: "Missing required property parameters" }));
                        return;
                    }

                    // Read current database listings
                    fs.readFile(PROPERTIES_FILE, 'utf8', (err, data) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: "Database file read failed" }));
                            return;
                        }

                        let properties = [];
                        try {
                            properties = JSON.parse(data);
                        } catch (e) {
                            properties = [];
                        }

                        // Image decoding: process all 3 slots
                        const imageSlots = [
                            { payloadKey: 'imageFilePayload', targetKey: 'image', suffix: 'main' },
                            { payloadKey: 'image2FilePayload', targetKey: 'image2', suffix: 'gallery2' },
                            { payloadKey: 'image3FilePayload', targetKey: 'image3', suffix: 'gallery3' }
                        ];

                        for (const { payloadKey, targetKey, suffix } of imageSlots) {
                            const payload = newProperty[payloadKey];
                            if (payload && payload.startsWith('data:image/')) {
                                const matches = payload.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
                                if (matches && matches.length === 3) {
                                    const ext = matches[1]; // extension (e.g. png, jpeg, webp)
                                    const base64Data = matches[2]; // pure base64 text
                                    const buffer = Buffer.from(base64Data, 'base64');
                                    
                                    const filename = `uploaded_${Date.now()}_${suffix}.${ext}`;
                                    const relativePath = `assets/images/${filename}`;
                                    const absolutePath = path.join(UPLOAD_DIR, filename);
                                    
                                    // Save file to assets/images
                                    fs.writeFileSync(absolutePath, buffer);
                                    
                                    // Set image path
                                    newProperty[targetKey] = relativePath;
                                }
                            }
                            delete newProperty[payloadKey];
                        }
                        
                        // Create unique id
                        const maxId = properties.reduce((max, p) => Math.max(max, parseInt(p.id || 0, 10)), 0);
                        newProperty.id = (maxId + 1).toString();
                        newProperty.isCustom = true; // Mark as custom upload

                        // Ensure default attributes
                        newProperty.rera = newProperty.rera || "";
                        newProperty.bhk = newProperty.bhk || [];
                        newProperty.amenities = newProperty.amenities || [];
                        newProperty.image2 = newProperty.image2 || "";
                        newProperty.image3 = newProperty.image3 || "";
                        newProperty.ownerUserType = newProperty.ownerUserType || "admin";
                        
                        // If no custom image successfully decoded, fallback
                        if (!newProperty.image) {
                            newProperty.image = "assets/images/residential.png";
                        }

                        // Append and save back to JSON database
                        properties.push(newProperty);
                        fs.writeFileSync(PROPERTIES_FILE, JSON.stringify(properties, null, 2), 'utf8');

                        // Respond
                        res.writeHead(201, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(newProperty));
                    });

                } catch (error) {
                    console.error('POST Error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Failed to process form request" }));
                }
            });
            return;
        }
        
        // PUT Request: Update existing property listing
        else if (req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                try {
                    const updatedProperty = JSON.parse(body);
                    
                    if (!updatedProperty.id || !updatedProperty.name || !updatedProperty.builderName || !updatedProperty.price || !updatedProperty.location) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: "Missing required property parameters for update" }));
                        return;
                    }

                    fs.readFile(PROPERTIES_FILE, 'utf8', (err, data) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: "Database file read failed" }));
                            return;
                        }

                        let properties = [];
                        try {
                            properties = JSON.parse(data);
                        } catch (e) {
                            properties = [];
                        }

                        const index = properties.findIndex(p => p.id === updatedProperty.id);
                        if (index === -1) {
                            res.writeHead(404, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: "Property ID not found" }));
                            return;
                        }

                        const oldProperty = properties[index];

                        // Process all 3 image slots for PUT
                        const imageSlots = [
                            { payloadKey: 'imageFilePayload', targetKey: 'image', suffix: 'main', clearedKey: null },
                            { payloadKey: 'image2FilePayload', targetKey: 'image2', suffix: 'gallery2', clearedKey: 'image2Cleared' },
                            { payloadKey: 'image3FilePayload', targetKey: 'image3', suffix: 'gallery3', clearedKey: 'image3Cleared' }
                        ];

                        for (const { payloadKey, targetKey, suffix, clearedKey } of imageSlots) {
                            // Retain old value by default
                            updatedProperty[targetKey] = oldProperty[targetKey] || "";

                            // 1. If explicit deletion flag is true
                            if (clearedKey && updatedProperty[clearedKey] === true) {
                                // Clean up the old custom image
                                const oldImgPath = oldProperty[targetKey];
                                if (oldImgPath && oldImgPath.startsWith('assets/images/uploaded_')) {
                                    const oldAbsoluteImgPath = path.join(__dirname, oldImgPath);
                                    if (fs.existsSync(oldAbsoluteImgPath)) {
                                        try {
                                            fs.unlinkSync(oldAbsoluteImgPath);
                                        } catch (e) {
                                            console.error(`Failed to delete old ${targetKey}:`, e);
                                        }
                                    }
                                }
                                updatedProperty[targetKey] = "";
                            }
                            
                            // 2. If new Base64 string payload is supplied
                            const payload = updatedProperty[payloadKey];
                            if (payload && payload.startsWith('data:image/')) {
                                const matches = payload.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
                                if (matches && matches.length === 3) {
                                    const ext = matches[1];
                                    const base64Data = matches[2];
                                    const buffer = Buffer.from(base64Data, 'base64');
                                    
                                    const filename = `uploaded_${Date.now()}_${suffix}.${ext}`;
                                    const relativePath = `assets/images/${filename}`;
                                    const absolutePath = path.join(UPLOAD_DIR, filename);
                                    
                                    // Save new file
                                    fs.writeFileSync(absolutePath, buffer);
                                    
                                    // Clean up the old custom image
                                    const oldImgPath = oldProperty[targetKey];
                                    if (oldImgPath && oldImgPath.startsWith('assets/images/uploaded_')) {
                                        const oldAbsoluteImgPath = path.join(__dirname, oldImgPath);
                                        if (fs.existsSync(oldAbsoluteImgPath)) {
                                            try {
                                                fs.unlinkSync(oldAbsoluteImgPath);
                                            } catch (e) {
                                                console.error(`Failed to clean old ${targetKey}:`, e);
                                            }
                                        }
                                    }
                                    
                                    updatedProperty[targetKey] = relativePath;
                                }
                            }
                            
                            delete updatedProperty[payloadKey];
                            if (clearedKey) {
                                delete updatedProperty[clearedKey];
                            }
                        }

                        updatedProperty.isCustom = oldProperty.isCustom || false;

                        // Ensure default attributes
                        updatedProperty.rera = updatedProperty.rera || "";
                        updatedProperty.bhk = updatedProperty.bhk || [];
                        updatedProperty.amenities = updatedProperty.amenities || [];
                        updatedProperty.ownerUserType = updatedProperty.ownerUserType || oldProperty.ownerUserType || "admin";

                        // Merge back
                        properties[index] = updatedProperty;
                        fs.writeFileSync(PROPERTIES_FILE, JSON.stringify(properties, null, 2), 'utf8');

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(updatedProperty));
                    });

                } catch (error) {
                    console.error('PUT Error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Failed to process update request" }));
                }
            });
            return;
        }

        // DELETE Request: Remove project listing & sweep assets
        else if (req.method === 'DELETE') {
            const id = urlObj.searchParams.get('id');
            if (!id) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Missing property ID parameter" }));
                return;
            }

            fs.readFile(PROPERTIES_FILE, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Failed to read properties database" }));
                    return;
                }

                let properties = [];
                try {
                    properties = JSON.parse(data);
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Database parse error" }));
                    return;
                }

                const propertyIndex = properties.findIndex(p => p.id === id);
                if (propertyIndex === -1) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Property ID not found" }));
                    return;
                }

                const propertyToDelete = properties[propertyIndex];

                // Sweep associated image assets if they are custom uploads
                const imagesToSweep = [propertyToDelete.image, propertyToDelete.image2, propertyToDelete.image3];
                for (const imgPath of imagesToSweep) {
                    if (imgPath && imgPath.startsWith('assets/images/uploaded_')) {
                        const absoluteImgPath = path.join(__dirname, imgPath);
                        if (fs.existsSync(absoluteImgPath)) {
                            try {
                                fs.unlinkSync(absoluteImgPath);
                            } catch (e) {
                                console.error('Failed to clear file asset:', e);
                            }
                        }
                    }
                }

                // Filter out the item
                properties.splice(propertyIndex, 1);
                
                // Write back
                fs.writeFileSync(PROPERTIES_FILE, JSON.stringify(properties, null, 2), 'utf8');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: `Successfully deleted listing ${id}` }));
            });
            return;
        }
    }

    // 3. Fallback: Static File Server
    let filePath = '.' + decodedUrl;
    if (filePath === './') filePath = './index.html';

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1><p>BB Realty page could not be located.</p>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Internal server error: ' + error.code + '\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });

}).listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});

