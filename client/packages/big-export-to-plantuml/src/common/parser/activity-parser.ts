/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

import { BaseDiagramParser, type Element, type Relationship } from './base-parser.js';

/**
 * Parses UML Activity Diagrams to PlantUML format
 *
 * Works different than other parsers:
 * Starts with the initial node and traverses all outgoing relationships recursively.
 */
export class ActivityDiagramParser extends BaseDiagramParser {
    // Not used in the activity diagram because it has a different structure
    protected override arrowMap: Record<string, string>;
    protected override childProps: readonly string[];
    protected override visitElement: (el: any) => void;
    protected override visitRelations: (el: any) => void;

    // Holds the merge/join nodes, where the flow continues after a decision or fork
    private branchExitMap: Record<string, Element> = {};

    public override parse(model: any): string {
        // Locate the activity element
        const activity = (model.packagedElement || []).find((el: any) => (el.eClass || '').toLowerCase().includes('//activity'));
        if (!activity) return '';

        // Collect all nodes as elements
        for (const el of activity.node || []) {
            if (!el.id) continue;
            const type = this.getElementType(el);
            const name = type === 'OpaqueAction' ? el.name || 'Action' : type;
            this.elements.push({ id: el.id, name, type });
        }

        // Collect all control flows as relationships
        for (const edge of activity.edge || []) {
            if (!edge.id || !edge.source?.$ref || !edge.target?.$ref) continue;
            const src = edge.source.$ref;
            const tgt = edge.target.$ref;
            this.relationships.push({
                source: src,
                target: tgt,
                type: 'ControlFlow',
                label: edge.id
            });
        }

        return this.renderPlantUml();
    }

    private getElementType(el: any): string {
        const cls = (el.eClass || '').toLowerCase();
        if (cls.includes('initialnode')) return 'InitialNode';
        if (cls.includes('activityfinalnode')) return 'ActivityFinalNode';
        if (cls.includes('flowfinalnode')) return 'FlowFinalNode';
        if (cls.includes('forknode')) return 'ForkNode';
        if (cls.includes('joinnode')) return 'JoinNode';
        if (cls.includes('mergenode')) return 'MergeNode';
        if (cls.includes('decisionnode')) return 'DecisionNode';
        if (cls.includes('opaqueaction')) return 'OpaqueAction';
        if (cls.includes('sendsignalaction')) return 'SendSignalAction';
        if (cls.includes('accepteventaction')) return 'AcceptEventAction';
        return '';
    }

    renderPlantUml = () => {
        const lines: string[] = ['@startuml', 'start'];
        const visited = new Set<string>();

        const initial = this.elements.find(e => e.type === 'InitialNode');
        if (initial) {
            this.traverse(initial, lines, visited);
        }

        lines.push('@enduml');
        return lines.join('\n');
    };

    // Traverse the activity diagram elements recursively
    private traverse(current: Element, lines: string[], visited: Set<string>, currentId: string = '') {
        visited.add(current.id);

        const outgoing = this.relationships.filter(r => r.source === current.id);

        switch (current.type) {
            case 'OpaqueAction':
                lines.push(`:${current.name};`);
                this.traverseNext(outgoing, lines, visited, currentId);
                break;
            case 'SendSignalAction':
                lines.push(`:${current.name}; <<sendSignal>>`);
                this.traverseNext(outgoing, lines, visited, currentId);
                break;
            case 'AcceptEventAction':
                lines.push(`:${current.name}; <<acceptEvent>>`);
                this.traverseNext(outgoing, lines, visited, currentId);
                break;
            case 'ForkNode':
                lines.push('fork');
                // Recursively traverse all outgoing relationships
                outgoing.forEach((rel, idx) => {
                    const next = this.elements.find(e => e.id === rel.target);
                    if (!next) return;
                    if (idx > 0) {
                        lines.push('fork again');
                    }
                    this.traverse(next, lines, new Set(), current.id);
                });
                lines.push('end fork');
                // If there is a branch exit, traverse it
                if (this.branchExitMap[current.id]) {
                    this.traverse(this.branchExitMap[current.id], lines, new Set());
                }
                break;

            case 'DecisionNode':
                lines.push('switch ()');
                // Recursively traverse all outgoing relationships
                for (const rel of outgoing) {
                    const next = this.elements.find(e => e.id === rel.target);
                    if (next) {
                        lines.push('case ()');
                        this.traverse(next, lines, new Set(), current.id);
                    }
                }
                lines.push('endswitch');
                // If there is a branch exit, traverse it
                if (this.branchExitMap[current.id]) {
                    this.traverse(this.branchExitMap[current.id], lines, new Set());
                }
                break;

            case 'MergeNode':
                // Only continue if the merge node is the first visited node
                if (visited.size > 1) {
                    this.branchExitMap[currentId] = current;
                    return;
                }
                this.traverseNext(outgoing, lines, visited);
                break;

            case 'JoinNode':
                // Only continue if the join node is the first visited node
                if (visited.size > 1) {
                    this.branchExitMap[currentId] = current;
                    return;
                }
                this.traverseNext(outgoing, lines, visited);
                break;

            case 'FlowFinalNode':
                lines.push('end');
                break;

            case 'ActivityFinalNode':
                lines.push('stop');
                break;

            case 'InitialNode':
                this.traverseNext(outgoing, lines, visited);
                break;

            default:
                this.traverseNext(outgoing, lines, visited);
        }
    }

    // Traverse the next elements based on outgoing relationships
    private traverseNext(outgoing: Relationship[], lines: string[], visited: Set<string>, currendId: string = '') {
        for (const rel of outgoing) {
            const next = this.elements.find(e => e.id === rel.target);
            if (next) this.traverse(next, lines, visited, currendId);
        }
    }
}
