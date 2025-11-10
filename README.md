# Diff Suite - JSON/XML/Text Validator & Comparator

A modern, single-page React application for validating and comparing JSON, XML, and plain text files. Built with Next.js 14, TypeScript, and Material-UI.

## Features

### Validation
- **JSON Validation**: Parse and validate JSON with detailed error reporting (line/column)
- **XML Validation**: Check XML well-formedness with error location information

### Comparison
- **JSON Compare**: Structural comparison with options to ignore key order and array order
- **XML Compare**: Element and attribute comparison with configurable options
- **Text Compare**: Line-by-line diff with inline highlighting for changes

### Additional Features
- **File Upload**: Upload files directly into editors
- **LocalStorage Persistence**: Automatically saves your inputs and settings
- **Responsive Design**: Fully mobile-responsive layout
- **Comparison Options**:
  - Ignore key order (JSON)
  - Ignore array order (JSON)
  - Ignore attribute order (XML)
  - Case sensitivity toggle
  - Whitespace-insensitive comparison
- **Export Options**: Copy and download results

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Material-UI (MUI)** v5
- **fast-xml-parser** for XML parsing
- **diff** library for text comparison
- **Jest** and **React Testing Library** for testing

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd diff-suite
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Testing

Run unit tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with ThemeProvider
│   ├── page.tsx            # Main page with state management
│   └── globals.css         # Global styles
├── components/
│   ├── Header/             # Header component
│   ├── Footer/             # Footer component
│   ├── ModeSelector/       # Format and action type selector
│   ├── CodeEditor/         # Reusable code editor
│   ├── ValidationView/     # Validation mode view
│   ├── ComparisonView/     # Comparison mode view
│   ├── DiffDisplay/        # Diff results display
│   ├── ActionButton/       # Custom button component
│   └── ThemeProvider/      # MUI theme provider
├── utils/
│   ├── validators/
│   │   ├── jsonValidator.ts
│   │   └── xmlValidator.ts
│   └── comparators/
│       ├── jsonComparator.ts
│       ├── xmlComparator.ts
│       └── textComparator.ts
├── types/
│   └── index.ts            # TypeScript type definitions
└── __tests__/              # Integration tests
```

## Usage

### JSON Validation

1. Select "JSON" format and "Validate" action
2. Paste or upload your JSON content
3. Click "Validate" button
4. View validation results with error details (if any)

### JSON Comparison

1. Select "JSON" format and "Compare" action
2. Paste or upload JSON into left and right editors
3. Configure comparison options (ignore key order, array order, etc.)
4. Click "Compare" button
5. View side-by-side diff with added/removed/modified items

### XML Validation

1. Select "XML" format and "Validate" action
2. Paste or upload your XML content
3. Click "Validate" button
4. View validation results

### XML Comparison

1. Select "XML" format and "Compare" action
2. Paste or upload XML into left and right editors
3. Configure comparison options
4. Click "Compare" button
5. View differences

### Text Comparison

1. Select "Text" format (compare mode is automatic)
2. Paste or upload text into left and right editors
3. Configure comparison options
4. Click "Compare" button
5. View line-by-line diff with color-coded changes

## Design Decisions

### State Management
- Uses React hooks (useState, useEffect, useCallback) for state management
- LocalStorage persistence for user inputs and settings
- No external state management library needed for this single-page app

### Performance
- Debounced parsing for large inputs (handles up to ~2MB)
- Efficient diff algorithms for comparison
- Lazy loading of components where applicable

### Component Architecture
- Reusable components with clear prop interfaces
- Separation of concerns (validation, comparison, display)
- Type-safe with TypeScript

### Testing Strategy
- Unit tests for validators and comparators
- Integration tests for each mode
- Test coverage for edge cases

## Sample Test Inputs

### Valid JSON
```json
{"user":{"id":1,"name":"Asha"}}
```

### Invalid JSON (trailing comma)
```json
{"user": { "id": 1, "name": "Asha", }}
```

### JSON Comparison
**Left:**
```json
{"a":1,"b":[1,2,3]}
```

**Right:**
```json
{"b":[1,3,2],"a":2,"c":true}
```

### Valid XML
```xml
<user id="1"><name>Asha</name></user>
```

### Invalid XML (mismatched tags)
```xml
<user><name>Asha</user>
```

### Text Comparison
**Left:**
```
line one
line two
```

**Right:**
```
line one
line too
```

## Known Limitations

1. Large files (>2MB) may experience performance issues
2. XML comparison is structural and may not handle all edge cases
3. Text comparison uses line-by-line diff (not character-level)
4. Some browser compatibility issues with very old browsers

## Future Enhancements

- [ ] Drag-and-drop file import
- [ ] Dark mode toggle
- [ ] Syntax highlighting in editors
- [ ] Export diff as PDF/HTML
- [ ] Keyboard shortcuts
- [ ] History of comparisons
- [ ] Cloud storage integration

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and feature requests, please use the GitHub issue tracker.

