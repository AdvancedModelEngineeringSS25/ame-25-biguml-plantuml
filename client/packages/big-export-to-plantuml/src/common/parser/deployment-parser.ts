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
export class DeploymentDiagramParser extends BaseDiagramParser {
    protected override childProps: readonly string[] = ['nestedNode', 'nestedArtifact', 'nestedClassifier'];
    attributeOwner = new Map<string, string>();

    protected arrowMap: Record<string, string> = {
        communication: '--',
        dependency: '..>',
        generalization: '--|>',
        manifestation: '..>',
        deployment: '..>'
    };

    visitRelations = (el: any) => {
        const cls = el.eClass || '';

        // CommunicationPath
        if (cls.includes('CommunicationPath')) {
            const [e1, e2] = el.memberEnd?.map((m: any) => m.$ref) || [];
            const src = this.attributeOwner.get(e1);
            const tgt = this.attributeOwner.get(e2);
            if (src && tgt) this.relationships.push({ source: src, target: tgt, type: 'communication', label: 'CommunicationPath' });
        }

        // Dependency
        if (cls.includes('Dependency')) {
            const c = el.client?.[0]?.$ref;
            const s = el.supplier?.[0]?.$ref;
            if (c && s) this.relationships.push({ source: c, target: s, type: 'dependency' });
        }

        // Generalization
        for (const g of el.generalization || []) {
            const gen = g.general?.$ref;
            if (gen) this.relationships.push({ source: el.id, target: gen, type: 'generalization' });
        }

        // Manifestation
        for (const m of el.manifestation || []) {
            const sup = m.supplier?.[0]?.$ref;
            if (sup) this.relationships.push({ source: el.id, target: sup, type: 'manifestation', label: '<<manifest>>' });
        }

        // Deployment
        for (const d of el.deployment || []) {
            const sup = d.supplier?.[0]?.$ref;
            if (sup) this.relationships.push({ source: sup, target: el.id, type: 'deployment', label: '<<deploy>>' });
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
        let type = this.getElementType(el);
        const hasChildren = Boolean(
            (el.nestedNode && el.nestedNode.length) ||
                (el.nestedArtifact && el.nestedArtifact.length) ||
                (el.nestedClassifier && el.nestedClassifier.length)
        );
        if (!type && hasChildren) {
            type = 'node';
        }

        const name = this.getUniqueName(el.name, this.elements);

        if (type && el.id && el.name) {
            this.elements.push({ id: el.id, name, type, parentId });
        }

        // Map any ownedAttribute id for CommunicationPath
        for (const attr of el.ownedAttribute || []) {
            if (attr.id) this.attributeOwner.set(attr.id, el.id);
        }

        // Recurse into nested containers
        for (const prop of this.childProps) {
            for (const child of el[prop] || []) {
                this.visitElement(child, type ? el.id : parentId);
            }
        }
    };

    private getElementType(el: any): string {
        const cls = (el.eClass || '').toLowerCase();
        if (cls.includes('artifact')) return 'artifact';
        if (cls.includes('device') || cls.includes('executionenvironment') || cls.includes('node')) return 'node';
        if (cls.includes('component')) return 'component';
        if (cls.includes('interface')) return 'interface';
        if (cls.includes('package')) return 'package';
        if (cls.includes('deploymentspecification')) return 'node';
        return '';
    }

    renderPlantUml = () => {
        const lines: string[] = ['@startuml'];
        const byId = new Map(this.elements.map(e => [e.id, e]));
        const children = new Map<string, Element[]>();

        // Group elements by parent
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
                lines.push(`${e.type} "${e.name}" {`);
                kids.forEach(draw);
                lines.push('}');
            } else {
                lines.push(`${e.type} "${e.name}"`);
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
            lines.push(`"${src}" ${arrow} "${tgt}"${lbl}`);
        }

        lines.push('@enduml');
        return lines.join('\n');
    };
}
