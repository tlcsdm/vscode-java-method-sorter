# Java Method Sorter

A Visual Studio Code extension that sorts methods in Java classes to increase code readability.

This extension is inspired by the [eclipse-method-sorter](https://github.com/tlcsdm/eclipse-method-sorter) plugin and brings similar functionality to VS Code.

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

## Requirements

- Visual Studio Code 1.108.0 or later
- Java source files (.java)

## Known Issues

Please report issues on the [GitHub issue tracker](https://github.com/tlcsdm/vscode-java-method-sorter/issues).

## Release Notes

### 1.0.0

Initial release of Java Method Sorter.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

This extension is inspired by the [eclipse-method-sorter](https://github.com/tlcsdm/eclipse-method-sorter) plugin, which is a fork of [Clean-Code-Method-Sorter](https://github.com/parzonka/Clean-Code-Method-Sorter).
