/*********************************************************************************
 * Copyright (c) 2023 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 *********************************************************************************/

import { TYPES } from '@borkdominik-biguml/big-vscode-integration/vscode';
import { ContainerModule } from 'inversify';
import { ExportToPlantUMLProvider, ExportToPlantUMLViewId } from './export-to-plantUML.provider.js';

export function ExportToPlantUMLModule(viewId: string) {
    return new ContainerModule(bind => {
        bind(ExportToPlantUMLViewId).toConstantValue(viewId);
        bind(ExportToPlantUMLProvider).toSelf().inSingletonScope();
        bind(TYPES.RootInitialization).toService(ExportToPlantUMLProvider);

        // Handle the request vscode side
        // This will prevent the glsp to handle the request
        // Remember to comment out the the glsp client handler!
        // In ExportToPlantUMLActionHandler implementation GLSP has priority over vscode

        // bind(ExportToPlantUMLActionHandler).toSelf().inSingletonScope();
        // bind(TYPES.Disposable).toService(ExportToPlantUMLActionHandler);
        // bind(TYPES.RootInitialization).toService(ExportToPlantUMLActionHandler);
    });
}
