const http = require('http');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// 1. Load environment variables securely from .env
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.error("Critical: Could not locate .env credentials file.");
        process.exit(1);
    }
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
        if (match) {
            let val = match[2].trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            env[match[1]] = val;
        }
    });
    return env;
}

const env = loadEnv();
const PORT = parseInt(env.PORT || 3000, 10);

const CLOUDFLARE_ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_D1_DATABASE_ID = env.CLOUDFLARE_D1_DATABASE_ID;

const R2_BUCKET_NAME = env.R2_BUCKET_NAME;
const R2_ACCESS_KEY_ID = env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_URL = env.R2_PUBLIC_URL;

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

// 2. Initialize Cloudflare R2 S3 Client
const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY
    }
});

// 3. Cloudflare D1 query REST helper
async function queryD1(sql, params = []) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_D1_DATABASE_ID}/query`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql, params })
    });
    
    const data = await response.json();
    if (!data.success) {
        throw new Error(`D1 API Error: ${JSON.stringify(data.errors)}`);
    }
    return data.result[0];
}

// 4. Cloudflare R2 Upload Helper
async function uploadToR2(base64Payload, suffix) {
    if (!base64Payload || !base64Payload.startsWith('data:image/')) return "";
    const matches = base64Payload.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return "";
    
    const ext = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    const filename = `uploaded_${Date.now()}_${suffix}.${ext}`;
    const key = `assets/images/${filename}`;
    
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: `image/${ext}`
    });
    
    await s3Client.send(command);
    return `${R2_PUBLIC_URL}/${key}`;
}

// 5. Cloudflare R2 Delete/Sweep Helper
async function deleteFromR2(url) {
    if (!url || !url.startsWith(R2_PUBLIC_URL)) return;
    const key = url.replace(`${R2_PUBLIC_URL}/`, '');
    
    const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key
    });
    
    try {
        await s3Client.send(command);
    } catch (e) {
        console.error("Failed to delete from R2:", e);
    }
}

// 6. Create Web Server
http.createServer((req, res) => {
    // Decodes URL and parses components
    const decodedUrl = decodeURIComponent(req.url);
    const urlObj = new URL(decodedUrl, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;

    // Intercept Dynamic API Calls
    if (pathname === '/api/properties') {
        
        // GET Request: Serve all properties from D1
        if (req.method === 'GET') {
            queryD1("SELECT * FROM properties ORDER BY id DESC")
                .then(resD1 => {
                    const rows = resD1.results || [];
                    const properties = rows.map(row => {
                        return {
                            ...row,
                            bhk: JSON.parse(row.bhk || '[]'),
                            amenities: JSON.parse(row.amenities || '[]'),
                            isCustom: row.isCustom === 1
                        };
                    });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(properties));
                })
                .catch(err => {
                    console.error("GET Error:", err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Failed to read database from D1" }));
                });
            return;
        }
        
        // POST Request: Add new property with R2 upload & D1 save
        else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const newProperty = JSON.parse(body);

                    // Upload images to Cloudflare R2
                    const imgUrl = await uploadToR2(newProperty.imageFilePayload, 'main');
                    const img2Url = await uploadToR2(newProperty.image2FilePayload, 'gallery2');
                    const img3Url = await uploadToR2(newProperty.image3FilePayload, 'gallery3');

                    newProperty.image = imgUrl || "assets/images/residential.png";
                    newProperty.image2 = img2Url || "";
                    newProperty.image3 = img3Url || "";

                    const priceVal = parseFloat(newProperty.priceNum || 0);
                    const priceText = newProperty.price || `₹${priceVal} Cr* Onwards`;

                    // Generate sequential ID
                    const maxIdD1 = await queryD1("SELECT IFNULL(MAX(id), 0) as maxId FROM properties");
                    const nextId = (maxIdD1.results[0].maxId + 1).toString();

                    const sql = `
                        INSERT INTO properties (
                            id, name, builderName, builder, type, status, location, price, priceNum, size, description, rera, bhk, bhkText, amenities, image, image2, image3, ownerName, ownerPhone, ownerUserType, isCustom
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                    `;

                    const params = [
                        parseInt(nextId, 10),
                        newProperty.name || "",
                        newProperty.builderName || "",
                        newProperty.builder || "",
                        newProperty.type || "",
                        newProperty.status || "",
                        newProperty.location || "",
                        priceText,
                        priceVal,
                        newProperty.size || "",
                        newProperty.description || "",
                        newProperty.rera || "",
                        JSON.stringify(newProperty.bhk || []),
                        newProperty.bhkText || "",
                        JSON.stringify(newProperty.amenities || []),
                        newProperty.image,
                        newProperty.image2,
                        newProperty.image3,
                        newProperty.ownerName || "",
                        newProperty.ownerPhone || "",
                        newProperty.ownerUserType || ""
                    ];

                    await queryD1(sql, params);

                    const responsePayload = {
                        ...newProperty,
                        id: nextId,
                        isCustom: true
                    };
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(responsePayload));
                } catch (err) {
                    console.error('POST Error:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Failed to store property on Cloudflare" }));
                }
            });
            return;
        }

        // PUT Request: Update listing & sweep R2 uploads
        else if (req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const updatedProperty = JSON.parse(body);

                    // Fetch old property from D1
                    const oldPropRes = await queryD1("SELECT * FROM properties WHERE id = ?", [parseInt(updatedProperty.id, 10)]);
                    if (!oldPropRes.results || oldPropRes.results.length === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: "Property ID not found" }));
                        return;
                    }
                    const oldProperty = oldPropRes.results[0];

                    updatedProperty.image = oldProperty.image;
                    updatedProperty.image2 = oldProperty.image2 || "";
                    updatedProperty.image3 = oldProperty.image3 || "";

                    // Process Slot 1 (Showcase)
                    if (updatedProperty.imageFilePayload && updatedProperty.imageFilePayload.startsWith('data:image/')) {
                        const newImgUrl = await uploadToR2(updatedProperty.imageFilePayload, 'main');
                        if (newImgUrl) {
                            await deleteFromR2(oldProperty.image);
                            updatedProperty.image = newImgUrl;
                        }
                    }

                    // Process Slot 2 (Gallery 2)
                    if (updatedProperty.image2Cleared === true) {
                        await deleteFromR2(oldProperty.image2);
                        updatedProperty.image2 = "";
                    } else if (updatedProperty.image2FilePayload && updatedProperty.image2FilePayload.startsWith('data:image/')) {
                        const newImg2Url = await uploadToR2(updatedProperty.image2FilePayload, 'gallery2');
                        if (newImg2Url) {
                            await deleteFromR2(oldProperty.image2);
                            updatedProperty.image2 = newImg2Url;
                        }
                    }

                    // Process Slot 3 (Gallery 3)
                    if (updatedProperty.image3Cleared === true) {
                        await deleteFromR2(oldProperty.image3);
                        updatedProperty.image3 = "";
                    } else if (updatedProperty.image3FilePayload && updatedProperty.image3FilePayload.startsWith('data:image/')) {
                        const newImg3Url = await uploadToR2(updatedProperty.image3FilePayload, 'gallery3');
                        if (newImg3Url) {
                            await deleteFromR2(oldProperty.image3);
                            updatedProperty.image3 = newImg3Url;
                        }
                    }

                    const priceVal = parseFloat(updatedProperty.priceNum || 0);
                    const priceText = updatedProperty.price || `₹${priceVal} Cr* Onwards`;

                    const sql = `
                        UPDATE properties SET
                            name = ?, builderName = ?, builder = ?, type = ?, status = ?, location = ?, price = ?, priceNum = ?, size = ?, description = ?, rera = ?, bhk = ?, bhkText = ?, amenities = ?, image = ?, image2 = ?, image3 = ?, ownerName = ?, ownerPhone = ?, ownerUserType = ?
                        WHERE id = ?
                    `;

                    const params = [
                        updatedProperty.name || "",
                        updatedProperty.builderName || "",
                        updatedProperty.builder || "",
                        updatedProperty.type || "",
                        updatedProperty.status || "",
                        updatedProperty.location || "",
                        priceText,
                        priceVal,
                        updatedProperty.size || "",
                        updatedProperty.description || "",
                        updatedProperty.rera || "",
                        JSON.stringify(updatedProperty.bhk || []),
                        updatedProperty.bhkText || "",
                        JSON.stringify(updatedProperty.amenities || []),
                        updatedProperty.image,
                        updatedProperty.image2,
                        updatedProperty.image3,
                        updatedProperty.ownerName || "",
                        updatedProperty.ownerPhone || "",
                        updatedProperty.ownerUserType || "",
                        parseInt(updatedProperty.id, 10)
                    ];

                    await queryD1(sql, params);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(updatedProperty));
                } catch (err) {
                    console.error('PUT Error:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Failed to update property on Cloudflare" }));
                }
            });
            return;
        }

        // DELETE Request: Delete listing & sweep R2 bucket
        else if (req.method === 'DELETE') {
            const id = urlObj.searchParams.get('id');
            if (!id) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Missing listing ID parameter" }));
                return;
            }

            queryD1("SELECT * FROM properties WHERE id = ?", [parseInt(id, 10)])
                .then(async oldPropRes => {
                    if (!oldPropRes.results || oldPropRes.results.length === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: "Property ID not found" }));
                        return;
                    }
                    const propertyToDelete = oldPropRes.results[0];

                    // Delete custom images from Cloudflare R2
                    await deleteFromR2(propertyToDelete.image);
                    await deleteFromR2(propertyToDelete.image2);
                    await deleteFromR2(propertyToDelete.image3);

                    // Delete from D1
                    await queryD1("DELETE FROM properties WHERE id = ?", [parseInt(id, 10)]);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: `Successfully deleted listing ${id}` }));
                })
                .catch(err => {
                    console.error('DELETE Error:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: "Failed to delete property from Cloudflare" }));
                });
            return;
        }
    }

    // Fallback: Static File Server
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
