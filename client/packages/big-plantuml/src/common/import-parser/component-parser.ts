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
    text?: string;
    of?: string;
    [key: string]: any; // For extra properties
  }
  
export class ComponentDiagramParser {

    parse(model: UML[]): PlantUmlElement[] {
        let elements : PlantUmlElement[] = [];
        model.forEach(obj => {
            if (Array.isArray(obj.elements)) {
              elements = obj.elements;
            }
          });
        return this.parseElements(elements)
    }
    parseElements(elements: PlantUmlElement[]): PlantUmlElement[] {
        elements.forEach(element => {
            if ('type' in element) {
                // type already given in this element
                if(element.elements !== undefined && element.elements?.length > 0){
                    element.elements = this.parseElements(element.elements);
                }
            } else if ('left' in element) {
                // relationships are identified using their arrows
            } else if ("text" in element && "of" in element){
                element.type = "note";
            } else if ("name" in element && !("type" in element)) {
                element.type = "component";
            }else {
                element.type = "unknown";
            }
        });
        return elements;
    }
}
