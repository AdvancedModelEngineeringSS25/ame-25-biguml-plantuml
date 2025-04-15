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
import { ExportToPlantUMLActionHandler } from './export-to-plantUML.handler.js';
import { ExportToPlantUMLProvider, ExportToPlantUMLViewId } from './export-to-plantUML.provider.js';

export function ExportToPlantUMLModule(viewId: string): ContainerModule {
    return new ContainerModule(bind => {
        bind(ExportToPlantUMLViewId).toConstantValue(viewId);
        bind(ExportToPlantUMLProvider).toSelf().inSingletonScope();
        bind(TYPES.RootInitialization).toService(ExportToPlantUMLProvider);

        bind(ExportToPlantUMLActionHandler).toSelf().inSingletonScope();
        bind(TYPES.Disposable).toService(ExportToPlantUMLActionHandler);
        bind(TYPES.RootInitialization).toService(ExportToPlantUMLActionHandler);
    });
}
