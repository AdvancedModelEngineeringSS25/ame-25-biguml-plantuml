# 1. GLSP & bigUML
GLSP is an extensible client-server framework to develop web based diagram editors, developed by the eclipse foundation. The client renders and handles user interaction, the server encapsulates language features. The server maps a source model (e.g. JSON) into a graph model, consisting as nodes and models. The client renders the components of the graph model into a visual representation. 
The GLSP protocol standardizes communication between client and server by using action messages. 
GLSP uses Google Guice to allow more flexibility with reusable feature modules based on dependency injection. @Inject statements decouple component configuration from implementation by managing object creation internally. It is done so by defining explicit bindings between abstractions and their implementations in DI modules. @Overrides allow us to replace default behaviours. An example of this inversion control is model management, as we could for example switch out the model used (e.g. JSON) to another form of representation allowing integration with diverse backends. Further, this feature enables better scalability as adding new features becomes easier.

The architecture of GLSP is split up into the packages Core, Elements and Features
    - Core modifies GLSP to fit to specific needs. Important subpackages are Model (containing blueprints for diagrams, graphical elements and commands, instructions that are specific actions).
    -> Actions are the means of communication and internal event flow of GLSP. Any service can issue actions by invoking the action dispatcher, which is located both on the client and the server. This dispatcher chooses whether an action is handled by the internal action handler or submitted to the opposite component. It further distinguishes between notifications and request responses. Typically actions are issued by the client in a fire and forget manner. They can be of blocking nature tho, holding until the server sends a corresponding response action. Actions can be overwritten, replaced or added to the graphical language server protocol.
    -> Operations are special actions. if an action is intended to change the underlying source model on the server, that action is a model operation, short, operation.

    - Elements exposes base classes to handle elements used in the diagram. Individual implementations will usually extend these classes.

    - Features contain new complex functionalities that arent found in the standard GLSP. 


bigUML is an open source UML modeling tool build as a VS Code extension leveraging GLSP to provide a seamless web-based modeling tool. The Client side provides the user interface within VSCode that handles rendering of the diagrams and invokes client side statements. The server then handles the language-specific functionalities. bigUML introduces additional functionalities beyond GLSPs base capabilities. Examples include end-to-end testing support or improved accessibility.
Currently bigUML supports the following UML Diagrams: 
Activity Diagram, Class Diagram, Communication Diagram, Deployment Diagram, Information Flow Diagram, Package Diagram, Sequence Diagram, State Machine Diagram, Use Case Diagram.

# 2. VSCode Extensions

VS Code was build with the intention to be extensible throughout multiple programming languages and tooling through a comprehensive Extension API. With this API its possible to include new commands, menus or views for example. Commands of VS Code can be then executed using a command palette, shortcuts or keybinds.

Core Concepts of VS Code extensions are:
    - Extension Manifest; Defines metadata of our extension and contributions (commands, menus, settings etc)
    - Activation; Extensions need to be activated, this can be on event occurance or API invocations
    - Commands; Extensions regiser commands that user can invoke via the "Command Palette" (Shift+Ctrl+P)
    - Webviews; Allow display of custom HTML/CSS/JS content inside of VS Code

To create new VS Code extensions, one might use the Yeoman generator. However, for our project we are given an example extention called "Hello-World" that we can use for our needs.

# 3. Setup Project

To setup this project we need to first clone both repositories given
    bigGLSP:https://github.com/AdvancedModelEngineeringSS25/ame-25-bigglsp-plantuml
    bigUML:https://github.com/AdvancedModelEngineeringSS25/ame-25-biguml-plantuml/tree/main

Then in the bigGLSP repo, go into /plugins/bigGLSP-server-java/ and use ./gradlew build to run the integrated gradlewrapper and to build the GLSP project.

Afterwards, in the bigUML repository, go into /server/ and use ./gradlew clean build and afterwards ./gradlew run to start the server

Then lastly we go to the bigUML repository into /client/ and use npm i to install dependencies and then npm run build to build the client. Then in the console type "code ." to start a new instance of VS Code that should make it able to run & debug the bigUML extension framework.

# 4. Explore Codebase

# 5. PlantUML
PlantUML is an open source tool allowing the user to create a variety of diagrams, including UML diagrams by using simple text-based syntax. PlantUML then renders this syntax into graphical formats that are exportable into PNG, SVG or Ascii representations.
Supported diagrams include: Sequence, Use Case, Class, Activity, Component, Deployment, State and Object diagrams. Further non UML diagrams are: Gantt charts, Mind Maps, Entity-Relationship diagrams, archimate diagrams, network diagrams and more.

The diagrams bigUML supports, but plantUML does not support are: Communication diagram, Information Flow diagram and Package diagram.

On the other hand, the diagrams that plantUML supports, but bigUML does not support are: Object diagram, Component diagram, Deployment diagram and Timing diagram.

# 6. Task
bigUML could be enhanced with a feature to generate a PlantUML representation of a selected model. Moreover, in the opposite direction, an import of existing PlantUML models into bigUML and the corresponding initial rendering should be supported. 
We are supposed to build an intermediate model representation when importing, and it would likewise be easier to create such intermediate model also when exporting. For fetching the model from the server or to invoke actions to trigger node/edge creation, we are supposed to use the Action Dispatcher.

### Considerations:
    Export should allow us to select an export parth.

    Import should be imported into the active editor instance. New elements are created by triggering "CreateNodeOperation", "CreateEdgeOperation" and "UpdateElementProperty Action" inside the server.

    No webviews are necessary for this project.

## Aim:
    - For this task we are aiming to provide a quick to use, error free extension that allows the im-/export of bigUML to plantUML and vice versa. 
    - Not supported diagrams shall be identified by our tool and an appropriate message should be displayed.

## Potential Challenges:
    - bigUML and plantUML both have diagrams included that are not yet supported in the opposing tool. The im-/export of such diagrams needs to be handled properly.

## Potential Solutions:

# 7. Resources
Diagram Editors Boosted - bigUML introduction and new features presented https://www.youtube.com/watch?v=RBbI_QBzwl4

Documentation of the underlying bigGLSP framework: https://github.com/AdvancedModelEngineeringSS25/ame-25-bigglsp-plantuml/tree/main/docs

Actions and ActionHandler as described by eclipse: https://eclipse.dev/glsp/documentation/actionhandler/

Documentation of bigUML provided in githubclassroom: https://github.com/AdvancedModelEngineeringSS25/ame-25-biguml-plantuml/tree/main/client and https://github.com/AdvancedModelEngineeringSS25/ame-25-biguml-plantuml/blob/main/client/docs/README.md
-> Project Setup and Architecture Guide Link does not work

Communication in bigUML: https://github.com/borkdominik/bigUML/blob/main/client/docs/communication.md

bigUML introduction and creation of a new type: https://www.youtube.com/watch?v=9nV6k7qoVhc&list=PLABfRAf-emKo9t1d4N6XJhHiYJFU1eGrM&index=2 and https://www.youtube.com/watch?v=f_hN6o1-8ms

VSCode Extensions: https://code.visualstudio.com/api and https://code.visualstudio.com/api/get-started/your-first-extension