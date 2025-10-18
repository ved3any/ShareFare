const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('404 Not Found', 'utf-8');
            }
            else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
            }
        }
        else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const wss = new WebSocket.Server({ noServer: true });

const clients = new Map();

server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;
    const query = url.parse(request.url, true).query;

    if (pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            const clientId = query.id;
            clients.set(clientId, ws);
            ws.clientId = clientId;
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        const messageString = message.toString();
        console.log('Received a message');
        // Broadcast the message to all other clients
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(messageString);
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws.clientId);
    });
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});