import * as vscode from 'vscode';
import { JavaMethodSorter } from './sorter/javaMethodSorter';
import { SortingOptions } from './sorter/types';

// Extension ID for Red Hat Java Language Support
const REDHAT_JAVA_EXTENSION_ID = 'redhat.java';

/**
 * Get sorting options from VS Code configuration
 */
function getSortingOptions(): SortingOptions {
    const config = vscode.workspace.getConfiguration('tlcsdm.methodsorter');
    return {
        sortingStrategy: config.get<string>('sortingStrategy', 'depth-first'),
        applyWorkingListHeuristics: config.get<boolean>('applyWorkingListHeuristics', true),
        respectBeforeAfterRelation: config.get<boolean>('respectBeforeAfterRelation', true),
        clusterOverloadedMethods: config.get<boolean>('clusterOverloadedMethods', false),
        clusterGetterSetter: config.get<boolean>('clusterGetterSetter', false),
        separateByAccessLevel: config.get<boolean>('separateByAccessLevel', true),
        separateConstructors: config.get<boolean>('separateConstructors', true),
        applyLexicalOrdering: config.get<boolean>('applyLexicalOrdering', true)
    };
}

/**
 * Check if the Red Hat Java extension is installed and active
 */
function isRedHatJavaExtensionAvailable(): boolean {
    const extension = vscode.extensions.getExtension(REDHAT_JAVA_EXTENSION_ID);
    return extension !== undefined;
}

/**
 * Format the document using Red Hat Java extension if available
 */
async function formatDocumentWithRedHatJava(): Promise<void> {
    if (!isRedHatJavaExtensionAvailable()) {
        return;
    }

    try {
        // Execute the format document command
        await vscode.commands.executeCommand('editor.action.formatDocument');
    } catch {
        // Silently ignore formatting errors - the sorting is complete
        console.log('Failed to format document with Red Hat Java extension');
    }
}

/**
 * Sort methods in the active Java editor
 */
async function sortMethods(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active text editor');
        return;
    }

    if (editor.document.languageId !== 'java') {
        vscode.window.showWarningMessage('This command only works with Java files');
        return;
    }

    const document = editor.document;
    const text = document.getText();

    try {
        const options = getSortingOptions();
        const sorter = new JavaMethodSorter(options);
        const sortedText = sorter.sort(text);

        if (sortedText === text) {
            vscode.window.showInformationMessage('Methods are already sorted');
            return;
        }

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );
        edit.replace(document.uri, fullRange, sortedText);
        await vscode.workspace.applyEdit(edit);

        // Format document with Red Hat Java extension if available
        await formatDocumentWithRedHatJava();

        vscode.window.showInformationMessage('Methods sorted successfully');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sort methods';
        vscode.window.showErrorMessage(message);
    }
}

/**
 * Shuffle methods randomly in the active Java editor
 */
async function shuffleMethodsRandomly(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active text editor');
        return;
    }

    if (editor.document.languageId !== 'java') {
        vscode.window.showWarningMessage('This command only works with Java files');
        return;
    }

    const document = editor.document;
    const text = document.getText();

    try {
        const sorter = new JavaMethodSorter(getSortingOptions());
        const shuffledText = sorter.shuffleRandomly(text);

        if (shuffledText === text) {
            vscode.window.showInformationMessage('No methods to shuffle');
            return;
        }

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );
        edit.replace(document.uri, fullRange, shuffledText);
        await vscode.workspace.applyEdit(edit);

        // Format document with Red Hat Java extension if available
        await formatDocumentWithRedHatJava();

        vscode.window.showInformationMessage('Methods shuffled randomly');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to shuffle methods';
        vscode.window.showErrorMessage(message);
    }
}

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext): void {
    // Register commands
    const sortMethodsCmd = vscode.commands.registerCommand(
        'tlcsdm.methodsorter.sortMethods',
        sortMethods
    );

    const shuffleMethodsCmd = vscode.commands.registerCommand(
        'tlcsdm.methodsorter.shuffleMethodsRandomly',
        shuffleMethodsRandomly
    );

    context.subscriptions.push(sortMethodsCmd, shuffleMethodsCmd);

    console.log('Java Method Sorter extension is now active');
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
    // Clean up resources if needed
}
