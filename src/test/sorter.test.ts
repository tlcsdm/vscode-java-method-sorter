import { JavaMethodSorter, JavaParser, SortingOptions } from '../sorter';

/**
 * Simple test runner for sorter logic
 */
function runTests(): void {
    console.log('Running sorter tests...\n');
    
    let passed = 0;
    let failed = 0;
    
    // Test 1: JavaParser - Extract class name
    try {
        const source = `public class TestClass { }`;
        const parser = new JavaParser(source);
        const result = parser.parse();
        if (result?.name === 'TestClass') {
            console.log('✓ Test 1 passed: JavaParser extracts class name');
            passed++;
        } else {
            console.log('✗ Test 1 failed: JavaParser class name extraction');
            failed++;
        }
    } catch (e) {
        console.log('✗ Test 1 failed with error:', e);
        failed++;
    }
    
    // Test 2: JavaParser - Parse simple class with methods
    try {
        const source = `
public class MyClass {
    public void methodA() {
        System.out.println("A");
    }
    
    private void methodB() {
        System.out.println("B");
    }
}`;
        const parser = new JavaParser(source);
        const result = parser.parse();
        if (result && result.methods.length === 2) {
            console.log('✓ Test 2 passed: JavaParser finds 2 methods');
            passed++;
        } else {
            console.log('✗ Test 2 failed: Expected 2 methods, got', result?.methods.length);
            failed++;
        }
    } catch (e) {
        console.log('✗ Test 2 failed with error:', e);
        failed++;
    }
    
    // Test 3: JavaMethodSorter - Sort by access level
    try {
        const source = `
public class MyClass {
    private void privateMethod() {
        System.out.println("private");
    }
    
    public void publicMethod() {
        System.out.println("public");
    }
}`;
        const options: SortingOptions = {
            sortingStrategy: 'depth-first',
            applyWorkingListHeuristics: true,
            respectBeforeAfterRelation: false,
            clusterOverloadedMethods: false,
            clusterGetterSetter: false,
            separateByAccessLevel: true,
            separateConstructors: true,
            applyLexicalOrdering: false
        };
        const sorter = new JavaMethodSorter(options);
        const sorted = sorter.sort(source);
        
        // Public method should come before private method
        const publicIdx = sorted.indexOf('publicMethod');
        const privateIdx = sorted.indexOf('privateMethod');
        
        if (publicIdx < privateIdx) {
            console.log('✓ Test 3 passed: Methods sorted by access level');
            passed++;
        } else {
            console.log('✗ Test 3 failed: Public method should come before private');
            failed++;
        }
    } catch (e) {
        console.log('✗ Test 3 failed with error:', e);
        failed++;
    }
    
    // Test 4: JavaMethodSorter - Constructor separation
    try {
        const source = `
public class MyClass {
    public void regularMethod() {
        System.out.println("regular");
    }
    
    public MyClass() {
        System.out.println("constructor");
    }
}`;
        const options: SortingOptions = {
            sortingStrategy: 'depth-first',
            applyWorkingListHeuristics: true,
            respectBeforeAfterRelation: false,
            clusterOverloadedMethods: false,
            clusterGetterSetter: false,
            separateByAccessLevel: true,
            separateConstructors: true,
            applyLexicalOrdering: false
        };
        const sorter = new JavaMethodSorter(options);
        const sorted = sorter.sort(source);
        
        // Constructor should come before regular method
        const constructorIdx = sorted.indexOf('public MyClass()');
        const regularIdx = sorted.indexOf('regularMethod');
        
        if (constructorIdx < regularIdx) {
            console.log('✓ Test 4 passed: Constructor comes before regular methods');
            passed++;
        } else {
            console.log('✗ Test 4 failed: Constructor should come before regular methods');
            failed++;
        }
    } catch (e) {
        console.log('✗ Test 4 failed with error:', e);
        failed++;
    }
    
    // Test 5: JavaMethodSorter - Shuffle randomly
    try {
        const source = `
public class MyClass {
    public void methodA() { }
    public void methodB() { }
    public void methodC() { }
    public void methodD() { }
    public void methodE() { }
}`;
        const options: SortingOptions = {
            sortingStrategy: 'depth-first',
            applyWorkingListHeuristics: false,
            respectBeforeAfterRelation: false,
            clusterOverloadedMethods: false,
            clusterGetterSetter: false,
            separateByAccessLevel: false,
            separateConstructors: false,
            applyLexicalOrdering: false
        };
        const sorter = new JavaMethodSorter(options);
        
        // Shuffle multiple times and check that at least one is different
        let foundDifferent = false;
        for (let i = 0; i < 10; i++) {
            const shuffled = sorter.shuffleRandomly(source);
            if (shuffled !== source) {
                foundDifferent = true;
                break;
            }
        }
        
        if (foundDifferent) {
            console.log('✓ Test 5 passed: Shuffle produces different output');
            passed++;
        } else {
            console.log('✗ Test 5 failed: Shuffle did not produce different output');
            failed++;
        }
    } catch (e) {
        console.log('✗ Test 5 failed with error:', e);
        failed++;
    }
    
    // Test 6: JavaParser - Skips static initializer blocks
    try {
        const source = `
public class MyClass {
    static {
        System.out.println("Static block");
    }
    
    public void methodA() {
        System.out.println("A");
    }
}`;
        const parser = new JavaParser(source);
        const result = parser.parse();
        // Should only find methodA, not println from static block
        if (result && result.methods.length === 1 && result.methods[0].name === 'methodA') {
            console.log('✓ Test 6 passed: JavaParser skips static initializer blocks');
            passed++;
        } else {
            console.log('✗ Test 6 failed: Expected 1 method (methodA), got', result?.methods.map(m => m.name));
            failed++;
        }
    } catch (e) {
        console.log('✗ Test 6 failed with error:', e);
        failed++;
    }
    
    // Test 7: JavaParser - Skips instance initializer blocks
    try {
        const source = `
public class MyClass {
    {
        System.out.println("Instance block");
    }
    
    public void methodA() {
        System.out.println("A");
    }
}`;
        const parser = new JavaParser(source);
        const result = parser.parse();
        // Should only find methodA, not println from instance block
        if (result && result.methods.length === 1 && result.methods[0].name === 'methodA') {
            console.log('✓ Test 7 passed: JavaParser skips instance initializer blocks');
            passed++;
        } else {
            console.log('✗ Test 7 failed: Expected 1 method (methodA), got', result?.methods.map(m => m.name));
            failed++;
        }
    } catch (e) {
        console.log('✗ Test 7 failed with error:', e);
        failed++;
    }
    
    // Test 8: JavaParser - Skips inner class methods
    try {
        const source = `
public class MyClass {
    public void outerMethod() {
        System.out.println("Outer");
    }
    
    public static class Inner {
        public void innerMethod() {
            System.out.println("Inner");
        }
    }
}`;
        const parser = new JavaParser(source);
        const result = parser.parse();
        // Should only find outerMethod, not innerMethod from inner class
        if (result && result.methods.length === 1 && result.methods[0].name === 'outerMethod') {
            console.log('✓ Test 8 passed: JavaParser skips inner class methods');
            passed++;
        } else {
            console.log('✗ Test 8 failed: Expected 1 method (outerMethod), got', result?.methods.map(m => m.name));
            failed++;
        }
    } catch (e) {
        console.log('✗ Test 8 failed with error:', e);
        failed++;
    }
    
    // Test 9: JavaMethodSorter - Preserves inner classes in output
    try {
        const source = `
public class MyClass {
    public void outerMethod() {
        System.out.println("Outer");
    }
    
    public static class Inner {
        public void innerMethod() {
            System.out.println("Inner");
        }
    }
}`;
        const options: SortingOptions = {
            sortingStrategy: 'depth-first',
            applyWorkingListHeuristics: false,
            respectBeforeAfterRelation: false,
            clusterOverloadedMethods: false,
            clusterGetterSetter: false,
            separateByAccessLevel: false,
            separateConstructors: false,
            applyLexicalOrdering: false
        };
        const sorter = new JavaMethodSorter(options);
        const sorted = sorter.sort(source);
        
        // The inner class should be preserved in the output
        if (sorted.includes('public static class Inner') && sorted.includes('innerMethod')) {
            console.log('✓ Test 9 passed: Inner classes preserved in output');
            passed++;
        } else {
            console.log('✗ Test 9 failed: Inner class not preserved in output');
            failed++;
        }
    } catch (e) {
        console.log('✗ Test 9 failed with error:', e);
        failed++;
    }
    
    // Test 10: JavaMethodSorter - Preserves static and instance initializer blocks
    try {
        const source = `
public class MyClass {
    static {
        System.out.println("Static block");
    }
    
    {
        System.out.println("Instance block");
    }
    
    public void methodA() {
        System.out.println("A");
    }
}`;
        const options: SortingOptions = {
            sortingStrategy: 'depth-first',
            applyWorkingListHeuristics: false,
            respectBeforeAfterRelation: false,
            clusterOverloadedMethods: false,
            clusterGetterSetter: false,
            separateByAccessLevel: false,
            separateConstructors: false,
            applyLexicalOrdering: false
        };
        const sorter = new JavaMethodSorter(options);
        const sorted = sorter.sort(source);
        
        // Both initializer blocks should be preserved
        if (sorted.includes('static {') && 
            sorted.includes('System.out.println("Static block")') &&
            sorted.includes('System.out.println("Instance block")')) {
            console.log('✓ Test 10 passed: Initializer blocks preserved in output');
            passed++;
        } else {
            console.log('✗ Test 10 failed: Initializer blocks not preserved');
            failed++;
        }
    } catch (e) {
        console.log('✗ Test 10 failed with error:', e);
        failed++;
    }
    
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
}

// Export for use in tests
export { runTests };

// Run if executed directly
if (require.main === module) {
    runTests();
}
