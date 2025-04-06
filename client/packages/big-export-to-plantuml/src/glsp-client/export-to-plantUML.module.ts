/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/
import { configureActionHandler, FeatureModule } from '@eclipse-glsp/client';
import { ExtensionActionKind } from '@eclipse-glsp/vscode-integration-webview/lib/features/default/extension-action-handler.js';
import { ExportToPlantUMLActionResponse, RequestExportToPlantUMLAction } from '../common/export-to-plantUML.action.js';
import { ExportToPlantUMLHandler } from './export-to-plantUML.handler.js';

export const ExportToPlantUMLModule = new FeatureModule((bind, unbind, isBound, rebind) => {
    const context = { bind, unbind, isBound, rebind };
    // Register the ExportToPlantUMLHandler to handle the RequestExportToPlantUMLAction
    bind(ExportToPlantUMLHandler).toSelf().inSingletonScope();
    configureActionHandler(context, RequestExportToPlantUMLAction.KIND, ExportToPlantUMLHandler);

    // Allow the ExportToPlantUMLActionResponse to propagate to the server
    bind(ExtensionActionKind).toConstantValue(ExportToPlantUMLActionResponse.KIND);
});
