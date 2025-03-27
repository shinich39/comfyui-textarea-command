"use strict";

import { app } from "../../../scripts/app.js";
import { ComfyWidgets } from "../../../scripts/widgets.js";

let isSelectionEnabled = typeof window.getSelection !== "undefined",
    prevElement = null,
    historyIndex = 0,
    changeTimer = null,
    history = [];

const COMMANDS = {
  "ctrl+z": undoHandler,
  "ctrl+shift+z": redoHandler,
  "tab": tabHandler,
  "shift+tab": tabHandler,
  "ctrl+/": commentHandler,
  "shift+{": bracketHandler,
  "shift+(": bracketHandler,
  "[": bracketHandler,
  // "enter": lineBreakHandler,
  // "shift+<": bracketHandler,
  // "\'": bracketHandler,
  // "\`": bracketHandler,
  // "shift+\"": bracketHandler,
}

const BRACKETS = {
  "(": ["(",")"],
  "{": ["{","}"],
  "[": ["[","]"],
  "<": ["<",">"],
  "\"": ["\"","\""],
  "\'": ["\'","\'"],
  "\`": ["\`","\`"],
}

function getCursor(el) {
  return [
    el.selectionStart,
    el.selectionEnd,
  ];
}

function setCursor(el, start, end) {
  el.focus();
  el.setSelectionRange(start, end);
}

function getLevel(str) {
  let n = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    const ch = str[i];
    if (str[i] === "}" && (!str[i-1] || str[i-1] !== "\\")) {
      n--;
    }
    if (str[i] === "{" && (!str[i-1] || str[i-1] !== "\\")) {
      n++;
    }
  }
  return Math.max(0, n);
}

function parseKey(e) {
  const { key } = e;
  const shiftKey = e.shiftKey;
  const ctrlKey = e.ctrlKey || e.metaKey;
  return { key, shiftKey, ctrlKey };
}

function getKey(e) {
  const { key, ctrlKey, metaKey, shiftKey } = e;
  return (ctrlKey || metaKey ? "ctrl+" : "") + (shiftKey ? "shift+" : "") + key.toLowerCase();
}

function isCommand(e) {
  return !!getCommand(e);
}

function getCommand(e) {
  return COMMANDS[getKey(e)];
}

function stripComments(str) {
  return str.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
}

function parseString(str) {
  let offset = 0;
  return str.split(/[,()[\]{}|\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const index = str.indexOf(item, offset);

      offset = index + item.length;

      return {
        value: item,
        start: index,
        end: index + item.length,
      }
    });
}

function dynamicPrompt(prompt) {
  let offset = 0, i = prompt.indexOf("{", offset);
  while(i > -1) {
    offset = i + 1;
    if (prompt.charAt(i - 1) !== "\\") {
      const closingIndex = prompt.indexOf("}", offset);
      if (closingIndex === -1) {
        break;
      }
  
      const nextIndex = prompt.indexOf("{", offset);
      if (nextIndex === -1 || closingIndex < nextIndex) {
        const items = prompt.substring(i + 1, closingIndex).split("|");
        const item = items[Math.floor(Math.random() * items.length)];
  
        prompt = prompt.substring(0, i) + 
          item + 
          prompt.substring(closingIndex + 1);
          
        offset = 0; 
      }
    }
    i = prompt.indexOf("{", offset);
  }

  return prompt;
}

function getCurrentItem(str, currStart, currEnd, reverse) {
  const items = parseString(str);
  if (!reverse) {
    for (let i = 0; i < items.length; i++) {
      const { value, start, end } = items[i];
      if (start == currStart && end == currEnd) {
        return items[i + 1] || items[0];
      } else if ((start <= currStart && end >= currStart) || (start > currStart)) {
        return items[i];
      }
    }
    return items[0];
  } else {
    for (let i = items.length - 1; i >= 0; i--) {
      const { value, start, end } = items[i];
      if (start == currStart && end == currEnd) {
        return items[i - 1] || items[items.length - 1];
      } else if ((start <= currStart && end >= currStart) || (end < currStart)) {
        return items[i];
      }
    }
    return items[items.length - 1];
  }
}

function getCurrentItems(currValue, currStart, currEnd) {
  const items = parseString(currValue);
  let result = [];
  for (let i = 0; i < items.length; i++) {
    const { value, start, end } = items[i];
    if (end > currStart && start < currEnd) {
      result.push(items[i]);
    }
  }
  return result;
}

function getPrevHistory(e) {
  if (!prevElement || !e.target.isSameNode(prevElement)) {
    return;
  }
  historyIndex = Math.max(0, historyIndex - 1);
  return history[historyIndex];
}

