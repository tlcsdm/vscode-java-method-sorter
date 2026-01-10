import { JavaMethod, JavaClass, AccessLevel } from './types';

/**
 * Represents a region in source code that should be skipped
 */
interface SkipRegion {
    start: number;
    end: number;
}

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

        // Find the main class body boundaries
        const classBodyBounds = this.findMainClassBody(className);
        if (!classBodyBounds) {
            return null;
        }

        const methods = this.extractMethods(className, classBodyBounds);
        const { preMethodsContent, postMethodsContent } = this.extractNonMethodContent(methods, classBodyBounds);

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
     * Find the boundaries of the main class body
     */
    private findMainClassBody(className: string): { start: number; end: number; bodyStart: number } | null {
        // Find the main class declaration
        const classPattern = new RegExp(`(?:public\\s+)?(?:abstract\\s+)?(?:final\\s+)?class\\s+${className}\\s*(?:extends\\s+\\w+)?(?:\\s+implements\\s+[\\w\\s,]+)?\\s*\\{`);
        const match = this.source.match(classPattern);
        if (!match) {
            return null;
        }

        const classStart = match.index!;
        const bodyStart = classStart + match[0].length - 1; // Position of opening brace
        const bodyEnd = this.findMatchingBrace(bodyStart);

        if (bodyEnd === -1) {
            return null;
        }

        return { start: classStart, end: bodyEnd, bodyStart };
    }

    /**
     * Find all regions to skip: nested classes and initializer blocks
     */
    private findSkipRegions(classBodyBounds: { start: number; end: number; bodyStart: number }): SkipRegion[] {
        const skipRegions: SkipRegion[] = [];
        const bodyContent = this.source.substring(classBodyBounds.bodyStart + 1, classBodyBounds.end);
        const offset = classBodyBounds.bodyStart + 1;

        // Find nested classes (static and non-static inner classes)
        const nestedClassPattern = /(?:(?:public|protected|private|static|final|abstract)\s+)*class\s+\w+\s*(?:extends\s+\w+)?(?:\s+implements\s+[\w\s,]+)?\s*\{/g;
        let match;
        while ((match = nestedClassPattern.exec(bodyContent)) !== null) {
            const start = offset + match.index;
            const bracePos = start + match[0].length - 1;
            const end = this.findMatchingBrace(bracePos);
            if (end !== -1) {
                skipRegions.push({ start, end: end + 1 });
                // Skip past this class to avoid finding inner classes within inner classes
                nestedClassPattern.lastIndex = end - offset + 1;
            }
        }

        // Find static initializer blocks: "static {"
        const staticInitPattern = /\bstatic\s*\{/g;
        while ((match = staticInitPattern.exec(bodyContent)) !== null) {
            // Make sure this is a standalone static block, not "static class" or "static method"
            const beforeMatch = bodyContent.substring(0, match.index);
            const lastNewline = beforeMatch.lastIndexOf('\n');
            const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
            const lineBeforeStatic = bodyContent.substring(lineStart, match.index).trim();
            
            // If there's other code on the same line before "static", skip this match
            if (lineBeforeStatic.length > 0 && !lineBeforeStatic.startsWith('//') && !lineBeforeStatic.startsWith('*')) {
                continue;
            }

            const start = offset + match.index;
            const bracePos = start + match[0].length - 1;
            const end = this.findMatchingBrace(bracePos);
            if (end !== -1) {
                skipRegions.push({ start, end: end + 1 });
            }
        }

        // Find instance initializer blocks: standalone "{"
        // These are blocks that start with just "{" at the beginning of a line
        const lines = bodyContent.split('\n');
        let pos = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Instance initializer: a line with just "{"
            if (trimmedLine === '{') {
                const start = offset + pos + line.indexOf('{');
                const end = this.findMatchingBrace(start);
                if (end !== -1) {
                    // Make sure this isn't already covered by a skip region
                    if (!skipRegions.some(r => start >= r.start && start <= r.end)) {
                        skipRegions.push({ start, end: end + 1 });
                    }
                }
            }
            
            pos += line.length + 1; // +1 for newline
        }

        return skipRegions;
    }

    /**
     * Check if a position is within any skip region
     */
    private isInSkipRegion(pos: number, skipRegions: SkipRegion[]): boolean {
        return skipRegions.some(r => pos >= r.start && pos < r.end);
    }

    /**
     * Extract all methods from the source
     */
    private extractMethods(className: string, classBodyBounds: { start: number; end: number; bodyStart: number }): JavaMethod[] {
        const methods: JavaMethod[] = [];
        const skipRegions = this.findSkipRegions(classBodyBounds);
        const methodPattern = this.createMethodPattern(className);
        
        let match;
        let lastMethodEnd = classBodyBounds.bodyStart + 1; // Start after opening brace
        const regex = new RegExp(methodPattern, 'g');
        
        // Only search within the main class body
        const searchArea = this.source.substring(classBodyBounds.bodyStart + 1, classBodyBounds.end);
        const searchOffset = classBodyBounds.bodyStart + 1;
        
        while ((match = regex.exec(searchArea)) !== null) {
            // Calculate the actual method start (after the line start pattern)
            const rawMatchStart = searchOffset + match.index;
            const matchedText = match[0];
            
            // Find where the actual method declaration starts (skip only the initial newline from pattern)
            // We want to preserve leading whitespace/indentation on the same line
            let actualMethodStart = rawMatchStart;
            if (this.source[actualMethodStart] === '\n') {
                actualMethodStart++;
            }
            
            // Skip if this match is within a skip region (nested class or initializer block)
            if (this.isInSkipRegion(actualMethodStart, skipRegions)) {
                continue;
            }
            
            const leadingContent = this.extractLeadingContent(actualMethodStart, lastMethodEnd, skipRegions);
            const bodyStart = this.source.indexOf('{', rawMatchStart + matchedText.length - 1);
            
            if (bodyStart === -1 || bodyStart >= classBodyBounds.end) {
                // Abstract method or interface method
                const semicolon = this.source.indexOf(';', actualMethodStart);
                if (semicolon !== -1 && semicolon < classBodyBounds.end) {
                    const method = this.createMethodFromAbstract(match, actualMethodStart, semicolon + 1, leadingContent, className);
                    methods.push(method);
                    lastMethodEnd = semicolon + 1;
                }
                continue;
            }

            // Skip if body start is in a skip region
            if (this.isInSkipRegion(bodyStart, skipRegions)) {
                continue;
            }

            const bodyEnd = this.findMatchingBrace(bodyStart);
            if (bodyEnd === -1 || bodyEnd >= classBodyBounds.end) {
                continue;
            }

            const method = this.createMethod(match, actualMethodStart, bodyEnd + 1, leadingContent, className);
            methods.push(method);
            lastMethodEnd = bodyEnd + 1;
            regex.lastIndex = bodyEnd - searchOffset + 1;
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
        // Must start with either a modifier or the return type, not arbitrary text
        const modifiers = '(?:(?:public|protected|private|static|final|abstract|synchronized|native|strictfp)\\s+)*';
        const typeParams = '(?:<[^>]+>\\s+)?';
        const returnType = '(?:[\\w\\[\\]<>,\\s\\.]+\\s+)?';
        const methodName = `(${className}|\\w+)`;
        const params = '\\s*\\([^)]*\\)';
        const throwsClause = '(?:\\s+throws\\s+[\\w\\s,\\.]+)?';
        const bodyOrSemi = '(?:\\s*\\{|\\s*;)';
        
        // Require method declaration to start at beginning of line (optionally with whitespace)
        const lineStart = '(?:^|\\n)\\s*';
        
        return `${lineStart}${modifiers}${typeParams}${returnType}${methodName}${params}${throwsClause}${bodyOrSemi}`;
    }

    /**
     * Extract leading comments and annotations before a method
     */
    private extractLeadingContent(methodStart: number, searchStart: number, skipRegions: SkipRegion[]): string {
        // Find the effective search start, skipping any skip regions
        let effectiveStart = searchStart;
        for (const region of skipRegions) {
            if (region.start >= searchStart && region.end <= methodStart) {
                // This skip region is between searchStart and methodStart
                effectiveStart = Math.max(effectiveStart, region.end);
            }
        }

        // Look backwards from methodStart to find comments and annotations
        const textBefore = this.source.substring(effectiveStart, methodStart);
        
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
    private extractNonMethodContent(methods: JavaMethod[], classBodyBounds: { start: number; end: number; bodyStart: number }): { preMethodsContent: string; postMethodsContent: string } {
        if (methods.length === 0) {
            return { preMethodsContent: this.source, postMethodsContent: '' };
        }

        // Find the start of the first method (including its leading content)
        let firstMethodStart = methods[0].startPos;
        const leadingContent = methods[0].leadingContent;
        if (leadingContent && leadingContent.trim()) {
            const leadingIndex = this.source.lastIndexOf(leadingContent.trim(), firstMethodStart);
            if (leadingIndex !== -1 && leadingIndex > classBodyBounds.bodyStart) {
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
