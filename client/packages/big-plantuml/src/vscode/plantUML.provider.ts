/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

import { BIGReactWebview } from '@borkdominik-biguml/big-vscode-integration/vscode';
import { inject, injectable, postConstruct } from 'inversify';
import { ExportToPlantUMLActionResponse } from '../common/export-to-plantUML.action.js';
import { ImportFromPlantUMLActionResponse } from '../common/import-from-plantUML.action.js';

export const ExportToPlantUMLViewId = Symbol('ExportToPlantUMLViewId');
export const ImportFromPlantUMLViewId = Symbol('ImportToPlantUMLViewId');

@injectable()
export class ImportFromPlantUMLProvider extends BIGReactWebview {
    @inject(ImportFromPlantUMLViewId)
    viewId: string;

    protected cssPath = ['plantuml', 'bundle.css'];
    protected jsPath = ['plantuml', 'bundle.js'];
    protected readonly actionCache = this.actionListener.createCache([ImportFromPlantUMLActionResponse.KIND]);

    @postConstruct()
    protected override init(): void {
        super.init();

        this.toDispose.push(this.actionCache);
    }
    protected override handleConnection(): void {
        super.handleConnection();
    }
}

@injectable()
export class ExportToPlantUMLProvider extends BIGReactWebview {
    @inject(ExportToPlantUMLViewId)
    viewId: string;

    protected cssPath = ['plantuml', 'bundle.css'];
    protected jsPath = ['plantuml', 'bundle.js'];
    protected readonly actionCache = this.actionListener.createCache([ExportToPlantUMLActionResponse.KIND]);

    @postConstruct()
    protected override init(): void {
        super.init();

        this.toDispose.push(this.actionCache);
    }
    protected override handleConnection(): void {
        super.handleConnection();
    }
}
