/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

import { type DiagramParser } from '../plantuml-parser.js';

/**
 * Parses Eclipse UML State Machine Diagrams to PlantUML format
 */
export class StateMachineDiagramParser implements DiagramParser {
    private stateMap: Map<string, any> = new Map();
    private idToVariableName: Map<string, string> = new Map();

    parse(model: any): string {
        this.stateMap = new Map();
        this.idToVariableName = new Map();

        // Build a map of all states by ID for easy lookup
        this.buildStateMap(model);

        const plantUml: string[] = ['@startuml'];

        // Find and parse state machines
        const stateMachines = model.packagedElement?.filter((element: any) => element.eClass.includes('StateMachine'));

        if (stateMachines && stateMachines.length > 0) {
            stateMachines.forEach((stateMachine: any) => {
                const content = this.parseStateMachine(stateMachine);
                if (content) {
                    plantUml.push(content);
                }
            });
        }

        plantUml.push('@enduml');
        return plantUml.join('\n');
    }

    private buildStateMap(model: any): void {
        model.packagedElement?.forEach((element: any) => {
            if (element.eClass.includes('StateMachine')) {
                element.region?.forEach((region: any) => {
                    this.mapRegionStates(region);
                });
            }
        });
    }

    private mapRegionStates(region: any): void {
        region.subvertex?.forEach((state: any) => {
            if (state.id) {
                this.stateMap.set(state.id, state);

                // Create a valid variable name for this state
                const varName = this.generateStateVariableName(state);
                this.idToVariableName.set(state.id, varName);

                // Recursively map nested states
                if (state.region) {
                    state.region.forEach((nestedRegion: any) => {
                        this.mapRegionStates(nestedRegion);
                    });
                }
            }
        });
    }

    private generateStateVariableName(state: any): string {
        if (!state) return 'unknown';

        // For pseudostates, use the kind as part of the variable name
        if (state.eClass.includes('Pseudostate')) {
            if (state.name && state.name !== 'Pseudostate') {
                return state.name.toLowerCase().replace(/\s+/g, '_');
            }

            // If no kind is specified, it's an initial state
            const kind = state.kind || '[*]';
            return kind.toLowerCase();
        }
        // For final states
        else if (state.eClass.includes('FinalState')) {
            return 'end';
        }
        // For regular states
        else if (state.name) {
            return state.name.toLowerCase().replace(/\s+/g, '_');
        }

        // Fallback to using part of the ID
        return `state_${state.id?.substring(state.id.lastIndexOf('_') + 1) || 'unknown'}`;
    }

    private parseStateMachine(stateMachine: any): string {
        const lines: string[] = [];

        const regions = stateMachine.region || [];
        if (regions.length === 0) return '';

        // Parse all regions (usually there's just one top-level region)
        for (const region of regions) {
            this.parseStateDeclarations(region, lines);
            this.parseTransitions(region, lines);
            this.parseCompositeStates(region, lines);
        }

        return lines.join('\n');
    }

    private parseStateDeclarations(region: any, lines: string[]): void {
        const states = region.subvertex || [];

        // First declare all states with their proper stereotypes
        for (const state of states) {
            // Skip composite states for now, we'll handle them separately
            if (state.eClass.includes('State') && state.region && state.region.length > 0) {
                continue;
            }

            const stateVar = this.idToVariableName.get(state.id) || this.generateStateVariableName(state);

            if (state.eClass.includes('Pseudostate')) {
                const kind = state.kind;

                switch (kind) {
                    case 'choice':
                        lines.push(`state ${stateVar} <<choice>>`);
                        break;
                    case 'deepHistory':
                        lines.push(`state ${stateVar} <<history*>>`);
                        break;
                    case 'shallowHistory':
                        lines.push(`state ${stateVar} <<history>>`);
                        break;
                    case 'fork':
                        lines.push(`state ${stateVar} <<fork>>`);
                        break;
                    case 'join':
                        lines.push(`state ${stateVar} <<join>>`);
                        break;
                    case 'entryPoint':
                        lines.push(`state ${stateVar} <<entryPoint>>`);
                        break;
                    case 'exitPoint':
                        lines.push(`state ${stateVar} <<exitPoint>>`);
                        break;
                }
            } else if (state.eClass.includes('FinalState')) {
                lines.push(`state ${stateVar} <<end>>`);
            } else if (state.eClass.includes('State')) {
                // Simple state
                if (state.name) {
                    lines.push(`state "${state.name}" as ${stateVar}`);
                } else {
                    lines.push(`state ${stateVar}`);
                }
            }
        }
    }

    private parseTransitions(region: any, lines: string[]): void {
        const transitions = region.transition || [];

        for (const transition of transitions) {
            const sourceId = transition.source?.$ref;
            const targetId = transition.target?.$ref;

            if (!sourceId || !targetId) continue;

            const sourceVar = this.idToVariableName.get(sourceId);
            const targetVar = this.idToVariableName.get(targetId);

            if (!sourceVar || !targetVar) continue;

            const label = transition.name ? ` : ${transition.name}` : '';
            lines.push(`${sourceVar} --> ${targetVar}${label}`);
        }
    }

    private parseCompositeStates(region: any, lines: string[]): void {
        const states = region.subvertex || [];

        // Handle composite states
        for (const state of states) {
            if (state.eClass.includes('State') && state.region && state.region.length > 0) {
                const stateVar = this.idToVariableName.get(state.id) || this.generateStateVariableName(state);

                if (state.name) {
                    lines.push(`\nstate "${state.name}" as ${stateVar} {`);
                } else {
                    lines.push(`\nstate ${stateVar} {`);
                }

                // Parse nested content
                for (const nestedRegion of state.region) {
                    const nestedLines: string[] = [];
                    this.parseStateDeclarations(nestedRegion, nestedLines);
                    this.parseTransitions(nestedRegion, nestedLines);
                    this.parseCompositeStates(nestedRegion, nestedLines);

                    // Add indentation to nested lines
                    for (const line of nestedLines) {
                        lines.push(`  ${line}`);
                    }
                }

                lines.push('}');
            }
        }
    }
}
