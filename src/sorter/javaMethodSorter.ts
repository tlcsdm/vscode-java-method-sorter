import { JavaMethod, SortingOptions } from './types';
import { JavaParser } from './javaParser';

/**
 * Java Method Sorter - sorts methods in Java classes to increase code readability
 * 
 * Based on the eclipse-method-sorter plugin approach, this sorter provides techniques
 * to sort methods following clean code principles.
 */
export class JavaMethodSorter {
    private options: SortingOptions;

    constructor(options: SortingOptions) {
        this.options = options;
    }

    /**
     * Sort methods in the given Java source code
     */
    sort(source: string): string {
        const parser = new JavaParser(source);
        const javaClass = parser.parse();

        if (!javaClass || javaClass.methods.length === 0) {
            return source;
        }

        const sortedMethods = this.sortMethods(javaClass.methods);
        return this.reconstructSource(javaClass.preMethodsContent, sortedMethods, javaClass.postMethodsContent);
    }

    /**
     * Shuffle methods randomly in the given Java source code
     */
    shuffleRandomly(source: string): string {
        const parser = new JavaParser(source);
        const javaClass = parser.parse();

        if (!javaClass || javaClass.methods.length === 0) {
            return source;
        }

        const shuffledMethods = this.shuffleArray([...javaClass.methods]);
        return this.reconstructSource(javaClass.preMethodsContent, shuffledMethods, javaClass.postMethodsContent);
    }

    /**
     * Sort methods according to configured options
     */
    private sortMethods(methods: JavaMethod[]): JavaMethod[] {
        let sorted = [...methods];

        // Build call graph for invocation-based sorting
        const callGraph = this.buildCallGraph(sorted);

        // Apply sorting based on options
        sorted.sort((a, b) => this.compareMethodsFull(a, b, callGraph));

        // Apply clustering if enabled
        if (this.options.clusterOverloadedMethods) {
            sorted = this.clusterOverloadedMethods(sorted);
        }

        if (this.options.clusterGetterSetter) {
            sorted = this.clusterGetterSetterMethods(sorted);
        }

        return sorted;
    }

    /**
     * Full comparison of two methods using all configured criteria
     */
    private compareMethodsFull(a: JavaMethod, b: JavaMethod, callGraph: Map<string, Set<string>>): number {
        // 1. Constructors first (if enabled)
        if (this.options.separateConstructors) {
            if (a.isConstructor && !b.isConstructor) {return -1;}
            if (!a.isConstructor && b.isConstructor) {return 1;}
        }

        // 2. Static methods (static initializers and static methods together)
        if (a.isStatic && !b.isStatic) {return -1;}
        if (!a.isStatic && b.isStatic) {return 1;}

        // 3. Access level ordering (if enabled)
        if (this.options.separateByAccessLevel) {
            const accessDiff = a.accessLevel - b.accessLevel;
            if (accessDiff !== 0) {return accessDiff;}
        }

        // 4. Invocation ordering
        if (this.options.respectBeforeAfterRelation) {
            const invocationOrder = this.compareByInvocation(a, b, callGraph);
            if (invocationOrder !== 0) {return invocationOrder;}
        }

        // 5. Lexical ordering (if enabled)
        if (this.options.applyLexicalOrdering) {
            const lexicalDiff = a.name.localeCompare(b.name);
            if (lexicalDiff !== 0) {return lexicalDiff;}
        }

        // 6. Fall back to original position
        return a.originalPosition - b.originalPosition;
    }

    /**
     * Compare methods based on invocation relationship
     * Methods that call other methods should come before the methods they call
     */
    private compareByInvocation(a: JavaMethod, b: JavaMethod, callGraph: Map<string, Set<string>>): number {
        const aCalls = callGraph.get(a.name);
        const bCalls = callGraph.get(b.name);

        // If a calls b, a should come first
        if (aCalls?.has(b.name)) {
            return -1;
        }
        // If b calls a, b should come first
        if (bCalls?.has(a.name)) {
            return 1;
        }

        // Check transitive calls (depth-first approach)
        if (this.options.sortingStrategy === 'depth-first') {
            if (this.transitivelyCallsMethod(a.name, b.name, callGraph, new Set())) {
                return -1;
            }
            if (this.transitivelyCallsMethod(b.name, a.name, callGraph, new Set())) {
                return 1;
            }
        }

        return 0;
    }

