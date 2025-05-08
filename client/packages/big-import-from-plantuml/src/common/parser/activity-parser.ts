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
    private processedEdges: Set<string> = new Set();

    private buildNodeMap(model: any): void {
        const activity = model.packagedElement.find((el: any) => el.eClass.includes('Activity'));
        if (!activity) return;

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
                // Decision nodes are handled differently in edge parsing
                return '';
            case node.eClass.includes('FlowFinalNode'):
                return 'end';
            case node.eClass.includes('OpaqueAction'):
                return `:${node.name || 'Action'};`;
            default:
                return `:WorkInProgress;`;
        }
    }

    /**
     * Retrieves connected edges for a given node
     */
    private getConnectedEdges(nodeId: string): any[] {
        return this.edges.filter(edge => edge.source.$ref === nodeId && !this.processedEdges.has(edge.id));
    }

    /**
     * Recursively parses connected nodes and edges (important for decision nodes)
     */
    private parseConnectedFlow(nodeId: string): string {
        const connectedEdges = this.getConnectedEdges(nodeId);
        let result = '';

        connectedEdges.forEach(edge => {
            this.processedEdges.add(edge.id);
            const target = this.nodeMap.get(edge.target.$ref);
            const targetNode = this.parseNode(target);
            if (targetNode) {
                result += targetNode + '\n';
                // Recursively add connected edges from the target
                result += this.parseConnectedFlow(edge.target.$ref);
            }
        });

        return result;
    }

    private parseDecisionNode(node: any): string {
        const outgoingEdges = this.getConnectedEdges(node.id);

        let result = '';
        outgoingEdges.forEach((edge, index) => {
            const target = this.nodeMap.get(edge.target.$ref);
            this.processedEdges.add(edge.id);

            if (index === 0) {
                result += `if () then \n`;
                result += `  ${this.parseNode(target)}\n`;
                result += `  ${this.parseConnectedFlow(target.id)}`;
            } else if (index === outgoingEdges.length - 1) {
                result += `else\n`;
                result += `  ${this.parseNode(target)}\n`;
                result += `  ${this.parseConnectedFlow(target.id)}`;
            } else {
                result += `elseif () then\n`;
                result += `  ${this.parseNode(target)}\n`;
                result += `  ${this.parseConnectedFlow(target.id)}`;
            }
        });

        result += 'endif';
        return result;
    }

    /**
     * Gets the initial nodes (nodes without incoming edges)
     */
    private findInitialNodes(activity: any): any[] {
        return activity.node?.filter((node: any) => !node.incoming || node.incoming.length === 0) || [];
    }

    /**
     * Traverse from a node through its outgoing edges
     */
    private traverseFromNode(node: any): string {
        if (!node) return '';

        let result = '';
        const nodeContent = this.parseNode(node);
        if (nodeContent) {
            result += nodeContent + '\n';
        }

        // If this is a decision node, handle it specially
        if (node.eClass.includes('DecisionNode')) {
            result += this.parseDecisionNode(node);
            return result;
        }

        // Process outgoing edges
        node.outgoing?.forEach((outEdge: any) => {
            const edge = this.edges.find(e => e.id === outEdge.$ref);
            if (edge && !this.processedEdges.has(edge.id)) {
                this.processedEdges.add(edge.id);
                const targetNode = this.nodeMap.get(edge.target.$ref);
                result += this.traverseFromNode(targetNode);
            }
        });

        return result;
    }

    parse(model: any): string {
        this.buildNodeMap(model);
        this.processedEdges.clear();

        const activity = model.packagedElement.find((el: any) => el.eClass.includes('Activity'));
        if (!activity) {
            throw new Error('No activity found in model');
        }

        const plantUml: string[] = ['@startuml'];

        // Find initial node
        const initialNode = this.findInitialNodes(activity)[0];
        const traversalResult = this.traverseFromNode(initialNode);
        if (traversalResult) {
            plantUml.push(traversalResult);
        }

        plantUml.push('@enduml');
        return plantUml.join('\n');
    }
}
