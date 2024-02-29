import * as vscode from 'vscode';
import * as fs from 'fs';
import OpenAI from 'openai';

const prompt = 'Fix the vulnerabilities in this code and return only the fixed code as output without any description: ';

let apiKey: string | undefined;
async function ensureApiKey(): Promise<string> {
	if(!apiKey) {
		apiKey = await vscode.window.showInputBox({
			prompt: 'Enter your OpenAI API Key: ',
			placeHolder: 'Enter your API Key here'
		});

		if(!apiKey) {
			throw new Error('API Key is required');
		}
	}
	return apiKey;
}

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('codesecgpt.useCodeSecGPT', async () => {
		const editor = vscode.window.activeTextEditor;
		if(!editor) {
			return;
		}

		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);
		const finalPrompt = prompt + selectedText;

		const logFilePath = `${context.extensionPath}/extension.log`;
		const appendLog = (logMessage: string) => {
			fs.appendFileSync(logFilePath, `${new Date().toISOString()} - ${logMessage}\n`);
		};
		appendLog(`Selected text: ${selectedText}`);
		try {
			const apiKey = await ensureApiKey();

			const ConnectingMessage = "Connecting to CodeSecGPT........";
			vscode.window.showInformationMessage(ConnectingMessage);

			const openai = new OpenAI({apiKey});
			const chatCompletion = await openai.chat.completions.create({
				model: "gpt-3.5-turbo",
				messages: [{"role": "user", "content": `${finalPrompt}`}],
			});
			const response = chatCompletion.choices[0].message.content;
			let formattedContent = `${response}`;

			const message = "Connection with CodeSecGPT Successful";
			vscode.window.showInformationMessage(message);
			const displayText = "Do you want to replace '" + selectedText + "' with '" + formattedContent + "' ?";
			const replaceLineButton: vscode.QuickPickItem = { label: 'Replace Line' };
			const cancelButton: vscode.QuickPickItem = { label: 'Cancel' };
			const answer = await vscode.window.showQuickPick([replaceLineButton, cancelButton], {
				title: `${displayText}`,
			});
			if (answer === replaceLineButton) {
				editor.edit((editBuilder) => {
					editBuilder.replace(selection, formattedContent);
					vscode.window.showInformationMessage('Code replaced successfully');

					appendLog(`Generated content: ${formattedContent}`);

				}).then(() => {
					editor.selection = new vscode.Selection(selection.start.with(selection.start.line + 1, 0), selection.start.with(selection.start.line + 1, 0));
				});
			}
		} catch (error: unknown) {
			await vscode.window.showErrorMessage('Error fetching OpenAI response: ' + error);

			appendLog(`Error: ${error}`);
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
