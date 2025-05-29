/**********************************************************************************
 * Copyright (c) 2025 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

import { type UML } from 'plantuml-parser';

export type PlantUmlElement = {
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
    text?: string;
    of?: string;
    [key: string]: any; // For extra properties
};

export class ClassDiagramParser {
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
                // type already given in this element, so its a package
                if (element.elements !== undefined && element.elements?.length > 0) {
                    element.elements = this.parseElements(element.elements);
                }
            } else if ('left' in element) {
                // relationships are identified using their arrows
            } else if ('text' in element && 'of' in element) {
                element.type = 'note';
            } else if ('name' in element && !('type' in element)) {
                // must be one of the node types
                element = this.parseNode(element);
            } else {
                element.type = 'unknown';
            }
        });
        return elements;
    }

    private parseNode(element: PlantUmlElement): PlantUmlElement {
        if (element.isAbstract !== undefined) {
            element.type = element.isAbstract ? 'abstract class' : 'class';
            return element;
        }
        if (element.members !== undefined) {
            if (element.members.length == 0) {
                // this node has no members and thus we cannot differentiate
                // TODO maybe change typing here?
                element.type = 'interface OR enum';
                return element;
            }
            element.type = 'enum';
            element.members.forEach((member: { returnType: PlantUmlElement }) => {
                // if elements member has a return type, its a method,
                // so it must be an interface (enums usually dont have methods)
                if (member.returnType !== undefined) {
                    element.type = 'interface';
                }
            });
            return element;
        }
        element.type = 'unknown';
        return element;
    }
}
