"use strict";

import { app } from "../../../scripts/app.js";
import { ComfyWidgets } from "../../../scripts/widgets.js";
import { dynamicPrompt } from "./dynamic-prompt.js";

let isSelectionEnabled = typeof window.getSelection !== "undefined",
    prevElement = null,
    historyIndex = 0,
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
  // "shift+<": bracketHandler,
  "\'": bracketHandler,
  "\`": bracketHandler,
  "shift+\"": bracketHandler,
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

function getCursur(el) {
  return [
    el.selectionStart,
    el.selectionEnd,
  ];
}

function setCursur(el, start, end) {
  el.focus();
  el.setSelectionRange(start, end);
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

function parseString(str) {
  let offset = 0;
  return str.split(/[,()[\]{}|]+/)
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

function getCurrentItem(str, currStart, currEnd, reverse) {
  const items = parseString(str);
  if (!reverse) {
    for (let i = 0; i < items.length; i++) {
      const { value, start, end } = items[i];
      if (start == currStart && end == currEnd) {
        return items[i + 1] || items[0];
      } else if ((start <= currStart && end > currStart) || (start > currStart)) {
        return items[i];
      }
    }
    return items[0];
  } else {
    for (let i = items.length - 1; i >= 0; i--) {
      const { value, start, end } = items[i];
      if (start == currStart && end == currEnd) {
        return items[i - 1] || items[items.length - 1];
      } else if ((start <= currStart && end > currStart) || (end < currStart)) {
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
  if (changeTimer) {
    clearTimeout(changeTimer);
  }

  if (!prevElement || !e.target.isSameNode(prevElement)) {
    prevElement = e.target;
    history = [newHistory];
    historyIndex = history.length - 1;
  } else {
    history = [...history.slice(0, historyIndex + 1), newHistory];
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
  const [ currStart, currEnd ] = getCursur(elem);
  const { value, start, end } = getCurrentItem(currValue, currStart, currEnd, shiftKey);

  // Add history
  addHistory(e, {
    value: elem.value,
    start: start,
    end: end,
  });

  setCursur(elem, start, end);
}

function commentHandler(e) {
  e.preventDefault();
  e.stopPropagation();
  const { key, shiftKey, ctrlKey } = parseKey(e);
  const elem = e.target;

  const currValue = elem.value;
  const [ currStart, currEnd ] = getCursur(elem);

  let end = currValue.indexOf("\n", currStart);
  if (end == -1) {
    end = currValue.length;
  }

  let start = 0;
  if (end > 0) {
    start = currValue.lastIndexOf("\n", end - 1);
    if (start == -1) {
      start = 0;
    } else {
      start += 1;
    }
  }

  const left = currValue.substring(0, start);
  const center = currValue.substring(start, end);
  const right = currValue.substring(end);

  let newValue = left;
  let newStart = currStart;
  let newEnd = currEnd;
  if (/^\/\//.test(center)) {
    const newCenter = center.replace(/^\/\/ ?/, "");
    newValue += newCenter;
    newStart -= center.length - newCenter.length;
    newEnd -= center.length - newCenter.length;
  } else {
    newValue += "// " + center;
    newStart += 3;
    newEnd += 3;
  }
  newValue += right;

  // Add history
  addHistory(e, {
    value: newValue,
    start: newStart,
    end: newEnd,
  });

  // Set value
  elem.value = newValue;
  setCursur(elem, newStart, newEnd);
}

function bracketHandler(e) {
  e.preventDefault();
  e.stopPropagation();
  const { key, shiftKey, ctrlKey } = parseKey(e);
  const elem = e.target;

  const [opening, closing] = BRACKETS[key];
  const currValue = elem.value;
  const [ currStart, currEnd ] = getCursur(elem);

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
    value: newValue,
    start: newStart,
    end: newEnd,
  });

  // Set value
  elem.value = newValue;
  setCursur(elem, newStart, newEnd);
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
      const [ currStart, currEnd ] = getCursur(e.target);
    
      addHistory(e, {
        value: currValue,
        start: currStart,
        end: currEnd,
      });
    }, 10);
  }
}

let changeTimer;
function changeHandler(e) {
  const currValue = e.target.value;
  const [ currStart, currEnd ] = getCursur(e.target);

  if (changeTimer) {
    clearTimeout(changeTimer);
  }

  changeTimer = setTimeout(function() {
    addHistory(e, {
      value: currValue,
      start: currStart,
      end: currEnd,
    });
  }, 768);
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
          r = dynamicPrompt(r);

          // Remove comment
          try {
            r = r.split("\n")
              .map(item => {
                if (item.indexOf("//") == 0) {
                  return null;
                } else {
                  return item;
                }
              })
              .filter(item => item !== null)
              .join("\n");
          } catch(err) {
            console.error(err);
          }

          // Overwrite the value in the serialized workflow pnginfo
          if (workflowNode?.widgets_values)
            workflowNode.widgets_values[widgetIndex] = r

          return r;
        }
			}
		}
	},
});