import { JavaMethod, JavaClass, AccessLevel } from './types';

/**
 * Parser for Java source code to extract methods and class structure
 */
export class JavaParser {
    private source: string;
    private pos: number = 0;

    constructor(source: string) {
        this.source = source;
    }

    /**
     * Parse the Java source and extract class structure
     */
    parse(): JavaClass | null {
        const className = this.findClassName();
        if (!className) {
            return null;
        }

        const methods = this.extractMethods(className);
        const { preMethodsContent, postMethodsContent } = this.extractNonMethodContent(methods);

        return {
            name: className,
            preMethodsContent,
            methods,
            postMethodsContent
        };
    }

    /**
     * Find the main class name in the source
     */
    private findClassName(): string | null {
        const classPattern = /(?:public\s+)?(?:abstract\s+)?(?:final\s+)?class\s+(\w+)/;
        const match = this.source.match(classPattern);
        return match ? match[1] : null;
    }

    /**
     * Extract all methods from the source
     */
    private extractMethods(className: string): JavaMethod[] {
        const methods: JavaMethod[] = [];
        const methodPattern = this.createMethodPattern(className);
        
        let match;
        let lastIndex = 0;
        const regex = new RegExp(methodPattern, 'g');
        
        while ((match = regex.exec(this.source)) !== null) {
            const methodStart = match.index;
            const leadingContent = this.extractLeadingContent(methodStart, lastIndex);
            const bodyStart = this.source.indexOf('{', match.index + match[0].length - 1);
            
            if (bodyStart === -1) {
                // Abstract method or interface method
                const semicolon = this.source.indexOf(';', match.index);
                if (semicolon !== -1) {
                    const method = this.createMethodFromAbstract(match, methodStart, semicolon + 1, leadingContent, className);
                    methods.push(method);
                    lastIndex = semicolon + 1;
                }
                continue;
            }

            const bodyEnd = this.findMatchingBrace(bodyStart);
            if (bodyEnd === -1) {
                continue;
            }

            const method = this.createMethod(match, methodStart, bodyEnd + 1, leadingContent, className);
            methods.push(method);
            lastIndex = bodyEnd + 1;
            regex.lastIndex = lastIndex;
        }

        // Set original positions
        methods.forEach((method, index) => {
            method.originalPosition = index;
        });

        return methods;
    }

    /**
     * Create regex pattern to match method declarations
     */
    private createMethodPattern(className: string): string {
        // Match method modifiers, return type, name, and parameters
        const modifiers = '(?:(?:public|protected|private|static|final|abstract|synchronized|native|strictfp)\\s+)*';
        const typeParams = '(?:<[^>]+>\\s+)?';
        const returnType = '(?:[\\w\\[\\]<>,\\s\\.]+\\s+)?';
        const methodName = `(${className}|\\w+)`;
        const params = '\\s*\\([^)]*\\)';
        const throwsClause = '(?:\\s+throws\\s+[\\w\\s,\\.]+)?';
        const bodyOrSemi = '(?:\\s*\\{|\\s*;)';
        
        return `${modifiers}${typeParams}${returnType}${methodName}${params}${throwsClause}${bodyOrSemi}`;
    }

