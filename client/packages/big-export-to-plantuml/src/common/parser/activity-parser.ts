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
