/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

import { ActivityDiagramParser } from './parser/activity-parser.js';
import { ClassDiagramParser } from './parser/class-parser.js';
import { DeploymentDiagramParser } from './parser/deployment-parser.js';
import { StateMachineDiagramParser } from './parser/state-machine-parser.js';

/**
 * Base interface for different diagram parsers
 */
export interface DiagramParser {
    parse(model: any): string;
}

/**
 * Factory for creating diagram parsers based on diagram type
 */
export class PlantUMLParserFactory {
    static getParser(diagramType: string): DiagramParser {
        switch (diagramType.toLowerCase()) {
            case 'class':
                return new ClassDiagramParser();
            case 'activity':
                return new ActivityDiagramParser();
            case 'state_machine':
                return new StateMachineDiagramParser();
            case 'deployment':
                return new DeploymentDiagramParser();
            default:
                throw new Error(`Unsupported diagram type: ${diagramType}`);
        }
    }
}
