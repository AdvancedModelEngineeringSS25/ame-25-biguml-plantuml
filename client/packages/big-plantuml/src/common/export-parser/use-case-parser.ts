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
 * Parses UML Use–Case Diagrams to PlantUML format
 */
export class UseCaseDiagramParser extends BaseDiagramParser {
    protected override childProps: readonly string[] = ['packagedElement', 'ownedUseCase'];
    protected override arrowMap: Record<string, string> = {
        association: '--',
        include: '..>',
        extend: '..>',
        generalization: '--|>'
    };

    visitRelations = (el: any) => {
        const cls = el.eClass || '';

        // Include / extend on use‐cases
        if (el.ownedUseCase) {
            for (const uc of el.ownedUseCase) {
                // Include
                for (const inc of uc.include || []) {
                    const src = uc.id;
                    const tgt = inc.addition?.$ref;
                    if (src && tgt) {
                        this.relationships.push({ source: src, target: tgt, type: 'include', label: '<<include>>' });
                    }
                }
                // Extend
                for (const ext of uc.extend || []) {
                    const src = uc.id;
                    const tgt = ext.extendedCase?.$ref;
                    if (src && tgt) {
                        this.relationships.push({ source: src, target: tgt, type: 'extend', label: '<<extend>>' });
                    }
                }
            }
        }

        // Generalization
        for (const g of el.generalization || []) {
            const src = el.id;
            const tgt = g.general?.$ref;
            if (src && tgt) {
                this.relationships.push({ source: src, target: tgt, type: 'generalization' });
            }
        }

        // Associations
        if (cls.toLowerCase().includes('association')) {
            const ends = el.ownedEnd || [];
            if (ends.length === 2) {
                const [e1, e2] = ends;
                const src = e1.type?.$ref;
                const tgt = e2.type?.$ref;
                if (src && tgt) {
                    this.relationships.push({ source: src, target: tgt, type: 'association' });
                }
            }
        }

        // Recurse into nested children
        for (const prop of this.childProps) {
            for (const child of el[prop] || []) {
                this.visitRelations(child);
            }
        }
    };

    visitElement = (el: any, parentId?: string) => {
        let type = this.getElementType(el);
        // Treat Component as a package/container if it has use cases
        const hasUseCases = Boolean(el.ownedUseCase && el.ownedUseCase.length);
        if (!type && hasUseCases) {
            type = 'package';
        }

        const name = this.getUniqueName(el.name || '', this.elements);

        if (type && el.id && el.name !== undefined) {
            this.elements.push({ id: el.id, name, type, parentId });
        }

        for (const prop of this.childProps) {
            for (const child of el[prop] || []) {
                this.visitElement(child, type ? el.id : parentId);
            }
        }
    };

    private getElementType(el: any): string {
        if (!el || !el.eClass) return 'usecase';
        const cls = (el.eClass || '').toLowerCase();
        if (cls.includes('actor')) return 'actor';
        if (cls.includes('component')) return 'component';
        return '';
    }

    renderPlantUml = () => {
        const lines: string[] = ['@startuml'];
        const byId = new Map(this.elements.map(e => [e.id, e]));
        const children = new Map<string, Element[]>();

        // Group children by parentId
        for (const e of this.elements) {
            if (e.parentId) {
                const arr = children.get(e.parentId) || [];
                arr.push(e);
                children.set(e.parentId, arr);
            }
        }

        const drawn = new Set<string>();
        const draw = (e: Element) => {
            if (drawn.has(e.id)) return;
            drawn.add(e.id);

            const kids = children.get(e.id) || [];
            if (kids.length) {
                lines.push(`${e.type} "${e.name}" {`);
                kids.forEach(draw);
                lines.push(`}`);
            } else {
                lines.push(`${e.type} "${e.name}"`);
            }
        };

        // Draw roots
        this.elements.filter(e => !e.parentId).forEach(draw);

        // Draw relationships
        for (const r of this.relationships) {
            const s = byId.get(r.source)?.name;
            const t = byId.get(r.target)?.name;
            if (!s || !t) continue;
            const arrow = this.getArrow(r.type);
            const lbl = r.label ? ` : ${r.label}` : '';
            lines.push(`"${s}" ${arrow} "${t}"${lbl}`);
        }

        lines.push('@enduml');
        return lines.join('\n');
    };
}