function getNextHistory(e) {
  if (!prevElement || !e.target.isSameNode(prevElement)) {
    return;
  }
  historyIndex = Math.min(history.length - 1, historyIndex + 1);
  return history[historyIndex];
}

function addHistory(e, newHistory) {
  // if (changeTimer) {
  //   clearTimeout(changeTimer);
  // }

  if (!prevElement || !e.target.isSameNode(prevElement)) {
    prevElement = e.target;
    history = [newHistory];
    historyIndex = history.length - 1;
  } else {
    history = history.slice(0, historyIndex + 1);
    const lastHistory = history[history.length - 1];
    if (
      !lastHistory ||
      lastHistory.value !== newHistory.value ||
      lastHistory.start !== newHistory.start ||
      lastHistory.end !== newHistory.end
    ) {
      history.push(newHistory);
    }
    historyIndex = history.length - 1;
  }
}

function undoHandler(e) {
  e.preventDefault();
  e.stopPropagation();
  const h = getPrevHistory(e);
  if (h) {
    const { value, start, end } = h;
    e.target.value = value;
    e.target.focus();
    e.target.setSelectionRange(start, end);
  }
}

function redoHandler(e) {
  e.preventDefault();
  e.stopPropagation();
  const h = getNextHistory(e);
  if (h) {
    const { value, start, end } = h;
    e.target.value = value;
    e.target.focus();
    e.target.setSelectionRange(start, end);
  }
}

function tabHandler(e) {
  e.preventDefault();
  e.stopPropagation();
  const { key, shiftKey, ctrlKey } = parseKey(e);
  const elem = e.target;

  const currValue = elem.value;
  const [ currStart, currEnd ] = getCursor(elem);
  const { value, start, end } = getCurrentItem(currValue, currStart, currEnd, shiftKey);

  // Add history
  addHistory(e, {
    value: currValue,
    start: currStart,
    end: currEnd,
  });
  addHistory(e, {
    value: elem.value,
    start: start,
    end: end,
  });

  setCursor(elem, start, end);
}

function commentHandler(e) {
  e.preventDefault();
  e.stopPropagation();
  const { key, shiftKey, ctrlKey } = parseKey(e);
  const elem = e.target;

  const currValue = elem.value;
  const [ currStart, currEnd ] = getCursor(elem);

  const lines = currValue.split(/\n/);
  for (let i = 0; i < lines.length - 1; i++) {
    lines[i] += "\n";
  }
 
  const selectedLineIndexes = [];
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const start = offset;
    const end = offset + line.length - 1;

    offset += line.length;

    if (start > currEnd || end < currStart) {
      continue;
    }

    selectedLineIndexes.push(i);
  }

  let isComment = true;
  for (const i of selectedLineIndexes) {
    if (!(/^\/\//.test(lines[i]))) {
      isComment = false;
      break;
    }
  }

  const changes = [];
  for (const i of selectedLineIndexes) {
    const line = lines[i];
    if (!isComment) {
      lines[i] = "// " + line;
    } else {
      lines[i] = line.replace(/^\/\/[^\S\r\n]*/, "");
    }

    changes.push(lines[i].length - line.length);
  }

  const newValue = lines.join("");
  const newStart = currStart + changes[0];
  const newEnd = currEnd + changes.reduce((acc, cur) => acc + cur, 0);

  // Add history
  addHistory(e, {
    value: currValue,
    start: currStart,
    end: currEnd,
  });
  addHistory(e, {
    value: newValue,
    start: newStart,
    end: newEnd,
  });

  // Set value
  elem.value = newValue;
  setCursor(elem, newStart, newEnd);
}

function bracketHandler(e) {
  e.preventDefault();
  e.stopPropagation();
  const { key, shiftKey, ctrlKey } = parseKey(e);
  const elem = e.target;

  const [opening, closing] = BRACKETS[key];
  const currValue = elem.value;
  const [ currStart, currEnd ] = getCursor(elem);

  let newValue = currValue;
  let newStart = currStart;
  let newEnd = currEnd;

  let left = currValue.substring(0, currStart);
  let center = currValue.substring(currStart, currEnd);
  let right = currValue.substring(currEnd);

  // if (opening == "{") {
  //   center = center.replace(/\s*\,\s*/g, "|");
  // }

  newValue = left + opening + center + closing + right;
  newStart = left.length + opening.length;
  newEnd = left.length + opening.length + center.length;

  // Add history
  addHistory(e, {
    value: currValue,
    start: currStart,
    end: currEnd,
  });
  addHistory(e, {
    value: newValue,
    start: newStart,
    end: newEnd,
  });

  // Set value
  elem.value = newValue;
  setCursor(elem, newStart, newEnd);
}

