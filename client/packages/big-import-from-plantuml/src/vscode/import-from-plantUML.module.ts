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
import { ImportFromPlantUMLActionHandler } from './import-from-plantUML.handler.js';
import { ImportFromPlantUMLProvider, ImportFromPlantUMLViewId } from './import-from-plantUML.provider.js';

export function ImportFromPlantUMLModule(viewId: string): ContainerModule {
    return new ContainerModule(bind => {
        bind(ImportFromPlantUMLViewId).toConstantValue(viewId);
        bind(ImportFromPlantUMLProvider).toSelf().inSingletonScope();
        bind(TYPES.RootInitialization).toService(ImportFromPlantUMLProvider);

        bind(ImportFromPlantUMLActionHandler).toSelf().inSingletonScope();
        bind(TYPES.Disposable).toService(ImportFromPlantUMLActionHandler);
        bind(TYPES.RootInitialization).toService(ImportFromPlantUMLActionHandler);
    });
}
