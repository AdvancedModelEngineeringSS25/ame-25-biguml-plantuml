/*********************************************************************************
 * Copyright (c) 2023 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 *********************************************************************************/

import { Action, RequestAction, type ResponseAction } from '@eclipse-glsp/protocol';

export interface RequestImportFromPlantUMLAction extends RequestAction<ImportFromPlantUMLActionResponse> {
    kind: typeof RequestImportFromPlantUMLAction.KIND;
}

export namespace RequestImportFromPlantUMLAction {
    export const KIND = 'requestImportFromPlantUML';

    export function is(object: unknown): object is RequestImportFromPlantUMLAction {
        return RequestAction.hasKind(object, KIND);
    }

    export function create(options: Omit<RequestImportFromPlantUMLAction, 'kind' | 'requestId'>): RequestImportFromPlantUMLAction {
        return {
            kind: KIND,
            requestId: '',
            ...options
        };
    }
}

export interface ImportFromPlantUMLActionResponse extends ResponseAction {
    kind: typeof ImportFromPlantUMLActionResponse.KIND;
    success: boolean;
    message?: string;
}

export namespace ImportFromPlantUMLActionResponse {
    export const KIND = 'importFromPlantUMLResponse';

    export function is(object: unknown): object is ImportFromPlantUMLActionResponse {
        return Action.hasKind(object, KIND);
    }

    export function create(
        options?: Omit<ImportFromPlantUMLActionResponse, 'kind' | 'responseId'> & { responseId?: string }
    ): ImportFromPlantUMLActionResponse {
        return {
            kind: KIND,
            responseId: '',
            success: true,
            message: 'test',
            ...options
        };
    }
}
