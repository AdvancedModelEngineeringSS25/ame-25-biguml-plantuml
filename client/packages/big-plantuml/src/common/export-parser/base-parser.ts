/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

export type Element = { id: string; name: string; type: string; parentId?: string; stereotype?: string };
export type Relationship = { source: string; target: string; type: string; label?: string };

/**
 * Base UML to PlantUML parser, implementing common logic
 *
 * Traverses UML JSON and saves all Elements and relationships
 * Then renders PlantUML format
 */
export abstract class BaseDiagramParser {
    // Counter to ensure unique element names
    private elementCounter = 0;
    protected elements: Element[] = [];
    protected relationships: Relationship[] = [];
    /**  Properties that include nested children of elements
     *   This is used to traverse the model structure
     */
    protected abstract childProps: readonly string[];
    protected abstract arrowMap: Record<string, string>;
    protected abstract visitElement: (el: any) => void;
    protected abstract visitRelations: (el: any) => void;
    protected abstract renderPlantUml: () => string;

    public parse(model: any): string {
        (model.packagedElement || []).forEach((el: any) => this.visitElement(el));
        (model.packagedElement || []).forEach((el: any) => this.visitRelations(el));
        return this.renderPlantUml();
    }

    getArrow(type: string): string {
        return this.arrowMap[type] || '-->';
    }

    getUniqueName(name: any, elements: Element[]): string {
        const baseName = name || `Element_${this.elementCounter++}`;
        let uniqueName = baseName;

        while (elements.some(el => el.name === uniqueName)) {
            uniqueName = `${baseName}_${this.elementCounter++}`;
        }
        return uniqueName;
    }
}
