/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

import {
    EXPERIMENTAL_TYPES,
    TYPES,
    type ActionDispatcher,
    type ActionListener,
    type Disposable,
    type ExperimentalGLSPServerModelState
} from '@borkdominik-biguml/big-vscode-integration/vscode';
import { DisposableCollection } from '@eclipse-glsp/protocol';
import { inject, injectable, postConstruct } from 'inversify';
import * as vscode from 'vscode';
import { ExportToPlantUMLActionResponse, RequestExportToPlantUMLAction } from '../common/export-to-plantUML.action.js';

// Handle the action within the server and not the glsp client / server
@injectable()
export class ExportToPlantUMLActionHandler implements Disposable {
    @inject(TYPES.ActionDispatcher)
    protected readonly actionDispatcher: ActionDispatcher;
    @inject(TYPES.ActionListener)
    protected readonly actionListener: ActionListener;
    @inject(EXPERIMENTAL_TYPES.GLSPServerModelState)
    protected readonly modelState: ExperimentalGLSPServerModelState;

    private readonly toDispose = new DisposableCollection();
    private count = 0;

    @postConstruct()
    protected init(): void {
        this.toDispose.push(
            this.actionListener.handleVSCodeRequest<RequestExportToPlantUMLAction>(RequestExportToPlantUMLAction.KIND, async message => {
                this.count += message.action.increase;
                console.log(`Hello World from VS Code new: ${this.count}`);

                const model = this.modelState.getModelState();
                if (model) {
                    const sourceModel = model.getSourceModel();
                    console.log('Current model state:', sourceModel);
                    this.saveModelStateToFile(sourceModel);
                } else {
                    console.log('No model state available');
                }
                return ExportToPlantUMLActionResponse.create({
                    count: this.count
                });
            })
        );
    }

    /**
     * Opens a save dialog and writes the model state to a file
     * @param modelState The model state to save
     */
    private async saveModelStateToFile(modelState: any): Promise<void> {
        try {
            // Format model state as pretty-printed JSON
            const content = JSON.stringify(modelState, null, 2);

            // Open save dialog
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.parse('file:///model-state.txt'),
                filters: {
                    'Text files': ['txt'],
                    'JSON files': ['json'],
                    'All files': ['*']
                }
            });

            if (uri) {
                // Write to the file
                await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
                vscode.window.showInformationMessage(`Model state saved to ${uri.fsPath}`);
            }
        } catch (error) {
            console.error('Error saving model state:', error);
            vscode.window.showErrorMessage(`Failed to save model state: ${error}`);
        }
    }

    dispose(): void {
        this.toDispose.dispose();
    }
}
