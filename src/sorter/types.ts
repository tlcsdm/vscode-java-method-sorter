/**
 * Sorting options for the Java method sorter
 */
export interface SortingOptions {
    /** Invocation ordering strategy: 'depth-first' or 'breadth-first' */
    sortingStrategy: string;
    /** Apply heuristics to determine start points for invocation ordering */
    applyWorkingListHeuristics: boolean;
    /** Respect before/after relation in method ordering */
    respectBeforeAfterRelation: boolean;
    /** Keep overloaded methods together */
    clusterOverloadedMethods: boolean;
    /** Keep getter and setter methods together */
    clusterGetterSetter: boolean;
    /** Separate methods by access level */
    separateByAccessLevel: boolean;
    /** Separate constructors from other methods */
    separateConstructors: boolean;
    /** Apply lexical (alphabetical) ordering as a secondary sort */
    applyLexicalOrdering: boolean;
}

/**
 * Access level for Java members
 */
export enum AccessLevel {
    PUBLIC = 0,
    PROTECTED = 1,
    PACKAGE = 2,
    PRIVATE = 3
}

/**
 * Represents a parsed Java method
 */
export interface JavaMethod {
    /** Full text of the method including comments and annotations */
    fullText: string;
    /** Method name */
    name: string;
    /** Method signature (name + parameters) */
    signature: string;
    /** Access level */
    accessLevel: AccessLevel;
    /** Is this a constructor */
    isConstructor: boolean;
    /** Is this a static method */
    isStatic: boolean;
    /** Original position in source */
    originalPosition: number;
    /** Leading comments and annotations */
    leadingContent: string;
    /** Method body content */
    bodyContent: string;
    /** Methods called by this method */
    calledMethods: string[];
    /** Is this a getter method */
    isGetter: boolean;
    /** Is this a setter method */
    isSetter: boolean;
    /** Start position in source */
    startPos: number;
    /** End position in source */
    endPos: number;
}

/**
 * Represents a parsed Java class
 */
export interface JavaClass {
    /** Class name */
    name: string;
    /** Content before methods (package, imports, class declaration, fields) */
    preMethodsContent: string;
    /** Methods in the class */
    methods: JavaMethod[];
    /** Content after methods (closing brace, trailing content) */
    postMethodsContent: string;
}
