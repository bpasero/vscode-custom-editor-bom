
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

    window.addEventListener('message', e => {
        switch (e.data.type) {
            case 'exhost->webview:init':
                init();
                break;
        }
    });
})();

