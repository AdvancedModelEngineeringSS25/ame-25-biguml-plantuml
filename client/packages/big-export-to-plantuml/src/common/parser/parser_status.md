# PlantUML Export Parsers Progress

## Class Diagram

| Tool                  | Status | Notes |
| --------------------- | ------ | ----- |
| Abstract Class        | ❌     |       |
| Class                 | ✅     |       |
| Data Type             | ❌     |       |
| Enumeration           | ✅     |       |
| Interface             | ✅     |       |
| Package               | ❌     |       |
| Primitive Type        | ❌     |       |
| Enumeration Literal   | ❌     |       |
| Operation             | ✅     |       |
| Property              | ✅     |       |
| Slot                  | ❌     |       |
| Abstraction           | ❌     |       |
| Aggregation           | ❌     |       |
| Association           | ❌     |       |
| Composition           | ❌     |       |
| Dependency            | ❌     |       |
| Element Import        | ❌     |       |
| Generalization        | ❌     |       |
| Interface Realization | ✅     |       |
| Package Import        | ❌     |       |
| Package Merge         | ❌     |       |
| Realization           | ❌     |       |
| Substitution          | ❌     |       |
| Usage                 | ✅     |       |

---

## Deployment Diagram

| Tool                    | Status | Notes                                                                       |
| ----------------------- | ------ | --------------------------------------------------------------------------- |
| Artifact                | ✅     |                                                                             |
| DeploymentSpecification | ❌     |                                                                             |
| Device                  | ❌     | Bug: Breaks the diagram                                                     |
| ExecutionEnvironment    | ❌     |                                                                             |
| Model                   | ❌     |                                                                             |
| Node                    | ✅     |                                                                             |
| Package                 | ❌     |                                                                             |
| Operation               | ❌     |                                                                             |
| Property                | ❌     |                                                                             |
| CommunicationPath       | 🛠️     | Bug: Deleting causes embedding into nodes, values not supported in PlantUml |
| Dependency              | ✅     |                                                                             |
| Deployment              | ✅     |                                                                             |
| Generalization          | ✅     |                                                                             |
| Manifestation           | ✅     |                                                                             |

---

## State Machine Diagram

| Tool           | Status | Notes                                                      |
| -------------- | ------ | ---------------------------------------------------------- |
| Region         | 🛠️     | Same as concurrent State? Required for diagram to function |
| State          | ✅     |                                                            |
| StateMachine   | ✅     |                                                            |
| Choice         | ✅     |                                                            |
| DeepHistory    | ✅     |                                                            |
| FinalState     | ✅     |                                                            |
| Fork           | ✅     |                                                            |
| InitialState   | ✅     | No "kind"                                                  |
| Join           | ✅     |                                                            |
| ShallowHistory | ✅     |                                                            |
| Transition     | ✅     |                                                            |

---

## Activity Diagram

| Tool                | Status | Notes |
| ------------------- | ------ | ----- |
| Accept Event Action | ❌     |       |
| Action              | ✅     |       |
| Send Signal Action  | ❌     |       |
| Activity            | ✅     |       |
| Activity Partition  | 🛠️     |       |
| Activity Final Node | ✅     |       |
| Decision Node       | ✅     |       |
| Flow Final Node     | ✅     |       |
| Fork Node           | ❌     |       |
| Initial Node        | ✅     |       |
| Join Node           | ❌     |       |
| Merge Node          | ❌     |       |
| Edge                | ✅     |       |
| Activity Parameter  | ❌     |       |
| Central Buffer Node | ❌     |       |
| Input Pin           | ❌     |       |
| Output Pin          | ❌     |       |

### Additional Notes

- Nodes must be created inside an activity partition, which itself must be inside an activity container.
- Nodes can be placed directly in the activity container, but they disappear or break after reload.
- Nodes not shown in the container still exist in the outline, but cannot be deleted from there.

---

## General

- When entering a name for a new element, pressing "N" switches to the primary navigation.
- In PlantUML every object needs a unique name, how to handle same names?
