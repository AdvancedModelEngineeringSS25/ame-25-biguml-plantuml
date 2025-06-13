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
 * Parses UML Class Diagrams to PlantUML format
 */
export class ClassDiagramParser extends BaseDiagramParser {
    attributeOwner = new Map<string, string>();
    typeMap = new Map<string, string>();

    protected override childProps = ['packagedElement', 'nestedClassifier'];

    protected arrowMap: Record<string, string> = {
        dependency: '..>',
        generalization: '--|>',
        implementation: '..|>',
        manifestation: '..>',
        association: '--',
        aggregation: 'o--',
        composition: '*--',
        abstraction: '..>',
        elementImport: '..>',
        packageImport: '..>',
        packageMerge: '..>',
        substitution: '..>',
        usage: '..>',
        realization: '..|>'
    };

    private getElementType(el: any): string {
        const cls = (el.eClass || '').toLowerCase();
        if (cls.includes('package')) return 'package';
        if (cls.includes('class')) return 'class';
        if (cls.includes('abstract')) return 'abstract';
        if (cls.includes('interface')) return 'interface';
        if (cls.includes('enumeration')) return 'enum';
        if (cls.includes('primitivetype')) return 'class';
        return '';
    }

    visitRelations = (el: any) => {
        const className = el.eClass || '';

        // Interface realization
        for (const real of el.interfaceRealization || []) {
            const c = real.client?.[0]?.$ref;
            const s = real.supplier?.[0]?.$ref;
            if (c && s) this.relationships.push({ source: c, target: s, type: 'implementation' });
        }

        // Dependency
        if (className.includes('Dependency')) {
            const c = el.client?.[0]?.$ref;
            const s = el.supplier?.[0]?.$ref;
            if (c && s) this.relationships.push({ source: c, target: s, type: 'dependency' });
        }

        // Generalization
        for (const g of el.generalization || []) {
            const sub = el.id;
            const sup = g.general?.$ref;
            if (sub && sup) this.relationships.push({ source: sub, target: sup, type: 'generalization' });
        }

        // Manifestation
        for (const m of el.manifestation || []) {
            const art = el.id;
            const comp = m.supplier?.[0]?.$ref;
            if (art && comp) this.relationships.push({ source: art, target: comp, type: 'manifestation', label: '<<manifest>>' });
        }

        // Package import
        for (const pi of el.packageImport || []) {
            const source = el.id;
            const importedPackage = pi.importedPackage?.$ref;
            if (source && importedPackage)
                this.relationships.push({ source: source, target: importedPackage, type: 'packageImport', label: '<<import>>' });
        }

        // Package merge
        for (const pm of el.packageMerge || []) {
            const source = el.id;
            const mergedPackage = pm.mergedPackage?.$ref;
            if (source && mergedPackage)
                this.relationships.push({ source: source, target: mergedPackage, type: 'packageMerge', label: '<<merge>>' });
        }

        // Substitution
        for (const s of el.substitution || []) {
            const client = s.client?.[0].$ref;
            const supplier = s.supplier?.[0].$ref;
            if (supplier && client)
                this.relationships.push({ source: client, target: supplier, type: 'substitution', label: '<<substitution>>' });
        }

        // Composition or aggregation
        for (const ownedAttribute of el.ownedAttribute || []) {
            const client = ownedAttribute?.type?.$ref;
            const supplier = el?.id;
            let type = ownedAttribute?.aggregation;
            if (type === 'composite') {
                type = 'composition';
            } else if (type === 'shared') {
                type = 'aggregation';
            }
            if (supplier && client && type) this.relationships.push({ source: client, target: supplier, type });
        }

        // Abstraction
        if (className.includes('Abstraction')) {
            const c = el.client?.[0]?.$ref;
            const s = el.supplier?.[0]?.$ref;
            if (c && s) this.relationships.push({ source: c, target: s, type: 'abstraction', label: '<<abstraction>>' });
        }

        // Element import
        if (className.includes('ElementImport')) {
            const imp = el.importingNamespace?.$ref;
            const tgt = el.importedElement?.$ref;
            if (imp && tgt) this.relationships.push({ source: imp, target: tgt, type: 'elementImport', label: '<<import>>' });
        }

        // Association
        if (className.includes('Association')) {
            const [e1, e2] = (el.memberEnd || []).map((m: any) => m.$ref);
            const src = this.attributeOwner.get(e1);
            const tgt = this.attributeOwner.get(e2);
            if (src && tgt) this.relationships.push({ source: src, target: tgt, type: 'association' });
        }

        // Realization
        if (className.includes('Realization')) {
            const c = el.client?.[0]?.$ref;
            const s = el.supplier?.[0]?.$ref;
            if (c && s) this.relationships.push({ source: c, target: s, type: 'realization' });
        }

        // Usage
        if (className.includes('Usage')) {
            const c = el.client?.[0]?.$ref;
            const s = el.supplier?.[0]?.$ref;
            if (c && s) this.relationships.push({ source: c, target: s, type: 'usage', label: '<<use>>' });
        }

        // Recurse into nested children
        for (const prop of this.childProps) {
            for (const child of el[prop] || []) {
                this.visitRelations(child);
            }
        }
    };

