/*********************************************************************************
 * Copyright (c) 2023 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 *********************************************************************************/

import { Action, RequestAction, type ResponseAction } from '@eclipse-glsp/protocol';

// ========= This action will be handled by the GLSP Client =========

export interface RequestExportToPlantUMLAction extends RequestAction<ExportToPlantUMLActionResponse> {
    kind: typeof RequestExportToPlantUMLAction.KIND;
}

export namespace RequestExportToPlantUMLAction {
    export const KIND = 'requestExportToPlantUML';

    export function is(object: unknown): object is RequestExportToPlantUMLAction {
        return RequestAction.hasKind(object, KIND);
    }

    export function create(options: Omit<RequestExportToPlantUMLAction, 'kind' | 'requestId'>): RequestExportToPlantUMLAction {
        return {
            kind: KIND,
            requestId: '',
            ...options
        };
    }
}

export interface ExportToPlantUMLActionResponse extends ResponseAction {
    kind: typeof ExportToPlantUMLActionResponse.KIND;
}
export namespace ExportToPlantUMLActionResponse {
    export const KIND = 'ExportToPlantUMLResponse';

    export function is(object: unknown): object is ExportToPlantUMLActionResponse {
        return Action.hasKind(object, KIND);
    }

    export function create(
        options?: Omit<ExportToPlantUMLActionResponse, 'kind' | 'responseId'> & { responseId?: string }
    ): ExportToPlantUMLActionResponse {
        return {
            kind: KIND,
            responseId: '',
            ...options
        };
    }
}