    /**
     * Extract leading comments and annotations before a method
     */
    private extractLeadingContent(methodStart: number, searchStart: number): string {
        // Look backwards from methodStart to find comments and annotations
        const textBefore = this.source.substring(searchStart, methodStart);
        
        // Find the last newline before annotations/comments
        const lines = textBefore.split('\n');
        const leadingLines: string[] = [];
        
        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('*') || line.startsWith('/*') || line.startsWith('//') || 
                line.startsWith('@') || line === '' || line.startsWith('*/')) {
                leadingLines.unshift(lines[i]);
            } else {
                break;
            }
        }
        
        return leadingLines.join('\n');
    }

    /**
     * Find the matching closing brace for an opening brace
     */
    private findMatchingBrace(openPos: number): number {
        let depth = 0;
        let inString = false;
        let inChar = false;
        let inLineComment = false;
        let inBlockComment = false;
        let prevChar = '';

        for (let i = openPos; i < this.source.length; i++) {
            const char = this.source[i];
            const nextChar = this.source[i + 1] || '';

            // Handle comments
            if (!inString && !inChar) {
                if (!inLineComment && !inBlockComment && char === '/' && nextChar === '/') {
                    inLineComment = true;
                    i++;
                    continue;
                }
                if (!inLineComment && !inBlockComment && char === '/' && nextChar === '*') {
                    inBlockComment = true;
                    i++;
                    continue;
                }
                if (inLineComment && char === '\n') {
                    inLineComment = false;
                    continue;
                }
                if (inBlockComment && char === '*' && nextChar === '/') {
                    inBlockComment = false;
                    i++;
                    continue;
                }
            }

            if (inLineComment || inBlockComment) {
                prevChar = char;
                continue;
            }

            // Handle strings and chars
            if (char === '"' && prevChar !== '\\' && !inChar) {
                inString = !inString;
            }
            if (char === "'" && prevChar !== '\\' && !inString) {
                inChar = !inChar;
            }

            if (!inString && !inChar) {
                if (char === '{') {
                    depth++;
                } else if (char === '}') {
                    depth--;
                    if (depth === 0) {
                        return i;
                    }
                }
            }

            prevChar = char;
        }

        return -1;
    }

    /**
     * Create a JavaMethod object from a regex match
     */
    private createMethod(
        match: RegExpExecArray,
        startPos: number,
        endPos: number,
        leadingContent: string,
        className: string
    ): JavaMethod {
        const fullText = this.source.substring(startPos, endPos);
        const declaration = match[0];
        const name = match[1];
        const isConstructor = name === className;
        
        return {
            fullText,
            name,
            signature: this.extractSignature(declaration),
            accessLevel: this.extractAccessLevel(declaration),
            isConstructor,
            isStatic: declaration.includes('static '),
            originalPosition: 0,
            leadingContent,
            bodyContent: this.source.substring(this.source.indexOf('{', startPos), endPos),
            calledMethods: this.extractCalledMethods(this.source.substring(startPos, endPos)),
            isGetter: this.isGetterMethod(name, declaration),
            isSetter: this.isSetterMethod(name, declaration),
            startPos,
            endPos
        };
    }

    /**
     * Create a JavaMethod object from an abstract method declaration
     */
    private createMethodFromAbstract(
        match: RegExpExecArray,
        startPos: number,
        endPos: number,
        leadingContent: string,
        className: string
    ): JavaMethod {
        const fullText = this.source.substring(startPos, endPos);
        const declaration = match[0];
        const name = match[1];
        const isConstructor = name === className;
        
        return {
            fullText,
            name,
            signature: this.extractSignature(declaration),
            accessLevel: this.extractAccessLevel(declaration),
            isConstructor,
            isStatic: declaration.includes('static '),
            originalPosition: 0,
            leadingContent,
            bodyContent: '',
            calledMethods: [],
            isGetter: this.isGetterMethod(name, declaration),
            isSetter: this.isSetterMethod(name, declaration),
            startPos,
            endPos
        };
    }

    /**
     * Extract method signature from declaration
     */
    private extractSignature(declaration: string): string {
        const match = declaration.match(/(\w+)\s*\([^)]*\)/);
        return match ? match[0] : '';
    }

    /**
     * Extract access level from method declaration
     */
    private extractAccessLevel(declaration: string): AccessLevel {
        if (declaration.includes('public ')) {
            return AccessLevel.PUBLIC;
        }
        if (declaration.includes('protected ')) {
            return AccessLevel.PROTECTED;
        }
        if (declaration.includes('private ')) {
            return AccessLevel.PRIVATE;
        }
        return AccessLevel.PACKAGE;
    }

    /**
     * Extract names of methods called within this method
     */
    private extractCalledMethods(methodBody: string): string[] {
        const called: Set<string> = new Set();
        // Match method calls: methodName( or this.methodName(
        const callPattern = /(?:this\.)?(\w+)\s*\(/g;
        let match;
        
        while ((match = callPattern.exec(methodBody)) !== null) {
            const methodName = match[1];
            // Exclude common keywords and the method itself
            if (!['if', 'for', 'while', 'switch', 'catch', 'synchronized', 'new', 'return'].includes(methodName)) {
                called.add(methodName);
            }
        }
        
        return Array.from(called);
    }

    /**
     * Check if method is a getter
     */
    private isGetterMethod(name: string, declaration: string): boolean {
        return (name.startsWith('get') || name.startsWith('is')) && 
               declaration.includes('()') && 
               !declaration.includes('void');
    }

    /**
     * Check if method is a setter
     */
    private isSetterMethod(name: string, declaration: string): boolean {
        return name.startsWith('set') && declaration.includes('void');
    }

    /**
     * Extract content before and after methods
     */
    private extractNonMethodContent(methods: JavaMethod[]): { preMethodsContent: string; postMethodsContent: string } {
        if (methods.length === 0) {
            return { preMethodsContent: this.source, postMethodsContent: '' };
        }

        // Find the start of the first method (including its leading content)
        let firstMethodStart = methods[0].startPos;
        const leadingContent = methods[0].leadingContent;
        if (leadingContent) {
            const leadingIndex = this.source.lastIndexOf(leadingContent.trim(), firstMethodStart);
            if (leadingIndex !== -1) {
                firstMethodStart = leadingIndex;
            }
        }

        const lastMethodEnd = methods[methods.length - 1].endPos;

        return {
            preMethodsContent: this.source.substring(0, firstMethodStart),
            postMethodsContent: this.source.substring(lastMethodEnd)
        };
    }
}