    visitElement = (el: any, parentId?: string) => {
        const kind = this.getElementType(el);
        const name = this.getUniqueName(el.name, this.elements);
        if (kind && el.id && el.name) {
            this.elements.push({ id: el.id, name, type: kind, parentId });
            this.typeMap.set(el.id, name);
        }

        // Properties (attributes)
        for (const attr of el.ownedAttribute || []) {
            if (!attr.id || attr.name != 'Property') continue;
            this.attributeOwner.set(attr.id, el.id);
            const vis = this.getVisibilityPrefix(attr);
            const t = this.resolveTypeRef(attr.type, this.typeMap);
            const featureLabel = `${vis} ${attr.name}: ${t}`;
            this.elements.push({ id: attr.id, name: featureLabel, type: 'property', parentId: el.id });
        }

        // Operations
        for (const op of el.ownedOperation || []) {
            if (!op.id) continue;
            const vis = this.getVisibilityPrefix(op);
            const params = (op.ownedParameter || [])
                .filter((p: any) => p.direction !== 'return')
                .map((p: any) => `${p.name}: ${this.resolveTypeRef(p.type, this.typeMap)}`)
                .join(', ');
            const ret = (op.ownedParameter || []).find((p: any) => p.direction === 'return');
            const retType = ret ? this.resolveTypeRef(ret.type, this.typeMap) : '';
            const featureLabel = `${vis} ${op.name}(${params})${retType ? `: ${retType}` : ''}`;
            this.elements.push({ id: op.id, name: featureLabel, type: 'operation', parentId: el.id });
        }

        // Enumeration literals
        for (const lit of el.ownedLiteral || []) {
            if (!lit.id) continue;
            this.elements.push({ id: lit.id, name: lit.name, type: 'enumerationliteral', parentId: el.id });
        }

        // Recurse into nested packages or classifiers
        for (const prop of this.childProps) {
            for (const child of el[prop] || []) {
                this.visitElement(child, kind ? el.id : parentId);
            }
        }
    };

    renderPlantUml = () => {
        const lines: string[] = ['@startuml'];
        const byId = new Map(this.elements.map(e => [e.id, e]));
        const children = new Map<string, Element[]>();

        // Group children
        for (const e of this.elements) {
            if (e.parentId) {
                const arr = children.get(e.parentId) || [];
                arr.push(e);
                children.set(e.parentId, arr);
            }
        }

        const drawn = new Set<string>();
        const draw = (e: Element, indent = 0) => {
            if (drawn.has(e.id)) return;
            drawn.add(e.id);
            const kids = children.get(e.id) || [];
            const pad = '  '.repeat(indent);

            // Features lines
            if (['property', 'operation', 'enumerationliteral'].includes(e.type)) {
                lines.push(`${pad}${e.name}`);
                return;
            }

            // Compound types (packages or class/iface/enum with nested)
            if (kids.length) {
                lines.push(`${pad}${e.type} "${e.name}" {`);
                kids.forEach(c => draw(c, indent + 1));
                lines.push(`${pad}}`);
            } else {
                lines.push(`${pad}${e.type} "${e.name}"`);
            }
        };

        // Draw only roots
        this.elements.filter(e => !e.parentId).forEach(e => draw(e));

        // Then relationships
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

    private getVisibilityPrefix(el: any): string {
        // Public is default in UML
        switch (el.visibility) {
            case 'private':
                return '-';
            case 'protected':
                return '#';
            case 'package':
                return '~';
            default:
                return '+';
        }
    }

    private resolveTypeRef(typeRef: any, typeMap: Map<string, string>): string {
        if (typeRef?.$ref) return typeMap.get(typeRef.$ref) || '';
        return typeRef?.name || '';
    }
}
