
(function () {
    const vscode = acquireVsCodeApi();

    vscode.postMessage({ type: 'webview->exthost:ready' });

    function init() {
        const byteOne = window.document.getElementById('byte-one');
        byteOne.oninput = function() {
            vscode.postMessage({ type: 'webview->exthost:byte-one', payload: byteOne.value });
        };
    
        const byteTwo = window.document.getElementById('byte-two');
        byteTwo.oninput = function() {
            vscode.postMessage({ type: 'webview->exthost:byte-two', payload: byteTwo.value });
        };

        const byteThree = window.document.getElementById('byte-three');
        byteThree.oninput = function() {
            vscode.postMessage({ type: 'webview->exthost:byte-three', payload: byteThree.value });
        };
    }

    function setHex(hex) {
        const byteOne = window.document.getElementById('byte-one');
        byteOne.value = hex[0];
        
        const byteTwo = window.document.getElementById('byte-two');
        byteTwo.value = hex[1];
        
        const byteThree = window.document.getElementById('byte-three');
        byteThree.value = hex[2];
    }

    let isInit = false;

    window.addEventListener('message', e => {
        if (!isInit) {
            init();
            isInit = true;
        }

        switch (e.data.type) {
            case 'exhost->webview:setHex':
                setHex(e.data.payload);
                break;
        }
    });
})();

