# comfyui-textarea-command

Add shortcuts for quick writing in textarea.  
Nestable dynamic prompt.  
Tab to quickly select a token.  
Improved undo, redo history in textarea.  

## Usage  

- Shortcuts

| Command      | Result               |
|--------------|----------------------|
| \{            | \{...\}                |
| \[            | \[...\]                |
| \(            | \(...\)                |
| Ctrl+\/       | \/\/ This line is disabled... |
| Tab          | Select next word     |
| Shift+Tab    | Select previous word |
| Ctrl+Z       | Undo                 |
| Ctrl+Shift+Z | Redo                 |

- Nestable dynamic prompt

```
{{red|blue|green}|purple} sky
```

Result

```
purple sky
```