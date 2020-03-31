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

class CustomEditorProvider implements vscode.CustomEditorProvider, vscode.CustomEditorEditingDelegate {

	async openCustomDocument(uri: vscode.Uri, token: vscode.CancellationToken): Promise<MyCustomDocument> {
		const myCustomDocument = new MyCustomDocument('binary.editor', uri);
		myCustomDocument.hex = await myCustomDocument.resolve();

		return myCustomDocument;
	}

	async resolveCustomEditor(document: MyCustomDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
		const disposables: vscode.Disposable[] = [];

		disposables.push(webviewPanel.onDidDispose(() => {
			disposables.forEach(d => d.dispose());
		}));

		webviewPanel.webview.options = { enableScripts: true };

		disposables.push(webviewPanel.webview.onDidReceiveMessage(e => {
			switch (e.type) {
				case 'webview->exthost:ready':
					webviewPanel.webview.postMessage({
						type: 'exhost->webview:setHex',
						payload: [document.hex[0], document.hex[1], document.hex[2]]
					});
					break;
				case 'webview->exthost:byte-one':
					document.setHex(Buffer.from([Number(e.payload), document.hex[1], document.hex[2]]));
					this._onDidEdit.fire({ document, edit: { payload: e.payload }, label: `Byte One Changed To ${e.payload}` });
					break;
				case 'webview->exthost:byte-two':
					document.setHex(Buffer.from([document.hex[0], Number(e.payload), document.hex[2]]));
					this._onDidEdit.fire({ document, edit: { payload: e.payload }, label: `Byte Two Changed To ${e.payload}` });
					break;
				case 'webview->exthost:byte-three':
					document.setHex(Buffer.from([document.hex[0], document.hex[1], Number(e.payload)]));
					this._onDidEdit.fire({ document, edit: { payload: e.payload }, label: `Byte Three Changed To ${e.payload}` });
					break;
			}
		}));

		disposables.push(document.onDidChange(() => {
			webviewPanel.webview.postMessage({
				type: 'exhost->webview:setHex',
				payload: [document.hex[0], document.hex[1], document.hex[2]]
			});
		}));

		webviewPanel.webview.html = this.getEditorHtml(document, webviewPanel);
	}

	private getEditorHtml(document: MyCustomDocument, panel: vscode.WebviewPanel): string {
		return `
		<html>
			<head>
			</head>	
			<body>
				<input id="byte-one"></input>
				<input id="byte-two"></input>
				<input id="byte-three"></input>

				<script src="${panel.webview.asWebviewUri(vscode.Uri.file(path.resolve(__dirname, '..', 'static', 'editor.js')))}"></script>
			</body>
		</html>`;
	}

	get editingDelegate() { return this; };

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
		return document.revert();
	}

	async backup(document: MyCustomDocument, cancellation: vscode.CancellationToken): Promise<void> {
		console.log("backup", document);
	}
}

interface MyCustomEdit {
	payload: string;
}

class MyCustomDocument extends vscode.CustomDocument<MyCustomEdit> {

	public hex: Uint8Array = Buffer.from([]);

	private _onDidChange = new vscode.EventEmitter<void>();
	onDidChange: vscode.Event<void> = this._onDidChange.event;

	setHex(newHex: Uint8Array): void {
		const currentHex = this.hex;
		if (!currentHex) {
			return;
		}

		if (newHex[0] !== currentHex[0] || newHex[1] !== currentHex[1] || newHex[2] !== currentHex[2]) {
			this._onDidChange.fire();
			this.hex = newHex;
		}
	}

	async resolve(): Promise<Uint8Array> {
		const hex = (await vscode.workspace.fs.readFile(this.uri)).slice(0, 3);

		return hex;
	}

	async revert(): Promise<void> {
		this.setHex(await this.resolve());
	}
}

// this method is called when your extension is deactivated
export function deactivate() { }
