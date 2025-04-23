/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

/**
 * Base interface for different diagram parsers
 */
export interface DiagramParser {
    parse(model: any): string;
}

/**
 * Parses Eclipse UML Class Diagrams to PlantUML format
 */
export class ClassDiagramParser implements DiagramParser {
    private typeMap: Map<string, string> = new Map();

    private parseAttribute(attr: any): string {
        const visibility = attr.visibility ? attr.visibility : '';
        const name = attr.name;
        const type = attr.type?.$ref ? this.resolveTypeRef(attr.type) : '';
        return `${visibility} ${name}: ${type}`;
    }

    private parseParameter(param: any): string {
        const name = param.name;
        const type = param.type?.$ref ? this.resolveTypeRef(param.type) : '';
        return `${name}: ${type}`;
    }

    private parseOperation(op: any): string {
        const visibility = op.visibility ? op.visibility : '';
        const name = op.name;
        const params =
            op.ownedParameter
                ?.filter((p: any) => p.direction !== 'return')
                .map((p: any) => this.parseParameter(p))
                .join(', ') || '';
        const returnParam = op.ownedParameter?.find((p: any) => p.direction === 'return');
        const returnType = returnParam?.type ? this.resolveTypeRef(returnParam.type) : '';

        return `${visibility} ${name}(${params})${returnType ? ': ' + returnType : ''}`;
    }

    private resolveTypeRef(type: any): string {
        if (!type) return '';

        // If it's a direct reference by ID
        if (type.$ref) {
            return this.typeMap.get(type.$ref) || type.$ref;
        }

        // If it's an embedded type definition
        if (type.name) {
            if (type.id) {
                this.typeMap.set(type.id, type.name);
            }
            return type.name;
        }

        return '';
    }

    private buildTypeMap(model: any): void {
        model.packagedElement?.forEach((element: any) => {
            if (element.id && element.name) {
                this.typeMap.set(element.id, element.name);
            }
        });
    }

    private parseClass(element: any): string {
        const lines: string[] = [];
        const name = element.name;

        if (element.eClass.includes('Interface')) {
            lines.push(`interface ${name} {`);
        } else if (element.eClass.includes('Enumeration')) {
            lines.push(`enum ${name} {`);
            element.ownedLiteral?.forEach((literal: any) => {
                lines.push(`  ${literal.name}`);
            });
        } else {
            lines.push(`class ${name} {`);
        }

        // Add attributes
        element.ownedAttribute?.forEach((attr: any) => {
            lines.push(`  ${this.parseAttribute(attr)}`);
        });

        // Add operations
        element.ownedOperation?.forEach((op: any) => {
            lines.push(`  ${this.parseOperation(op)}`);
        });

        lines.push('}');
        return lines.join('\n');
    }

    private parseRelationships(model: any): string[] {
        const relationships: string[] = [];

        model.packagedElement.forEach((element: any) => {
            // Handle interface realizations
            if (element.interfaceRealization) {
                element.interfaceRealization.forEach((realization: any) => {
                    const client = this.resolveElement(realization.client?.[0]);
                    const supplier = this.resolveElement(realization.supplier?.[0]);
                    if (client && supplier) {
                        relationships.push(`${client} ..|> ${supplier}`);
                    }
                });
            }

            // Handle usages
            if (element.eClass.includes('Usage')) {
                const client = this.resolveElement(element.client?.[0]);
                const supplier = this.resolveElement(element.supplier?.[0]);
                if (client && supplier) {
                    relationships.push(`${client} ..> ${supplier}`);
                }
            }
        });

        return relationships;
    }

    private resolveElement(element: any): string | undefined {
        if (!element) return undefined;

        if (element.name) {
            return element.name;
        }

        if (element.$ref) {
            return this.typeMap.get(element.$ref);
        }

        return undefined;
    }

    parse(model: any): string {
        // First build the type map
        this.buildTypeMap(model);

        const elements = model.packagedElement;
        const plantUml: string[] = ['@startuml'];

        // Parse classes, interfaces, and enums
        elements.forEach((element: any) => {
            if (['Class', 'Interface', 'Enumeration'].some(type => element.eClass.includes(type))) {
                plantUml.push(this.parseClass(element));
            }
        });

        // Parse relationships
        plantUml.push(...this.parseRelationships(model));

        plantUml.push('@enduml');
        return plantUml.join('\n');
    }
}

/**
 * Parses Eclipse UML Activity Diagrams to PlantUML format
 */
export class ActivityDiagramParser implements DiagramParser {
    private nodeMap: Map<string, any> = new Map();
    private edges: any[] = [];

    private buildNodeMap(model: any): void {
        const activity = model.packagedElement.find((el: any) => el.eClass.includes('Activity'));
        if (!activity) return;

        // Map all nodes for easy reference
        activity.node?.forEach((node: any) => {
            this.nodeMap.set(node.id, node);
        });

        this.edges = activity.edge || [];
    }

    private parseNode(node: any): string {
        if (!node) return '';

        switch (true) {
            case node.eClass.includes('ActivityFinalNode'):
                return 'stop';
            case node.eClass.includes('InitialNode'):
                return 'start';
            case node.eClass.includes('DecisionNode'):
                return `if () \n endif`;
            case node.eClass.includes('ForkNode'):
                return 'fork';
            case node.eClass.includes('JoinNode'):
                return 'end fork';
            case node.eClass.includes('MergeNode'):
                return 'end merge';
            default:
                return `:${node.name || 'Action'};`;
        }
    }

    private parseEdge(edge: any): string {
        const source = this.nodeMap.get(edge.source.$ref);
        const target = this.nodeMap.get(edge.target.$ref);

        if (!source || !target) return '';

        // Handle different edge types
        if (edge.eClass.includes('ControlFlow')) {
            return `${this.parseNode(source)} \n ${this.parseNode(target)}`;
        }

        return '';
    }

    private parsePartition(partition: any): string[] {
        const lines: string[] = [];
        const name = partition.name || 'unnamed';

        lines.push(`partition ${name} {`);

        // Parse edges for nodes in this partition
        this.edges.forEach(edge => {
            const source = this.nodeMap.get(edge.source.$ref);
            const target = this.nodeMap.get(edge.target.$ref);

            if (source && target && source.inPartition?.[0]?.$ref === partition.id && target.inPartition?.[0]?.$ref === partition.id) {
                lines.push(this.parseEdge(edge));
            }
        });

        lines.push(`}`);

        return lines;
    }

    parse(model: any): string {
        this.buildNodeMap(model);

        const activity = model.packagedElement.find((el: any) => el.eClass.includes('Activity'));
        if (!activity) {
            throw new Error('No activity found in model');
        }

        const plantUml: string[] = ['@startuml'];

        // Add title if activity has a name
        if (activity.name) {
            plantUml.push(`title ${activity.name}`);
        }

        // Handle partitions
        activity.group?.forEach((partition: any) => {
            if (partition.eClass.includes('ActivityPartition')) {
                plantUml.push(...this.parsePartition(partition));
            }
        });

        plantUml.push('@enduml');
        return plantUml.join('\n');
    }
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
            default:
                throw new Error(`Unsupported diagram type: ${diagramType}`);
        }
    }
}
