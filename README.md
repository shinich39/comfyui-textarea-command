# comfyui-textarea-command

Add command and comment in textarea.  
(e.g. // Disabled line)

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

- Comment

The lines following "//" are not applied in generation process.  

```
// blue sky, detailed background
red sky, simple background
```

Result

```
red sky, simple background
```

- Random prompt

You can setup occurrence probability using strength.  
The strength is applied to prompts that follow.  
Default strength is 1.  

```
red sky,
RANDOM:2
green sky, 
a cat,
RANDOM
blue sky, detailed background
```

Result  

```
green sky, 
a cat,
```