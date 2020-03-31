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
			const oldHex: [number, number, number] = [document.hex[0], document.hex[1], document.hex[2]];

			switch (e.type) {
				case 'webview->exthost:ready':
					webviewPanel.webview.postMessage({
						type: 'exhost->webview:setHex',
						payload: [document.hex[0], document.hex[1], document.hex[2]]
					});
					break;
				case 'webview->exthost:byte-one':
					document.hex = [Number(e.payload), document.hex[1], document.hex[2]];
					this._onDidEdit.fire({ document, edit: { oldHex, newHex: document.hex.slice(0) as [number, number, number] }, label: `Byte One Changed To ${e.payload}` });
					break;
				case 'webview->exthost:byte-two':
					document.hex = [document.hex[0], Number(e.payload), document.hex[2]];
					this._onDidEdit.fire({ document, edit: { oldHex, newHex: document.hex.slice(0) as [number, number, number] }, label: `Byte Two Changed To ${e.payload}` });
					break;
				case 'webview->exthost:byte-three':
					document.hex = [document.hex[0], document.hex[1], Number(e.payload)];
					this._onDidEdit.fire({ document, edit: { oldHex, newHex: document.hex.slice(0) as [number, number, number] }, label: `Byte Three Changed To ${e.payload}` });
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
		return document.save();
	}

	async saveAs(document: MyCustomDocument, targetResource: vscode.Uri): Promise<void> {
		return document.save(targetResource);
	}

	async applyEdits(document: MyCustomDocument, edits: readonly MyCustomEdit[]): Promise<void> {
		document.applyEdits(edits);
	}

	async undoEdits(document: MyCustomDocument, edits: readonly MyCustomEdit[]): Promise<void> {
		document.undoEdits(edits);
	}

	async revert(document: MyCustomDocument, edits: vscode.CustomDocumentRevert<MyCustomEdit>): Promise<void> {
		return document.revert();
	}

	async backup(document: MyCustomDocument, cancellation: vscode.CancellationToken): Promise<void> {
		return document.backup();
	}
}

interface MyCustomEdit {
	oldHex: [number, number, number];
	newHex: [number, number, number];
}

class MyCustomDocument extends vscode.CustomDocument<MyCustomEdit> {

	public hex: [number, number, number] = [0, 0, 0];

	private get backupUri() { return this.uri.with({ path: `${this.uri.path}.bak` }); }

	private _onDidChange = new vscode.EventEmitter<void>();
	onDidChange: vscode.Event<void> = this._onDidChange.event;

	setHex(newHex: [number, number, number]): void {
		const currentHex = this.hex;
		if (!currentHex) {
			return;
		}

		if (newHex[0] !== currentHex[0] || newHex[1] !== currentHex[1] || newHex[2] !== currentHex[2]) {
			this.hex = newHex;
			this._onDidChange.fire();
		}
	}

	async resolve(): Promise<[number, number, number]> {
		let hex;
		try {
			hex = (await vscode.workspace.fs.readFile(this.backupUri)).slice(0, 3);
		} catch (error) {
			hex = (await vscode.workspace.fs.readFile(this.uri)).slice(0, 3);
		}

		return [hex[0], hex[1], hex[2]];
	}

	async revert(): Promise<void> {
		this.setHex(await this.resolve());

		return this.delBackup();
	}

	async save(target = this.uri, delBackup = true): Promise<void> {
		const buffer = await vscode.workspace.fs.readFile(this.uri);

		await vscode.workspace.fs.writeFile(target, Buffer.from([...this.hex, ...buffer.slice(3)]));

		if (delBackup) {
			return this.delBackup();
		}
	}

	applyEdits(edits: readonly MyCustomEdit[]): void {
		for (const edit of edits) {
			this.setHex(edit.newHex);
		}
	}

	undoEdits(edits: readonly MyCustomEdit[]): void {
		for (const edit of edits) {
			this.setHex(edit.oldHex);
		}
	}

	backup(): Promise<void> {
		return this.save(this.backupUri, false);
	}

	async delBackup(): Promise<void> {
		try {
			await vscode.workspace.fs.delete(this.backupUri);
		} catch (error) {
			// ignore if not exists
		}
	}
}



// this method is called when your extension is deactivated
export function deactivate() { }
