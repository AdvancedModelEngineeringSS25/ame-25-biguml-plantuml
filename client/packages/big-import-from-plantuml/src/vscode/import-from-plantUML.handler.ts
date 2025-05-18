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
import { ImportFromPlantUMLActionResponse, RequestImportFromPlantUMLAction } from '../common/import-from-plantUML.action.js';
//import { PlantUMLParserFactory } from '../common/plantuml-parser.js';
import { parse, formatters, type UML } from 'plantuml-parser';
import { PlantUMLParser } from '../common/plantuml-parser.js';

@injectable()
export class ImportFromPlantUMLActionHandler implements Disposable {
    @inject(TYPES.ActionDispatcher)
    protected readonly actionDispatcher: ActionDispatcher;

    @inject(TYPES.ActionListener)
    protected readonly actionListener: ActionListener;

    @inject(EXPERIMENTAL_TYPES.GLSPServerModelState)
    protected readonly modelState: ExperimentalGLSPServerModelState;

    private readonly toDispose = new DisposableCollection();
    private readonly logFile = 'plantuml-import.log';

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
            vscode.window.showErrorMessage(`Import error: ${error}`);
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
            this.actionListener.handleVSCodeRequest(RequestImportFromPlantUMLAction.KIND, async () => {
                try {

                    // INITIALIZATION

                    await this.logInfo('Starting PlantUML import');

                    // ask for diagramm type
                    // currently only these 3 supported :(
                    const options = [
                        { label: 'Class Diagramm', description: 'Class' },
                        { label: 'Use Case Diagramm', description: 'Use Case' },
                        { label: 'Component Diagramm', description: 'Component' }
                    ];

                    const selection = await vscode.window.showQuickPick(options, {
                        placeHolder: 'Select an action:',
                        matchOnDescription: true
                    });


                    await this.logInfo(`Selected diagram type: ${selection!.description}`);

                    // User chooses 1 plantuml file to parse
                    const fileUris = await vscode.window.showOpenDialog({
                        canSelectMany: false,
                        openLabel: 'Select PlantUML file',
                        filters: {
                            'PlantUML Files': ['puml', 'uml'],
                            'All Files': ['*']
                        }
                    });
                
                    if (!fileUris || fileUris.length === 0) {
                        vscode.window.showWarningMessage('No file selected.');
                    }
                
                    const fileUri = fileUris![0];

                    //PARSING
                
                    try {
                        // Parse plantUML to JSON
                        const plantUmlContent = await this.parsePlantUML(fileUri)
                        // await this.logInfo(plantUmlContent)
                        const annotatedPlantUmlContent = await PlantUMLParser.parse(selection!.description, plantUmlContent)

                        console.log(JSON.stringify(annotatedPlantUmlContent, null, 2));
                        // Use JSON to init 
                        //const parser = PlantUMLParserFactory.getParser(selection.description);
                        
                        // Trigger Functions to create Elements
                        // parser.execute(plantUMLContent)

                        // Feedback about success
                        const successMessage = 'PlantUML imported successfully';

                        return ImportFromPlantUMLActionResponse.create({
                            success: true,
                            message: successMessage
                        });
                    } catch (error) {
                        const errorMessage = `${error instanceof Error ? error.message : String(error)}`;
                        await this.logError(errorMessage);
                        vscode.window.showErrorMessage(`Failed to import model: ${errorMessage}`);
                        return ImportFromPlantUMLActionResponse.create({
                            success: false,
                            message: errorMessage
                        });
                    }
                } catch (error) {
                    const errorMessage = `Unexpected error during import: ${error instanceof Error ? error.message : String(error)}`;
                    await this.logError(errorMessage);
                    vscode.window.showErrorMessage(`${errorMessage}`);
                    return ImportFromPlantUMLActionResponse.create({
                        success: false,
                        message: errorMessage
                    });
                }
            })
        );
    }

    /**
     * Opens a save dialog and writes the PlantUML content to a file
     *
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
    }*/

    /**
     * Parse Input file of plantUML to JSON
     */
    private async parsePlantUML(inputFile: vscode.Uri): Promise<UML[]> {
        try{
            const data = await this.readFileContents(inputFile)
            const result = parse(data);
            await this.logInfo(formatters.default(result));
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this.logError(`Error parsing plantuml file: ${errorMessage}`);
            vscode.window.showErrorMessage(`Failed to parse plantuml file: ${errorMessage}`);
            throw error;
        }
    }

    private async readFileContents(uri: vscode.Uri): Promise<string> {
        const fileContent = await vscode.workspace.fs.readFile(uri);
        return Buffer.from(fileContent).toString('utf8');
    }

    dispose(): void {
        this.toDispose.dispose();
    }
}