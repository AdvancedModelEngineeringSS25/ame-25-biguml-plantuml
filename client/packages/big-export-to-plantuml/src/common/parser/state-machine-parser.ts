/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

import { BaseDiagramParser, type Element } from './base-parser.js';

/**
 * Parses UML Deployment Diagrams to PlantUML format
 */
export class StateMachineDiagramParser extends BaseDiagramParser {
    protected override arrowMap: Record<string, string> = {
        transition: '-->'
    };
    protected override childProps: readonly string[] = ['region', 'subvertex', 'transition'];

    private getStereotype(el: any): string {
        if (el.eClass && el.eClass.includes('FinalState')) {
            return '<<end>>';
        }
        const kind = (el.kind || '').toLowerCase();
        if (kind.includes('fork')) {
            return '<<fork>>';
        }
        if (kind.includes('join')) {
            return '<<join>>';
        }
        if (kind.includes('deephistory')) {
            return '<<history*>>';
        }
        if (kind.includes('shallowhistory')) {
            return '<<history>>';
        }
        if (kind.includes('choice')) {
            return '<<choice>>';
        }
        // Start state does not have a kind
        if (kind.includes('')) {
            return '<<start>>';
        }

        return '';
    }

    visitRelations = (el: any) => {
        if (el.source && el.target) {
            const c = el.source?.$ref;
            const s = el.target?.$ref;
            if (c && s) this.relationships.push({ source: c, target: s, type: 'transition' });
        }

        // Recurse into nested children
        for (const prop of this.childProps) {
            for (const child of el[prop] || []) {
                this.visitRelations(child);
            }
        }
    };

    visitElement = (el: any, parentId?: string) => {
        // Determine type: from eClass, or default node if it has nested contents
        const type = this.getElementType(el);
        let stereotype = '';
        if (el.eClass) {
            if (el.eClass.includes('Pseudostate') || el.eClass.includes('FinalState')) {
                stereotype = this.getStereotype(el);
            }
        }

        const name = this.getUniqueName(el.name, this.elements);

        if (type !== 'transition' && el.id) {
            this.elements.push({ id: el.id, name, type, parentId, stereotype });
        }

        // Recurse into nested containers
        for (const prop of this.childProps) {
            for (const child of el[prop] || []) {
                this.visitElement(child, type ? el.id : parentId);
            }
        }
    };

    private getElementType(el: any): string {
        if (!el.eClass && !el.name && !el.subvertex) {
            return 'transition';
        }
        return 'state';
    }

    renderPlantUml = () => {
        const lines: string[] = ['@startuml'];
        const byId = new Map(this.elements.map(e => [e.id, e]));
        const children = new Map<string, Element[]>();

        // Group elements by parent for nested rendering
        this.elements.forEach(e => {
            if (e.parentId) {
                const arr = children.get(e.parentId) || [];
                arr.push(e);
                children.set(e.parentId, arr);
            }
        });

        // Recursive drawer
        const drawn = new Set<string>();
        const draw = (e: Element) => {
            if (drawn.has(e.id)) return;
            drawn.add(e.id);
            const kids = children.get(e.id) || [];
            if (kids.length) {
                lines.push(`${e.type} ${e.name} {`);
                kids.forEach(draw);
                lines.push('}');
            } else {
                if (e.stereotype) {
                    lines.push(`${e.type} ${e.name} ${e.stereotype}`);
                } else {
                    lines.push(`${e.type} ${e.name}`);
                }
            }
        };

        // Draw all top-level elements
        this.elements.filter(e => !e.parentId).forEach(draw);

        // Draw relationships
        for (const r of this.relationships) {
            const src = byId.get(r.source)?.name;
            const tgt = byId.get(r.target)?.name;
            if (!src || !tgt) continue;
            const arrow = this.getArrow(r.type);
            const lbl = r.label ? ` : ${r.label}` : '';
            lines.push(`${src} ${arrow} ${tgt} ${lbl}`);
        }

        lines.push('@enduml');
        return lines.join('\n');
    };
}