// conflict with pysssss-autocomplete
function lineBreakHandler(e) {
  e.preventDefault();
  e.stopPropagation();
  const { key, shiftKey, ctrlKey } = parseKey(e);
  const elem = e.target;
  const currValue = elem.value;
  const [ currStart, currEnd ] = getCursor(elem);
  const level = getLevel(currValue.substring(0, currStart));

  let newValue = currValue;
  let newStart = currStart;
  let newEnd = currEnd;

  let left = currValue.substring(0, currStart);
  let center = "\n" + Array(level * 2).fill(" ").join("");
  let right = currValue.substring(currEnd);

  if (right.charAt(0) === "}") {
    right = "\n" + Array((level - 1) * 2).fill(" ").join("") + right;
  }

  newValue = left + center + right;
  newStart = left.length + center.length;
  newEnd = left.length + center.length;

  // Add history
  addHistory(e, {
    value: currValue,
    start: currStart,
    end: currEnd,
  });
  addHistory(e, {
    value: newValue,
    start: newStart,
    end: newEnd,
  });

  // Set value
  elem.value = newValue;
  setCursor(elem, newStart, newEnd);
}

async function keydownHandler(e) {
  try {
    const { key, shiftKey, ctrlKey } = parseKey(e);
    const command = getCommand(e);
    if (!command) {
      return;
    }
    
    command(e);
  } catch(err) {
    console.error(err);
  }
}

function focusHandler(e) {
  if (!prevElement || !e.target.isSameNode(prevElement)) {
    setTimeout(function() {
      const currValue = e.target.value;
      const [ currStart, currEnd ] = getCursor(e.target);
    
      addHistory(e, {
        value: currValue,
        start: currStart,
        end: currEnd,
      });
    }, 10);
  }
}

function clickHandler(e) {
  setTimeout(function() {
    const currValue = e.target.value;
    const [ currStart, currEnd ] = getCursor(e.target);
  
    addHistory(e, {
      value: currValue,
      start: currStart,
      end: currEnd,
    });
  }, 10);
}

function changeHandler(e) {
  const currValue = e.target.value;
  const [ currStart, currEnd ] = getCursor(e.target);

  addHistory(e, {
    value: currValue,
    start: currStart,
    end: currEnd,
  });

  // if (changeTimer) {
  //   clearTimeout(changeTimer);
  // }

  // changeTimer = setTimeout(function() {
  //   addHistory(e, {
  //     value: currValue,
  //     start: currStart,
  //     end: currEnd,
  //   });
  // }, 768);
}

app.registerExtension({
	name: "shinich39.TextareaCommand",
	init() {
    if (!isSelectionEnabled) {
      console.error(new Error("comfyui-textarea-command has been disabled."));
      return;
    }

    const STRING = ComfyWidgets.STRING;
    ComfyWidgets.STRING = function (node, inputName, inputData) {
      const r = STRING.apply(this, arguments);
      if (!inputData[1]?.multiline) {
        return r;
      }
      if (!r.widget?.element) {
        return r;
      }
    
      const elem = r.widget.element;
      elem.addEventListener("keydown", keydownHandler, true);
      elem.addEventListener("focus", focusHandler, true);
      elem.addEventListener("input", changeHandler, true);
      elem.addEventListener("click", clickHandler, true);

      return r;
    };
	},
  nodeCreated(node) {
		if (node.widgets) {
			// Locate dynamic prompt text widgets
			// Include any widgets with dynamicPrompts set to true, and customtext
			const widgets = node.widgets.filter(
				(n) => n.dynamicPrompts
			);
			for (const widget of widgets) {
				// Override the serialization of the value to resolve dynamic prompts for all widgets supporting it in this node
        const origSerializeValue = widget.serializeValue;
        widget.serializeValue = async function(workflowNode, widgetIndex) {
          let r = await origSerializeValue?.apply(this, arguments) ?? widget.value;

          // Bugfix: Custom-Script presetText.js has overwrite original dynamicPrompt
          r = stripComments(r);
          r = dynamicPrompt(r);

          // Overwrite the value in the serialized workflow pnginfo
          if (workflowNode?.widgets_values)
            workflowNode.widgets_values[widgetIndex] = r

          // Debug
          // console.log(r);

          return r;
        }
			}
		}
	},
});