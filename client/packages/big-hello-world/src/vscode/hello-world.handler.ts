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
import { HelloWorldActionResponse, RequestHelloWorldAction } from '../common/hello-world.action.js';

// Handle the action within the server and not the glsp client / server
@injectable()
export class HelloWorldActionHandler implements Disposable {
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
            this.actionListener.handleVSCodeRequest<RequestHelloWorldAction>(RequestHelloWorldAction.KIND, async message => {
                this.count += message.action.increase;
                console.log(`Hello World from VS Code new: ${this.count}`);

                // Print the current model state
                const model = this.modelState.getModelState();
                if (model) {
                    const sourceModel = model.getSourceModel();
                    console.log('Current model state:', sourceModel);

                    // Print the diagram elements in formatted JSON
                    if (sourceModel.packagedElement && sourceModel.packagedElement.length > 0) {
                        console.log('Diagram elements:');
                        console.log(JSON.stringify(sourceModel.packagedElement, null, 2));

                        // Print summary of elements by type
                        const elementTypes = sourceModel.packagedElement.reduce((acc: Record<string, number>, element: any) => {
                            const type = element.eClass?.split('#//').pop() || 'unknown';
                            acc[type] = (acc[type] || 0) + 1;
                            return acc;
                        }, {});
                        console.log('Element types summary:', elementTypes);
                    } else {
                        console.log('No diagram elements found');
                    }
                } else {
                    console.log('No model state available');
                }

                return HelloWorldActionResponse.create({
                    count: this.count
                });
            })
        );
    }

    dispose(): void {
        this.toDispose.dispose();
    }
}
