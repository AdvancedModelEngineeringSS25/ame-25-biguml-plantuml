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
import { CreateEdgeOperation, CreateNodeOperation, DisposableCollection } from '@eclipse-glsp/protocol';
import * as fs from 'fs';
import { inject, injectable, postConstruct } from 'inversify';
import * as path from 'path';
import * as vscode from 'vscode';
import { ImportFromPlantUMLActionResponse, RequestImportFromPlantUMLAction } from '../common/import-from-plantUML.action.js';
//import { PlantUMLParserFactory } from '../common/plantuml-parser.js';
import {
    BatchCreateOperation,
    UpdateElementPropertyAction,
    type BatchOperation,
    type TempCreationId
} from '@borkdominik-biguml/uml-protocol';
import { formatters, parse, type Member, type MemberVariable, type Method, type UML } from 'plantuml-parser';
import { v4 } from 'uuid';
import type { PlantUmlElement } from '../common/import-parser/class-parser.js';
import { PlantUMLParser } from '../common/plantuml-import-parser.js';

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
                        const plantUmlContent = await this.parsePlantUML(fileUri);
                        // await this.logInfo(plantUmlContent)
                        const annotatedPlantUmlContent = await PlantUMLParser.parse(selection!.description, plantUmlContent);

                        console.log(JSON.stringify(annotatedPlantUmlContent, null, 2));
                        const operations = this.importGLSP(annotatedPlantUmlContent, new Map<string, string>());
                        console.log(JSON.stringify(operations));
                        this.actionDispatcher.dispatch(BatchCreateOperation.create(operations));
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

    importGLSP(elements: PlantUmlElement[], nameIdMap: Map<string, string>, containerIdPackage?: string): BatchOperation[] {
        const operations: BatchOperation[] = [];

        function handleClass(element: PlantUmlElement, containerId?: string): BatchOperation {
            const tempId: TempCreationId = `temp_${v4()}`;

            let createOperation;

            switch (element.type) {
                case 'class':
                    createOperation = CreateNodeOperation.create('CLASS__Class', { containerId });
                    break;
                case 'abstract class':
                    createOperation = CreateNodeOperation.create('CLASS__AbstractClass', { containerId });
                    break;
                case 'enum':
                    createOperation = CreateNodeOperation.create('CLASS__Enumeration', { containerId });
                    break;
                case 'interface':
                    createOperation = CreateNodeOperation.create('CLASS__Interface', { containerId });
                    break;
                case 'usecase':
                    createOperation = CreateNodeOperation.create('CLASS__UseCase', { containerId });
                    break;
                case 'component':
                    createOperation = CreateNodeOperation.create('CLASS__UseCase', { containerId });
                    break;
                case 'package':
                    createOperation = CreateNodeOperation.create('CLASS__Package', { containerId });
                    break;
                case 'cloud':
                    createOperation = CreateNodeOperation.create('CLASS__Package', { containerId });
                    break;
                case 'database':
                    createOperation = CreateNodeOperation.create('CLASS__Package', { containerId });
                    break;
            }

            const updateActions: UpdateElementPropertyAction[] = [];
            const naming = element.title ? element.title : element.name;
            if (naming) {
                updateActions.push(
                    UpdateElementPropertyAction.create({
                        elementId: tempId,
                        propertyId: 'name',
                        value: naming
                    })
                );
            }

            return {
                tempCreationId: tempId,
                createOperation,
                updateActions
            };
        }

        function handlePropertyOperation(containerId: string, operation: Method | MemberVariable | Member, type: string): BatchOperation {
            const tempId: TempCreationId = `temp_${v4()}`;

            const createOperation = CreateNodeOperation.create(`CLASS__${type}`, { containerId });
            const updateActions: UpdateElementPropertyAction[] = [];

            if (operation.name) {
                updateActions.push(
                    UpdateElementPropertyAction.create({
                        elementId: tempId,
                        propertyId: 'name',
                        value: operation.name
                    })
                );
            }

            return {
                tempCreationId: tempId,
                createOperation,
                updateActions
            };
        }

        function handleEdge(edge: PlantUmlElement, nameIdMap: Map<string, string>): BatchOperation {
            const tempId: TempCreationId = `temp_${v4()}`;
            /*
            *   <|--   extension
                <|..   implementation
                *--    Composition
                o--    Aggregation
                <--    Dependency
                <..    Dependency (weaker)
            */
            let type = '';
            let from = '';
            let to = '';
            // check left head
            if (edge.leftArrowHead !== '') {
                switch (edge.leftArrowHead) {
                    case '<|':
                        if (edge.leftArrowBody === '-') {
                            type = 'Realization';
                        } else {
                            type = 'InterfaceRealization';
                        }
                        break;
                    case '*':
                        type = 'Composition';
                        break;
                    case 'o':
                        type = 'Aggregation';
                        break;
                    case '<':
                        type = 'Dependency';
                        break;
                }
                from = edge.right !== undefined ? edge.right : '';
                to = edge.left !== undefined ? edge.left : '';
            } else if (edge.rightArrowHead !== '') {
                switch (edge.rightArrowHead) {
                    // does not work!
                    case '|>':
                        if (edge.rightArrowBody === '-') {
                            type = 'Realization';
                        } else {
                            type = 'InterfaceRealization';
                        }
                        break;
                    // works
                    case '*':
                        type = 'Composition';
                        break;
                    // works
                    case 'o':
                        type = 'Aggregation';
                        break;
                    // works
                    case '>':
                        type = 'Dependency';
                        break;
                }
                from = edge.left !== undefined ? edge.left : '';
                to = edge.right !== undefined ? edge.right : '';
            } else {
                // works
                type = 'Association';
                from = edge.left !== undefined ? edge.left : '';
                to = edge.right !== undefined ? edge.right : '';
            }
            const createOperation = CreateEdgeOperation.create({
                elementTypeId: `CLASS__${type}`,
                sourceElementId: `${nameIdMap.get(from)}`,
                targetElementId: `${nameIdMap.get(to)}`
            });

            const updateActions: UpdateElementPropertyAction[] = [];

            if (edge.label) {
                updateActions.push(
                    UpdateElementPropertyAction.create({
                        elementId: tempId,
                        propertyId: 'name',
                        value: edge.label
                    })
                );
            }

            return {
                tempCreationId: tempId,
                createOperation,
                updateActions
            };
        }

        for (const element of elements) {
            console.log(element);
            // edge creation needs to know ids that are generated on the fly!
            let operation: BatchOperation | undefined = undefined;
            if (
                element.type === 'class' ||
                element.type === 'abstract class' ||
                element.type === 'enum' ||
                element.type === 'interface' ||
                element.type === 'usecase' ||
                element.type === 'component' ||
                element.type === 'package' ||
                element.type === 'cloud' ||
                element.type === 'database'
            ) {
                if (element.name === undefined || element.name === '') {
                    element.name = `name_${v4()}`;
                }
                operation = handleClass(element, containerIdPackage);
                if (operation.tempCreationId !== undefined) {
                    nameIdMap.set(element.name, operation.tempCreationId);
                }
            } else if ('left' in element) {
                operation = handleEdge(element, nameIdMap);
            } else if (element.type === 'note') {
                // currently not in bigUML
                continue;
            } else if (element.type === 'actor') {
                continue;
            } else if (element.type === '') {
                continue;
            }

            if (!operation) {
                continue;
            }
            console.log('OPERATION: ' + JSON.stringify(operation));
            operations.push(operation);

            if (element.type === 'package' || element.type === 'cloud' || element.type === 'database') {
                const ops = this.importGLSP(element.elements, nameIdMap, operation.tempCreationId);
                for (const op of ops) {
                    if (!op) {
                        continue;
                    }
                    operations.push(op);
                }
            }

            if (!operation.tempCreationId) {
                continue;
            }
            console.log(element);
            if (!element.members) {
                continue;
            }
            for (const member of element.members as Member[]) {
                if ('returnType' in member) {
                    operations.push(handlePropertyOperation(operation.tempCreationId, member, 'Operation'));
                } else if (element.type === 'enum') {
                    operations.push(handlePropertyOperation(operation.tempCreationId, member, 'EnumerationLiteral'));
                } else {
                    operations.push(handlePropertyOperation(operation.tempCreationId, member, 'Property'));
                }
            }
        }
        return operations;
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
        try {
            const data = await this.readFileContents(inputFile);
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
