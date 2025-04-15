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
import * as fs from 'fs';
import { inject, injectable, postConstruct } from 'inversify';
import * as path from 'path';
import * as vscode from 'vscode';
import { ExportToPlantUMLActionResponse, RequestExportToPlantUMLAction } from '../common/export-to-plantUML.action.js';
import { PlantUMLParserFactory } from '../common/plantuml-parser.js';

@injectable()
export class ExportToPlantUMLActionHandler implements Disposable {
    @inject(TYPES.ActionDispatcher)
    protected readonly actionDispatcher: ActionDispatcher;

    @inject(TYPES.ActionListener)
    protected readonly actionListener: ActionListener;

    @inject(EXPERIMENTAL_TYPES.GLSPServerModelState)
    protected readonly modelState: ExperimentalGLSPServerModelState;

    private readonly toDispose = new DisposableCollection();
    private readonly logFile = 'plantuml-export.log';

    // Function for logging errors
    private async logError(error: string): Promise<void> {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ERROR: ${error}\n`;
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                const logPath = path.join(workspaceFolder.uri.fsPath, this.logFile);
                await fs.promises.appendFile(logPath, logEntry, 'utf8');
                console.error(error);
            }
        } catch (err) {
            console.error('Failed to write to log file:', err);
            vscode.window.showErrorMessage(`Export error: ${error}`);
        }
    }

    // Function for logging info messages
    private async logInfo(message: string): Promise<void> {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] INFO: ${message}\n`;
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                const logPath = path.join(workspaceFolder.uri.fsPath, this.logFile);
                await fs.promises.appendFile(logPath, logEntry, 'utf8');
                console.log(message);
            }
        } catch (err) {
            console.error('Failed to write to log file:', err);
        }
    }

    @postConstruct()
    protected init(): void {
        this.toDispose.push(
            this.actionListener.handleVSCodeRequest(RequestExportToPlantUMLAction.KIND, async () => {
                try {
                    await this.logInfo('Starting PlantUML export');
                    const model = this.modelState.getModelState(); // Get the current model state
                    if (!model) {
                        const error = 'No model state available';
                        await this.logError(error);
                        return ExportToPlantUMLActionResponse.create({
                            success: false,
                            message: error
                        });
                    }

                    const sourceModel = model.getSourceModel(); // Get the source model from the current model state
                    await this.logInfo('Retrieved source model successfully');

                    try {
                        if (!sourceModel.packagedElement) {
                            return ExportToPlantUMLActionResponse.create({
                                success: false,
                                message: 'No package elements found in the model'
                            });
                        }

                        // Detect diagram type from the model
                        const diagramType = sourceModel.packagedElement[0].eClass.split('#//')[1];
                        await this.logInfo(`Detected diagram type: ${diagramType}`);

                        const parser = PlantUMLParserFactory.getParser(diagramType);
                        const plantUmlContent = parser.parse(sourceModel);

                        // Save the PlantUML content to a file
                        await this.saveModelToFile(plantUmlContent);

                        const successMessage = 'Model exported successfully';

                        return ExportToPlantUMLActionResponse.create({
                            success: true,
                            message: successMessage
                        });
                    } catch (error) {
                        const errorMessage = `Failed to save model: ${error instanceof Error ? error.message : String(error)}`;
                        await this.logError(errorMessage);
                        return ExportToPlantUMLActionResponse.create({
                            success: false,
                            message: errorMessage
                        });
                    }
                } catch (error) {
                    const errorMessage = `Unexpected error during export: ${error instanceof Error ? error.message : String(error)}`;
                    await this.logError(errorMessage);
                    return ExportToPlantUMLActionResponse.create({
                        success: false,
                        message: errorMessage
                    });
                }
            })
        );
    }

    /**
     * Opens a save dialog and writes the PlantUML content to a file
     */
    private async saveModelToFile(content: string): Promise<void> {
        try {
            // Open save dialog
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.parse('untitled.puml'),
                filters: {
                    'PlantUML files': ['puml', 'plantuml'],
                    'All files': ['*']
                }
            });

            if (uri) {
                // Write to the file
                await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
                await this.logInfo(`Model exported to ${uri.fsPath}`);
                vscode.window.showInformationMessage(`Model exported to ${uri.fsPath}`);
            } else {
                // User cancelled the save dialog
                await this.logInfo('User cancelled the save dialog');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this.logError(`Error saving model: ${errorMessage}`);
            vscode.window.showErrorMessage(`Failed to save model: ${errorMessage}`);
            throw error;
        }
    }

    dispose(): void {
        this.toDispose.dispose();
    }
}
