# Java Method Sorter

A Visual Studio Code extension that sorts methods in Java classes to increase code readability.

## Features

- Sort methods in Java classes based on multiple criteria:
  - Access level (public, protected, package, private)
  - Constructor separation
  - Invocation order (depth-first or breadth-first)
  - Lexical (alphabetical) ordering
- Cluster overloaded methods together
- Cluster getter and setter methods together
- Shuffle methods randomly (for testing purposes)
- Context menu integration
- Keyboard shortcut support

## Usage

### Sort Methods

1. Open a Java source file
2. Right-click in the editor and select **tlcsdm** → **Sort Methods**
3. Or use the keyboard shortcut `Alt+S`
4. Or run the command "Sort Methods" from the Command Palette (`Ctrl+Shift+P`)

### Shuffle Methods Randomly

1. Open a Java source file
2. Right-click in the editor and select **tlcsdm** → **Shuffle Methods Randomly**
3. Or run the command "Shuffle Methods Randomly" from the Command Palette

## Configuration

Configure the sorting behavior through VS Code settings:

| Setting | Description | Default |
|---------|-------------|---------|
| `tlcsdm.methodsorter.sortingStrategy` | Invocation ordering strategy: `depth-first` or `breadth-first` | `depth-first` |
| `tlcsdm.methodsorter.applyWorkingListHeuristics` | Apply heuristics to determine start points | `true` |
| `tlcsdm.methodsorter.respectBeforeAfterRelation` | Respect before/after relation in method ordering | `true` |
| `tlcsdm.methodsorter.clusterOverloadedMethods` | Keep overloaded methods together | `false` |
| `tlcsdm.methodsorter.clusterGetterSetter` | Keep getter and setter methods together | `false` |
| `tlcsdm.methodsorter.separateByAccessLevel` | Separate methods by access level | `true` |
| `tlcsdm.methodsorter.separateConstructors` | Separate constructors from other methods | `true` |
| `tlcsdm.methodsorter.applyLexicalOrdering` | Apply lexical ordering as a secondary sort | `true` |

## Sorting Order

When all options are enabled, methods are sorted in the following order:

1. **Constructors** - Constructors come first
2. **Static methods** - Static methods are grouped together
3. **Access level** - Methods are grouped by access level:
   - Public methods
   - Protected methods
   - Package-private methods
   - Private methods
4. **Invocation order** - Methods that call other methods come before the methods they call
5. **Lexical order** - Alphabetical ordering of method names
6. **Original position** - Maintains original order when all other criteria are equal

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Translation"
4. Click Install

### From VSIX File
1. Download the `.vsix` file from [Releases](https://github.com/tlcsdm/vscode-java-method-sorter/releases)
2. In VS Code, open Command Palette (`Ctrl+Shift+P`)
3. Search for "Extensions: Install from VSIX..."
4. Select the downloaded `.vsix` file

### From Jenkins
Download from [Jenkins](https://jenkins.tlcsdm.com/job/vscode-plugin/job/vscode-java-method-sorter/)

## Build

This project uses TypeScript and npm (Node.js 22).

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode (for development)
npm run watch

# Lint
npm run lint

# Package
npx @vscode/vsce package

# Test
npm run test
```

## Related Projects
* [eclipse-method-sorter](https://github.com/tlcsdm/eclipse-method-sorter)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
