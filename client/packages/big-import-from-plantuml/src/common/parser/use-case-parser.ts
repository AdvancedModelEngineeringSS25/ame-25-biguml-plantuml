/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

import type { UML } from "plantuml-parser";

export type PlantUmlElement = {
    elements?: PlantUmlElement[];
    name?: string;
    title?: string;
    type?: string;
    left?: string;
    right?: string;
    leftType?: string;
    rightType?: string;
    leftArrowHead?: string;
    rightArrowHead?: string;
    leftArrowBody?: string;
    rightArrowBody?: string;
    label?: string;
    text?: string;
    of?: string;
    stereotypes?: string[];
    [key: string]: any;
};

export class UseCaseDiagramParser {
    parse(model: UML[]): PlantUmlElement[] {
        let elements: PlantUmlElement[] = [];
        model.forEach(obj => {
            if (Array.isArray(obj.elements)) {
                elements = obj.elements;
            }
        });
        return this.parseElements(elements);
    }

    parseElements(elements: PlantUmlElement[]): PlantUmlElement[] {
        elements.forEach(element => {
            if ('type' in element) {
                // Already typed (e.g. package, actor, usecase)
                if (element.elements !== undefined && element.elements.length > 0) {
                    element.elements = this.parseElements(element.elements);
                }
            } else if ('left' in element && 'right' in element) {
                // Relationships identified using arrows
            } else if ('text' in element && 'of' in element) {
                element.type = "note";
            } else if (element.name && !('type' in element)) {
                element.type = "usecase";
            } else {
                element.type = "unknown";
            }
            // ! actors are currently not recognized by the parser module
        });
        return elements;
    }
}
