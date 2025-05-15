/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

import { ComponentDiagramParser } from './parser/component-parser.js';

/**
 * Factory for creating diagram parsers based on diagram type
 */
export class PlantUMLParser {
    static parse(diagramType: string, model: any[]) {
        switch (diagramType.toLowerCase()) {
            case 'Component':
                const parser = new ComponentDiagramParser();
                parser.parse(model);
            default:
                throw new Error(`Unsupported diagram type: ${diagramType}`);
        }
    }
}
