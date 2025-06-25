# PlantUML Export Feature - Technical Documentation

## Overview

This document describes the implementation of the PlantUML export feature for bigUML, which allows users to export their UML diagrams from bigUML to PlantUML format. It supports all UML diagram types that are supported in both bigUML and PlantUML.

### Supported Diagram Types

- [x] **Class Diagram**

- [x] **Activity Diagram**

- [x] **Deployment Diagrams**

- [x] **State Machine Diagrams**

- [x] **Use Case Diagrams**

## Architecture

### Core Components

1. **ExportToPlantUMLActionHandler** - Main handler that orchestrates the export process

2. **PlantUMLParserFactory** - Factory class that provides diagram-specific parsers

3. **BaseDiagramParser** - Abstract base class for all diagram parsers with common logic and interfaces

4. **Specialized Parsers** - Individual parsers for each supported diagram type

## Implementation Details

### General Parsing Approach

The core parsing strategy is to traverse the JSON model twice:

1. **Element Collection**: Traverse the model structure to identify and collect all diagram elements (classes, nodes, actors, etc.).

```typescript
export type Element = { id: string; name: string; type: string; parentId?: string; stereotype?: string };
```

2. **Relationship Collection**: Traverse the model again to identify and collect all relationships between elements.

```typescript
export type Relationship = { source: string; target: string; type: string; label?: string };
```

This approach aligns with PlantUML's syntax structure, where elements are typically defined first, followed by their relationships.

Since every diagram type has a different type of JSON structure, each parser implements or defines the following:

```typescript
protected  abstract  childProps:  readonly  string[];
```

This array holds a list of property names that include nested children of elements in this diagram type, used to traverse the JSON structure

```typescript
protected  abstract  arrowMap:  Record<string, string>;
```

This map specifies the names and type for the arrows that are used in the relationships of this diagram type

```typescript
protected  abstract  visitElement: (el:  any) =>  void;
protected  abstract  visitRelations: (el:  any) =>  void;
```

These functions are called to traverse the JSON and specify when an object is added to the element or relationship map

### Export Process Flow

1. **Trigger Export**: User invokes the export command through VS Code

2. **Model Retrieval**: Handler extracts the current model state from GLSP server

3. **Diagram Detection**: System analyzes model structure to identify diagram type

4. **Parser Selection**: Factory provides appropriate parser based on diagram type

5. **Model Parsing**: Parser converts internal model to PlantUML syntax

6. **File Export**: User selects save location and file is written

### Design

#### Factory Pattern

```typescript
export class PlantUMLParserFactory {
    static getParser(diagramType: string): BaseDiagramParser {
        switch (diagramType.toLowerCase()) {
            case 'class':
                return new ClassDiagramParser();

            case 'activity':
                return new ActivityDiagramParser();

            // ... other cases
        }
    }
}
```

#### Template Method Pattern

The `BaseDiagramParser` defines the common parsing structure while allowing specialized implementations:

- `visitElement()` - Process individual model elements

- `visitRelations()` - Handle relationships between elements

- `renderPlantUml()` - Generate final PlantUML output

#### Activity Diagram Parser

Unlike other parsers, the activity parser uses a **traversal-based approach**:

- Starts from initial node and follows control flow

- Recursively processes paths through the activity

- Handles complex structures like forks, joins, decisions, and merges

- Uses branch exit mapping to manage flow convergence

```typescript

// Activity parser uses recursive traversal instead of element iteration

private traverse(current: Element, lines: string[], visited: Set<string>) {

// Process current element and follow outgoing relationships

switch (current.type) {

case 'ForkNode':

lines.push('fork');

// Process all parallel paths

break;

case 'DecisionNode':

lines.push('switch ()');

// Process all decision branches

break;

}

}

```

## Problems Encountered

### 1. JSON Structure Complexity

**Problem**: BigUML JSON is not supposed to be human readable, so different relationships, elements and diagram types can not be parsed in the same way
Example of three class relationships, that have to be parsed differently

```typescript
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
    const s = el.id;
    const t = g.general?.$ref;
    if (s && t) this.relationships.push({ source: s, target: t, type: 'generalization' });
}
```

**Solution**: Implemented a base parser that provides interfaces that all diagram-specific parsers implement with their own logic

### 2. Unique names

**Problem**: In PlantUML each element needs a unique name, which is not the case in BigUML

**Solution**: Before adding a new element we check if the name already exists, if it does we create a unique name by appending **counter** that is then increased

### 3. Activity Diagram

**Problem**: Activity diagrams work different than the other diagrams and require sequential flow instead of an element listing

**Solution**: Developed a custom traversal algorithm that starts at the Initial Node and follows all control flow paths

### 4. BigUML and PlantUML Diagram differences

**Problem**: The same diagram type does not always have the same elements or relationships

**Solution**: Implemented all elements and relationships that BigUML provides and mapped them to a similar PlantUML representation (e.g.: Regions only exist in BigUML state machines - create classes with name 'region' instead)

## Current Limitations

### Missing Features

1. **Type safety** - The diagrams are parsed without type safety

2. **Logging** - The logging does not include if an element or relationship could not be parsed (Difficult because JSON often includes redundant information and we want to skip on purpose)

3. **Validation** - No validation if generated PlantUML syntax is correct and compiles

## Future Work

- **Error Handling and logging** - Improve error messages and logging

- **Validation** - Validate PlantUML syntax after parsing to catch errors

- **Auto-export** Auto-export on file save to update an already exported diagram

- **Configuration** User-configurable export options like styling or arrow orientations

## Usage Examples

### Basic Export

1. Open a UML diagram in bigUML

2. Use Command Palette (Ctrl+Shift+P)

3. Run "Export to PlantUML" command

4. Select save location

5. PlantUML (.puml) file is generated

## Technical Notes

### File Structure

```

src/

├── vscode/

│ └── export-to-plantUML.handler.ts # Main handler

├── common/

│ ├── plantuml-export-parser.ts # Parser factory

│ └── export-parser/

│ ├── base-parser.ts # Base parser class

│ ├── class-parser.ts # Class diagram parser

│ ├── activity-parser.ts # Activity diagram parser

│ └── ... # Other specialized parsers

```

## Feedback and additional info

### Bugs

- Deployment Diagram - **device**:a Element breaks the diagram
- Deployment Diagram - **CommunicationPath**: Deleting adds embedding into nodes
- Use Case Diagram - **Actor** have a very small click box when trying to add an Association and Generalization
- Activity Diagram - Some elements can be added to activities without activity partitions like Initial and Final nodes. Sometimes adding them and refreshing makes them disappear, but still be visible in the diagram outline. Sometimes it breaks diagram like when adding edges between them and refreshing.
- All Diagrams - Pressing "n" changes to primary navigation which disrupts typing until **ESC** is pressed (e.g.: when changing the name of an element)

### Onboarding difficulties

Getting a new package to successfully be integrated is difficult. There are a lot of different files where something needs to be added to, or exported from (**package.json**, **uml-starter.ts**, **extension.config.ts**). We just added the imports everywhere we found the BigHelloWorld Module or Action by CTRL + F through the entire codebase, but if there is an edge case or you need to do something different - it becomes difficult. Also the documentation was not easy to find, having one single source of truth that goes through the basics and also lists the common pitfalls would be a great addition.
