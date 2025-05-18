/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

import { ClassDiagramParser } from './parser/class-parser.js';
import { ComponentDiagramParser } from './parser/component-parser.js';
import { UseCaseDiagramParser } from './parser/use-case-parser.js';

/**
 * Factory for creating diagram parsers based on diagram type
 */
export class PlantUMLParser {
    static parse(diagramType: string, model: any[]): any[] {
        switch (diagramType.toLowerCase()) {
            case 'component': {
                const componentparser = new ComponentDiagramParser();
                return componentparser.parse(model);
            }
            case 'use case': {
                const ucparser = new UseCaseDiagramParser();
                return ucparser.parse(model);
            }
            case 'class': {
                const classparser = new ClassDiagramParser();
                return classparser.parse(model);
            }
            default:
                throw new Error(`Unsupported diagram type: ${diagramType}`);
        }
    }
}