    /**
     * Check if method A transitively calls method B
     */
    private transitivelyCallsMethod(
        methodA: string, 
        methodB: string, 
        callGraph: Map<string, Set<string>>,
        visited: Set<string>
    ): boolean {
        if (visited.has(methodA)) {
            return false;
        }
        visited.add(methodA);

        const calls = callGraph.get(methodA);
        if (!calls) {
            return false;
        }

        if (calls.has(methodB)) {
            return true;
        }

        for (const calledMethod of calls) {
            if (this.transitivelyCallsMethod(calledMethod, methodB, callGraph, visited)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Build a call graph from the methods
     */
    private buildCallGraph(methods: JavaMethod[]): Map<string, Set<string>> {
        const callGraph = new Map<string, Set<string>>();
        const methodNames = new Set(methods.map(m => m.name));

        for (const method of methods) {
            const calls = new Set<string>();
            for (const called of method.calledMethods) {
                // Only include calls to methods in this class
                if (methodNames.has(called) && called !== method.name) {
                    calls.add(called);
                }
            }
            callGraph.set(method.name, calls);
        }

        return callGraph;
    }

    /**
     * Cluster overloaded methods together
     */
    private clusterOverloadedMethods(methods: JavaMethod[]): JavaMethod[] {
        const clusters = new Map<string, JavaMethod[]>();
        const orderedNames: string[] = [];

        for (const method of methods) {
            const baseName = method.name;
            if (!clusters.has(baseName)) {
                clusters.set(baseName, []);
                orderedNames.push(baseName);
            }
            clusters.get(baseName)!.push(method);
        }

        const result: JavaMethod[] = [];
        for (const name of orderedNames) {
            result.push(...clusters.get(name)!);
        }

        return result;
    }

    /**
     * Cluster getter and setter methods together
     */
    private clusterGetterSetterMethods(methods: JavaMethod[]): JavaMethod[] {
        const result: JavaMethod[] = [];
        const processed = new Set<number>();

        for (let i = 0; i < methods.length; i++) {
            if (processed.has(i)) {continue;}

            const method = methods[i];
            result.push(method);
            processed.add(i);

            // If it's a getter, look for corresponding setter
            if (method.isGetter) {
                const fieldName = this.extractFieldNameFromGetter(method.name);
                const setterName = 'set' + fieldName;
                
                for (let j = i + 1; j < methods.length; j++) {
                    if (!processed.has(j) && methods[j].name === setterName) {
                        result.push(methods[j]);
                        processed.add(j);
                        break;
                    }
                }
            }

            // If it's a setter, look for corresponding getter
            if (method.isSetter && !method.isGetter) {
                const fieldName = this.extractFieldNameFromSetter(method.name);
                const getterName = 'get' + fieldName;
                const boolGetterName = 'is' + fieldName;
                
                for (let j = i + 1; j < methods.length; j++) {
                    if (!processed.has(j) && 
                        (methods[j].name === getterName || methods[j].name === boolGetterName)) {
                        result.push(methods[j]);
                        processed.add(j);
                        break;
                    }
                }
            }
        }

        return result;
    }

    /**
     * Extract field name from getter method name
     */
    private extractFieldNameFromGetter(methodName: string): string {
        if (methodName.startsWith('get')) {
            return methodName.substring(3);
        }
        if (methodName.startsWith('is')) {
            return methodName.substring(2);
        }
        return methodName;
    }

    /**
     * Extract field name from setter method name
     */
    private extractFieldNameFromSetter(methodName: string): string {
        if (methodName.startsWith('set')) {
            return methodName.substring(3);
        }
        return methodName;
    }

    /**
     * Reconstruct the source from sorted methods
     */
    private reconstructSource(preContent: string, methods: JavaMethod[], postContent: string): string {
        const methodTexts = methods.map(m => {
            // Normalize fullText: remove leading newlines but preserve indentation
            const normalizedFullText = m.fullText.replace(/^\n+/, '');
            
            // Preserve leading content with indentation, only trim leading blank lines
            // This keeps the comment/annotation indentation intact
            const leading = m.leadingContent.replace(/^\n+/, '');
            if (leading.trim()) {
                return leading + normalizedFullText;
            }
            return normalizedFullText;
        });

        // Normalize preContent: remove trailing whitespace and excess newlines
        // Add consistent single blank line before first method
        const normalizedPreContent = preContent.replace(/\s+$/, '') + '\n\n';

        return normalizedPreContent + methodTexts.join('\n\n') + postContent;
    }

    /**
     * Fisher-Yates shuffle algorithm
     */
    private shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}
