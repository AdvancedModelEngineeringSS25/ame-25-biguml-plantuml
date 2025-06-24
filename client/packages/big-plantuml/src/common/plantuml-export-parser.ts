/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

import { ActivityDiagramParser } from './export-parser/activity-parser.js';
import { type BaseDiagramParser } from './export-parser/base-parser.js';
import { ClassDiagramParser } from './export-parser/class-parser.js';
import { DeploymentDiagramParser } from './export-parser/deployment-parser.js';
import { StateMachineDiagramParser } from './export-parser/state-machine-parser.js';
import { UseCaseDiagramParser } from './export-parser/use-case-parser.js';

/**
 * Factory for creating diagram parsers based on diagram type
 */
export class PlantUMLParserFactory {
    static getParser(diagramType: string): BaseDiagramParser {
        switch (diagramType.toLowerCase()) {
            case 'deployment':
                return new DeploymentDiagramParser();
            case 'state_machine':
                return new StateMachineDiagramParser();
            case 'class':
                return new ClassDiagramParser();
            case 'use_case':
                return new UseCaseDiagramParser();
            case 'activity':
                return new ActivityDiagramParser();
            default:
                throw new Error(`Unsupported diagram type: ${diagramType}`);
        }
    }
}
