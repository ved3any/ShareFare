document.addEventListener('DOMContentLoaded', () => {
    const mainbuttons = document.querySelector('.main-buttons');
    const header = document.querySelector('.header');
    const sendBtn = document.getElementById('send-btn');
    const receiveBtn = document.getElementById('receive-btn');
    const scannerContainer = document.getElementById('scanner-container');
    const receiverContainer = document.getElementById('receiver-container');
    const fileTransferContainer = document.getElementById('file-transfer-container');
    const qrReader = document.getElementById('qr-reader');
    const qrcodeContainer = document.getElementById('qrcode');
    const fileInput = document.getElementById('file-input');
    const sendFileBtn = document.getElementById('send-file-btn');
    const statusDiv = document.getElementById('status');
    const receivedFilesContainer = document.getElementById('received-files');

    let ws;
    let html5QrCode;

    // Helper to get the correct WebSocket URL for current environment
    function getWebSocketUrl(id) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/ws?id=${id}`;
    }

    // Show scanner to send files
    sendBtn.addEventListener('click', () => {
        scannerContainer.style.display = 'block';
        receiverContainer.style.display = 'none';
        fileTransferContainer.style.display = 'none';
        mainbuttons.style.display = 'none';
        header.querySelector('h1').innerText = 'Send';
        header.querySelector('p').innerText = 'Scan the QR code on the other receiver device to send files.';
        startScanner();
    });

    // Generate and show QR code to receive files
    receiveBtn.addEventListener('click', () => {
        scannerContainer.style.display = 'none';
        receiverContainer.style.display = 'block';
        fileTransferContainer.style.display = 'none';
        mainbuttons.style.display = 'none';
        mainbuttons.style.display = 'none';
        header.querySelector('h1').innerText = 'Receive';
        header.querySelector('p').innerText = 'Scan the QR code on the other sender device to receive files.';
        generateQRCode();
    });

    // Start the QR code scanner
    function startScanner() {
        html5QrCode = new Html5Qrcode("qr-reader");
        html5QrCode.start(
            { facingMode: "environment" }, // Use the back camera
            {
                fps: 10,
                qrbox: 190
            },
            onScanSuccess,
            onScanFailure
        ).catch(err => {
            console.error(`Unable to start scanning, error: ${err}`);
            statusDiv.innerHTML = `Error: Unable to start scanning.`;
        });
    }

    // Handle successful QR code scan
    function onScanSuccess(decodedText, decodedResult) {
        console.log(`Code matched = ${decodedText}`, decodedResult);
        html5QrCode.stop().then(() => {
            scannerContainer.style.display = 'none';
            connectWebSocket(decodedText);
        }).catch(err => console.error(`Unable to stop scanning, error: ${err}`));
    }

    // Handle failed QR code scan
    function onScanFailure(error) {
        // console.warn(`Code scan error = ${error}`);
    }

    // Generate a unique ID and display it as a QR code
    function generateQRCode() {
        const uniqueId = Math.random().toString(36).substring(2, 15);
        const wsUrl = getWebSocketUrl(uniqueId);
        qrcodeContainer.innerHTML = '';
        new QRCode(qrcodeContainer, {
            text: wsUrl,
            width: 256,
            height: 256,
            colorLight: "#e5e5e6ff",
            colorDark: "#000a3eff",
            correctLevel: QRCode.CorrectLevel.H
        });

        const logoImg = document.createElement('img');
        logoImg.src = "images/ShareFareLogo.png";
        logoImg.id = 'qr-logo';
        qrcodeContainer.appendChild(logoImg);

        startWebSocketServer(wsUrl);
    }

    // Connect to the WebSocket server
    function connectWebSocket(serverUrl) {
        ws = new WebSocket(serverUrl);
        setupWebSocketEvents();
        fileTransferContainer.style.display = 'flex';
    }

    // Start a WebSocket server (for the receiver)
    function startWebSocketServer(serverUrl) {
        // This is a simplified client-side representation.
        // A real implementation requires a WebSocket server.
        // For this example, we'll simulate the connection.
        console.log(`WebSocket server started at ${serverUrl}`);
        ws = new WebSocket(serverUrl);
        setupWebSocketEvents();
    }

    // Set up WebSocket event listeners
    function setupWebSocketEvents() {
        ws.onopen = () => {
            statusDiv.innerHTML = 'Connected!';
            console.log('WebSocket connection established');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'file') {
                receiveFile(data);
            }
        };

        ws.onclose = () => {
            statusDiv.innerHTML = 'Disconnected.';
            console.log('WebSocket connection closed');
        };

        ws.onerror = (error) => {
            statusDiv.innerHTML = `Error: ${error.message}`;
            console.error('WebSocket error:', error);
        };
    }

    // Send files when the button is clicked
    sendFileBtn.addEventListener('click', () => {
        const files = fileInput.files;
        if (files.length === 0) {
            statusDiv.innerHTML = 'Please select files to send.';
            return;
        }

        for (const file of files) {
            sendFile(file);
        }
    });

    // Send a file over the WebSocket connection
    function sendFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            ws.send(JSON.stringify({ type: 'file', name: file.name, data: e.target.result }));
            statusDiv.innerHTML = `Sent: ${file.name}`;
        };
        reader.readAsDataURL(file);
    }

    // Receive a file and create a download link
    function receiveFile(fileData) {
        const link = document.createElement('a');
        link.href = fileData.data;
        link.download = fileData.name;
        link.innerHTML = `Download ${fileData.name}`;
        receivedFilesContainer.appendChild(link);
        receivedFilesContainer.appendChild(document.createElement('br'));
    }
});