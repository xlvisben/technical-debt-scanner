import * as vscode from 'vscode';
import { TECHDEBTMATRIX, TRIGGER_STRING } from './constants';
import { FoundMatch } from './types';

// A simple global cache to store our found strings so the autocomplete is fast
let groupedResults: Map<string, FoundMatch[]> = new Map();

export async function activate(context: vscode.ExtensionContext) {
	const tdProvider = new TdViewProvider();
	vscode.window.registerTreeDataProvider('td-scanner-view', tdProvider);

	const completionProvider = vscode.languages.registerCompletionItemProvider(
		{ scheme: 'file' },
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				const linePrefix = document.lineAt(position).text.substring(0, position.character);

				if (!linePrefix.endsWith(TRIGGER_STRING)) {
					return undefined; // Don't show suggestions if the prefix doesn't match
				}

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
		tdProvider.refresh();
	});

	context.subscriptions.push(completionProvider, scanCommand);

	await scanFiles();

	tdProvider.refresh()
}

async function scanFiles() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) return;

	const workspaceRoot = workspaceFolders[0].uri;
	const watcherFileUri = vscode.Uri.joinPath(workspaceRoot, 'td-watcher.txt');

	let allowPatterns: RegExp[] = [];
	try {
		const fileData = await vscode.workspace.fs.readFile(watcherFileUri);

		const regexLines = fileData.toString().split('\n');

		allowPatterns = regexLines
			.map(line => line.trim())
			.filter(line => line.length > 0)
			.map(line => new RegExp(line));
	} catch (error) {
		vscode.window.showErrorMessage('Missing or invalid td-watcher.txt');
		return;
	}

	const allFiles = await vscode.workspace.findFiles('**/*.*', undefined);

	for (const file of allFiles) {
		const isAllowed = allowPatterns.some(regex => regex.test(file.path));

		if (!isAllowed) continue;

		try {
			const fileContent = await vscode.workspace.fs.readFile(file);

			const text = fileContent.toString();

			const lines = text.split('\n');

			const fileMatches: FoundMatch[] = [];

			const targetStringRegex = /TD:[0-9]\s-\s.+/g;

			lines.forEach((lineText, lineIndex) => {

				let match;

				while ((match = targetStringRegex.exec(lineText)) !== null) {
					const quadrant = parseInt(match[0].charAt(3));

					fileMatches.push({
						debtQuadrant: quadrant,
						label: match[0],
						uri: file,
						line: lineIndex,
						column: match.index,
					});
				}

			});

			if (fileMatches.length > 0) {
				groupedResults.set(file.fsPath, fileMatches);
			}
		} catch (err) {
			vscode.window.showErrorMessage(`Failed to read ${file.fsPath}`);
		}
	}
	vscode.window.showInformationMessage(`Technical debt scan complete. Found ${groupedResults.size} file with technical debt markers.`);
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

	async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {

		if (!element) {
			if (groupedResults.size > 0) {
				return Array.from(groupedResults.keys()).map(filePath => {
					const item = new vscode.TreeItem(
						vscode.Uri.file(filePath).path.split('/').pop() || filePath,
						vscode.TreeItemCollapsibleState.Collapsed
					);
					item.resourceUri = vscode.Uri.file(filePath); // Shows file icon
					item.contextValue = 'file';
					return item;
				});
			} else {
				return [
					new vscode.TreeItem('No debt marker, yay :)', vscode.TreeItemCollapsibleState.None)
				];
			}
		}

		const matches = groupedResults.get(element.resourceUri?.fsPath || '');

		if (matches) {
			return matches.map(match => {
				const treeItem = new vscode.TreeItem(match.label, vscode.TreeItemCollapsibleState.None);
				if (TECHDEBTMATRIX[match.debtQuadrant] == undefined || match.debtQuadrant === null) {
					treeItem.description = 'Invalid quadrant value';
				} else {
					treeItem.description = TECHDEBTMATRIX[match.debtQuadrant].context;
				}

				const endPosition = new vscode.Position(match.line, match.column + match.label.length);
				const range = new vscode.Range(endPosition, endPosition);

				// Navigation Command
				treeItem.command = {
					command: 'vscode.open',
					title: "Go to match",
					arguments: [
						match.uri,
						{
							selection: range,
							preserveFocus: false
						}
					]
				};
				return treeItem;
			});
		}
		return [
			new vscode.TreeItem('No debt marker, yay :)', vscode.TreeItemCollapsibleState.None)
		];
	}
}

export function deactivate() { }