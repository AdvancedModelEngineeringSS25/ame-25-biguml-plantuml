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
 * Parses Eclipse UML Deployment Diagrams to PlantUML format
 */
export class DeploymentDiagramParser implements DiagramParser {
    private elementMap: Map<string, any> = new Map();
    private relationships: Array<{ source: string; target: string; type: string; name?: string }> = [];

    parse(model: any): string {
        // Reset state
        this.elementMap = new Map();
        this.relationships = [];

        // Build element map for reference lookups
        this.buildElementMap(model);

        // Parse elements and relationships
        this.parseElements(model);
        this.parseRelationships(model);

        // Generate PlantUML code
        const plantUml = this.generatePlantUml();

        return plantUml;
    }

    private buildElementMap(model: any): void {
        if (!model.packagedElement) {
            return;
        }

        model.packagedElement.forEach((element: any) => {
            if (element.id) {
                this.elementMap.set(element.id, element);
            }
        });
    }

    private parseElements(model: any): void {
        if (!model.packagedElement) {
            return;
        }

        model.packagedElement.forEach((element: any) => {
            // Handle nested elements if they exist
            if (element.nestedClassifier) {
                element.nestedClassifier.forEach((nestedElement: any) => {
                    if (nestedElement.id) {
                        this.elementMap.set(nestedElement.id, nestedElement);
                    }
                });
            }
        });
    }

    private parseRelationships(model: any): void {
        if (!model.packagedElement) {
            return;
        }

        model.packagedElement.forEach((element: any) => {
            // Handle communication paths
            if (element.eClass.includes('CommunicationPath')) {
                this.parseCommunicationPath(element);
            }

            // Handle dependencies
            if (element.eClass.includes('Dependency')) {
                if (element.client && element.client.length > 0 && element.supplier && element.supplier.length > 0) {
                    this.relationships.push({
                        source: element.client[0].$ref,
                        target: element.supplier[0].$ref,
                        type: 'dependency',
                        name: element.name
                    });
                }
            }

            // Handle generalizations
            if (element.generalization) {
                element.generalization.forEach((gen: any) => {
                    if (gen.general && gen.general.$ref) {
                        this.relationships.push({
                            source: element.id,
                            target: gen.general.$ref,
                            type: 'generalization'
                        });
                    }
                });
            }

            // Handle manifestations
            if (element.manifestation) {
                element.manifestation.forEach((man: any) => {
                    if (man.supplier && man.supplier[0].$ref) {
                        this.relationships.push({
                            source: element.id,
                            target: man.supplier[0].$ref,
                            type: 'manifestation',
                            name: '<<manifest>>'
                        });
                    }
                });
            }

            // Handle artifacts deployed on nodes
            if (element.deployment) {
                element.deployment.forEach((deployment: any) => {
                    if (deployment.supplier && deployment.supplier.length > 0) {
                        this.relationships.push({
                            source: deployment.supplier[0].$ref,
                            target: element.id,
                            type: 'deployment',
                            name: '<<deploy>>'
                        });
                    }
                });
            }
        });
    }

    private parseCommunicationPath(path: any): void {
        if (path.memberEnd && path.memberEnd.length >= 2) {
            const end1 = path.memberEnd[0].$ref;
            const end2 = path.memberEnd[1].$ref;

            let source: any = null;
            let target: any = null;

            for (const element of this.elementMap.values()) {
                if (element.ownedAttribute) {
                    for (const attr of element.ownedAttribute) {
                        if (attr.id === end1) {
                            source = element;
                        } else if (attr.id === end2) {
                            target = element;
                        }
                    }
                }
            }

            if (source && target) {
                this.relationships.push({
                    source: source.id,
                    target: target.id,
                    type: 'communication',
                    name: 'CommunicationPath'
                });
            }
        }
    }

    private getElementType(element: any): string {
        if (!element || !element.eClass) {
            return 'node';
        }

        const eClass = element.eClass.toLowerCase();

        if (eClass.includes('artifact')) {
            return 'artifact';
        } else if (eClass.includes('device')) {
            return 'device';
        } else if (eClass.includes('executionenvironment')) {
            return 'node'; // Using node as a default for execution environment
        } else if (eClass.includes('component')) {
            return 'component';
        } else if (eClass.includes('package')) {
            return 'package';
        } else if (eClass.includes('interface')) {
            return 'interface';
        } else if (eClass.includes('communicationpath')) {
            return '';
        } else {
            return 'node'; // Default to node for unknown types
        }
    }

    private getRelationshipSymbol(type: string): string {
        switch (type) {
            case 'communication':
                return '--';
            case 'dependency':
                return '..>';
            case 'generalization':
                return '--|>';
            case 'manifestation':
                return '..>';
            case 'deployment':
                return '..>';
            default:
                return '--';
        }
    }

    private generatePlantUml(): string {
        const lines: string[] = ['@startuml'];

        // Add all nodes, artifacts, etc.
        for (const element of this.elementMap.values()) {
            if (!element.name) continue;

            const elementType = this.getElementType(element);
            if (!elementType) continue;
            lines.push(`${elementType} "${element.name}"`);
        }

        // Add relationships
        for (const relation of this.relationships) {
            const sourceElement = this.elementMap.get(relation.source);
            const targetElement = this.elementMap.get(relation.target);

            if (!sourceElement || !targetElement) continue;
            if (!sourceElement.name || !targetElement.name) continue;

            const symbol = this.getRelationshipSymbol(relation.type);
            const label = relation.name ? ` : ${relation.name}` : '';

            lines.push(`"${sourceElement.name}" ${symbol} "${targetElement.name}"${label}`);
        }

        lines.push('@enduml');
        return lines.join('\n');
    }
}
