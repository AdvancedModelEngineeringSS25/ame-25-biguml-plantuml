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
 * Parses Eclipse UML Use Case Diagrams to PlantUML format
 */
export class UseCaseDiagramParser implements DiagramParser {
    private stateMap: Map<string, any> = new Map();
    private idToVariableName: Map<string, string> = new Map();
    private actors: Map<string, { name: string; relations: string[] }> = new Map();
    private useCases: Map<string, { name: string; component: string; relations: string[] }> = new Map();
    private associations: string[] = [];

    parse(model: any): string {
        // Reset state
        this.stateMap.clear();
        this.idToVariableName.clear();
        this.actors.clear();
        this.useCases.clear();
        this.associations = [];

        const elements = model.packagedElement || [];

        // First pass: Register all actors and use cases without relationships
        elements.forEach((element: any) => {
            if (element.eClass.includes('#//Actor')) {
                this.registerActor(element);
            } else if (element.eClass.includes('#//Component')) {
                this.processComponent(element);
            }
        });

        // Second pass: Process actor generalizations now that all actors are registered
        elements.forEach((element: any) => {
            if (element.eClass.includes('#//Actor')) {
                this.processActorGeneralizations(element);
            }
        });

        // Third pass: Process associations and relationships
        elements.forEach((element: any) => {
            if (element.eClass.includes('#//Association')) {
                this.processAssociation(element);
            }
        });

        // Generate PlantUML code
        return this.generatePlantUMLCode();
    }

    private registerActor(actor: any): void {
        const id = actor.id;
        const name = actor.name;

        // First pass: Just register the actor without relationships
        this.actors.set(id, { name, relations: [] });
    }

    private processActorGeneralizations(actor: any): void {
        const storedActor = this.actors.get(actor.id);
        if (!storedActor) return;

        const relations: string[] = [];

        // Handle generalizations (inheritance)
        if (actor.generalization) {
            actor.generalization.forEach((gen: any) => {
                if (gen.general?.$ref) {
                    const parentName = this.findActorNameById(gen.general.$ref);
                    if (parentName) {
                        relations.push(`"${actor.name}" --|> "${parentName}"`);
                    }
                }
            });
        }

        // Update the stored actor with its relationships
        storedActor.relations = relations;
    }

    private processComponent(component: any): void {
        if (!component.ownedUseCase) return;

        // First pass: Store use cases without relationships
        const useCases = component.ownedUseCase;
        useCases.forEach((useCase: any) => {
            this.useCases.set(useCase.id, {
                name: useCase.name,
                component: component.name,
                relations: []
            });
        });

        // Second pass: Process relationships now that all use cases are registered
        useCases.forEach((useCase: any) => {
            const storedUseCase = this.useCases.get(useCase.id);
            if (!storedUseCase) return;

            const relations: string[] = [];

            // Handle include relationships
            if (useCase.include) {
                useCase.include.forEach((inc: any) => {
                    const targetId = inc.addition?.$ref;
                    const targetName = targetId ? this.findUseCaseNameById(targetId) : undefined;
                    if (targetName) {
                        relations.push(`"${useCase.name}" ..> "${targetName}" : <<include>>`);
                    }
                });
            }

            // Handle extend relationships
            if (useCase.extend) {
                useCase.extend.forEach((ext: any) => {
                    const targetId = ext.extendedCase?.$ref;
                    const targetName = targetId ? this.findUseCaseNameById(targetId) : undefined;
                    if (targetName) {
                        relations.push(`"${useCase.name}" ..> "${targetName}" : <<extend>>`);
                    }
                });
            }

            // Update the stored use case with its relationships
            storedUseCase.relations = relations;
        });
    }

    private processAssociation(association: any): void {
        if (!association.memberEnd || association.memberEnd.length !== 2) return;

        const end1Ref = association.memberEnd[0].$ref;
        const end2Ref = association.memberEnd[1].$ref;

        const ownedEnds = association.ownedEnd || [];
        const end1 = ownedEnds.find((end: any) => end.id === end1Ref);
        const end2 = ownedEnds.find((end: any) => end.id === end2Ref);

        if (!end1?.type?.$ref || !end2?.type?.$ref) return;

        const [actorEnd, useCaseEnd] = end1.type.$ref.includes('#//Actor') ? [end1, end2] : [end2, end1];

        if (actorEnd?.type?.$ref && useCaseEnd?.type?.$ref) {
            const actorName = this.findActorNameById(actorEnd.type.$ref);
            const useCaseName = this.findUseCaseNameById(useCaseEnd.type.$ref);
            if (actorName && useCaseName) {
                this.associations.push(`"${actorName}" -- "${useCaseName}"`);
            }
        }
    }

    private findActorNameById(id: string): string | undefined {
        return this.actors.get(id)?.name;
    }

    private findUseCaseNameById(id: string): string | undefined {
        return this.useCases.get(id)?.name;
    }

    private generatePlantUMLCode(): string {
        const lines: string[] = ['@startuml'];

        // Add actors
        for (const [_, actor] of this.actors) {
            lines.push(`actor "${actor.name}"`);
        }

        // Add components with use cases
        const componentMap = new Map<string, string[]>();
        for (const [_, useCase] of this.useCases) {
            if (!componentMap.has(useCase.component)) {
                componentMap.set(useCase.component, []);
            }
            componentMap.get(useCase.component)?.push(`  usecase "${useCase.name}"`);
        }

        for (const [component, useCases] of componentMap) {
            lines.push(`rectangle "${component}" {`);
            lines.push(...useCases);
            lines.push('}');
        }

        // Add all relationships
        for (const [_, actor] of this.actors) {
            lines.push(...actor.relations);
        }

        for (const [_, useCase] of this.useCases) {
            lines.push(...useCase.relations);
        }

        lines.push(...this.associations);
        lines.push('@enduml');

        return lines.join('\n');
    }
}
