import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.window.registerCustomEditorProvider('binary.editor', new CustomEditorProvider(), {
		webviewOptions: {
			enableFindWidget: false
		}
	});

	context.subscriptions.push(disposable);
}

class CustomEditorProvider implements vscode.CustomEditorProvider, vscode.CustomEditorEditingDelegate  {
	
	async openCustomDocument(uri: vscode.Uri, token: vscode.CancellationToken): Promise<MyCustomDocument> {
		const myCustomDocument = new MyCustomDocument('binary.editor', uri);
		await myCustomDocument.resolve();

		return myCustomDocument;
	}
	
	async resolveCustomEditor(document: MyCustomDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
		webviewPanel.webview.options = { enableScripts: true };

		webviewPanel.webview.onDidReceiveMessage(e => {
			switch (e.type) {
				case 'webview->exthost:ready':
					webviewPanel.webview.postMessage({
						type: 'exhost->webview:init'
					});
					break;
					case 'webview->exthost:byte-one':
						this._onDidEdit.fire({ document, edit: {payload: e.payload}, label: `Byte One Changed To ${e.payload}`});
					break;
					case 'webview->exthost:byte-two':
						this._onDidEdit.fire({ document, edit: {payload: e.payload}, label: `Byte Two Changed To ${e.payload}`});
					break;
					case 'webview->exthost:byte-three':
						this._onDidEdit.fire({ document, edit: {payload: e.payload}, label: `Byte Three Changed To ${e.payload}`});
					break;
			}
		});

		webviewPanel.webview.html = this.getEditorHtml(document, webviewPanel);
	}

	private getEditorHtml(document: MyCustomDocument, panel: vscode.WebviewPanel): string {
		return `
		<html>
			<head>
			</head>	
			<body>
				<input id="byte-one" value="${document.hex![0]}"></input>
				<input id="byte-two" value="${document.hex![1]}"></input>
				<input id="byte-three" value="${document.hex![2]}"></input>

				<script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.resolve(__dirname, '..', 'static', 'editor.js')))}"></script>
			</body>
		</html>`;
	}

	get editingDelegate() {return this; };

	private _onDidEdit = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<MyCustomEdit>>();
	onDidEdit: vscode.Event<vscode.CustomDocumentEditEvent<MyCustomEdit>> = this._onDidEdit.event;

	async save(document: MyCustomDocument, cancellation: vscode.CancellationToken): Promise<void> {
		console.log("save", document);
	}
	
	async saveAs(document: MyCustomDocument, targetResource: vscode.Uri): Promise<void> {
		console.log("saveAs", document, targetResource);
	}

	async applyEdits(document: MyCustomDocument, edits: readonly MyCustomEdit[]): Promise<void> {
		console.log("applyEdits", document, edits);
	}

	async undoEdits(document: MyCustomDocument, edits: readonly MyCustomEdit[]): Promise<void> {
		console.log("undoEdits", document, edits);
	}

	async revert(document: MyCustomDocument, edits: vscode.CustomDocumentRevert<MyCustomEdit>): Promise<void> {
		console.log("revert", document, edits);
	}

	async backup(document: MyCustomDocument, cancellation: vscode.CancellationToken): Promise<void> {
		console.log("backup", document);
	}
}

interface MyCustomEdit {
	payload: string;
}

class MyCustomDocument extends vscode.CustomDocument<MyCustomEdit> {

	public hex: Uint8Array | undefined;

	async resolve(): Promise<void> {
		this.hex  = await vscode.workspace.fs.readFile(this.uri);
	}
}

// this method is called when your extension is deactivated
export function deactivate() {}
