import * as vscode from 'vscode';
import { TECHDEBTMATRIX, TRIGGER_STRING } from './constants';



// A simple global cache to store our found strings so the autocomplete is fast
let cachedSuggestions: string[] = [
	`${TECHDEBTMATRIX[0].shortDescription} - need to see a better method to do this`,
	`${TECHDEBTMATRIX[1].shortDescription} - supposed to implement repository pattern`,
];

export function activate(context: vscode.ExtensionContext) {
	console.log('TD Scanner extension is now active!');

	// 1. Register the Activity Bar View
	const tdProvider = new TdViewProvider();
	vscode.window.registerTreeDataProvider('td-scanner-view', tdProvider);

	// 2. Register the Completion Item Provider (triggered by '~')
	const completionProvider = vscode.languages.registerCompletionItemProvider(
		{ scheme: 'file' }, // Applies to all local files
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				// 1. Get the text from the start of the line to the current cursor position
				const linePrefix = document.lineAt(position).text.substr(0, position.character);

				// 2. Check if the line actually ends with our specific string
				if (!linePrefix.endsWith(TRIGGER_STRING)) {
					return undefined; // Don't show suggestions if the prefix doesn't match
				}

				// Return our cached strings as autocomplete suggestions
				return TECHDEBTMATRIX.map((quadrant, index) => {
					const itemLabel = `${index} - ${quadrant.shortDescription}`
					const item = new vscode.CompletionItem(itemLabel, vscode.CompletionItemKind.Text);
					item.detail = `${quadrant.context} - ${quadrant.explanation}`;
					item.insertText = `${index} - `;
					return item;
				});
			}
		},
		':'
	);

	// 3. Command to trigger a manual scan (can be added to the UI later)
	const scanCommand = vscode.commands.registerCommand('td-scanner.runScan', async () => {
		await scanFiles();
		tdProvider.refresh(); // Refresh the activity bar view
	});

	context.subscriptions.push(completionProvider, scanCommand);

	// Run an initial scan when the extension loads
	scanFiles().then(() => tdProvider.refresh());
}

// Function to read td-watcher.txt and scan files
// Function to scan files, automatically respecting .gitignore
async function scanFiles() {
	// cachedSuggestions = [];
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) return;

	const workspaceRoot = workspaceFolders[0].uri;
	const watcherFileUri = vscode.Uri.joinPath(workspaceRoot, 'td-watcher.txt');

	// 1. Load the allow-list regex patterns from td-watcher.txt
	let allowPatterns: RegExp[] = [];
	try {
		const fileData = await vscode.workspace.fs.readFile(watcherFileUri);
		allowPatterns = fileData.toString()
			.split('\n')
			.map(line => line.trim())
			.filter(line => line.length > 0)
			.map(line => new RegExp(line));
	} catch (error) {
		console.error(error);
		vscode.window.showErrorMessage('Missing or invalid td-watcher.txt');
		return;
	}

	// 2. Get all files that ARE NOT in .gitignore
	// By passing 'undefined' as the second argument, we keep default exclusions active.
	const allFiles = await vscode.workspace.findFiles('**/*.*', undefined);

	for (const file of allFiles) {
		// 3. Only process files that match one of your td-watcher.txt regex patterns
		const isAllowed = allowPatterns.some(regex => regex.test(file.fsPath));

		if (!isAllowed) continue;

		try {
			const fileContent = await vscode.workspace.fs.readFile(file);
			const text = fileContent.toString();

			// Match your specific strings (e.g., words starting with TD_)
			const targetStringRegex = /TD_[A-Za-z0-9_]+/g;
			let match;

			while ((match = targetStringRegex.exec(text)) !== null) {
				if (!cachedSuggestions.includes(match[0])) {
					cachedSuggestions.push(match[0]);
				}
			}
		} catch (err) {
			console.error(`Failed to read ${file.fsPath}`, err);
		}
	}

	vscode.window.showInformationMessage(`Technical debt scan complete. Found ${cachedSuggestions.length} instance markers.`);
}

// Provider to show data in the Activity Bar Tree View
class TdViewProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
		if (!element) {
			// Root level: show all cached suggestions
			return Promise.resolve(
				cachedSuggestions.map(suggestion => {
					return new vscode.TreeItem(suggestion, vscode.TreeItemCollapsibleState.None);
				})
			);
		}
		return Promise.resolve([]);
	}
}

export function deactivate() { }