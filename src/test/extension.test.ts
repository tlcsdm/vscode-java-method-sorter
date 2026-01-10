import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('unknowIfGuestInDream.tlcsdm-java-method-sorter'));
    });

    test('Commands should be registered', async () => {
        const extension = vscode.extensions.getExtension('unknowIfGuestInDream.tlcsdm-java-method-sorter');
        await extension?.activate();

        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('tlcsdm.methodsorter.sortMethods'));
        assert.ok(commands.includes('tlcsdm.methodsorter.shuffleMethodsRandomly'));
    });

    test('Configuration should have default values', () => {
        const config = vscode.workspace.getConfiguration('tlcsdm.methodsorter');
        
        const sortingStrategy = config.get<string>('sortingStrategy');
        assert.strictEqual(sortingStrategy, 'depth-first');

        const applyWorkingListHeuristics = config.get<boolean>('applyWorkingListHeuristics');
        assert.strictEqual(applyWorkingListHeuristics, true);

        const respectBeforeAfterRelation = config.get<boolean>('respectBeforeAfterRelation');
        assert.strictEqual(respectBeforeAfterRelation, true);

        const clusterOverloadedMethods = config.get<boolean>('clusterOverloadedMethods');
        assert.strictEqual(clusterOverloadedMethods, false);

        const clusterGetterSetter = config.get<boolean>('clusterGetterSetter');
        assert.strictEqual(clusterGetterSetter, false);

        const separateByAccessLevel = config.get<boolean>('separateByAccessLevel');
        assert.strictEqual(separateByAccessLevel, true);

        const separateConstructors = config.get<boolean>('separateConstructors');
        assert.strictEqual(separateConstructors, true);

        const applyLexicalOrdering = config.get<boolean>('applyLexicalOrdering');
        assert.strictEqual(applyLexicalOrdering, true);
    });
});
