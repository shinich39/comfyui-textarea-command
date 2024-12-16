function stripComments(str) {
  return str.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
}

export const dynamicPrompt = function(v) {
  let prompt = stripComments(v)
  while (
    prompt.replace('\\{', '').includes('{') &&
    prompt.replace('\\}', '').includes('}')
  ) {
    const startIndex = prompt.replace('\\{', '00').indexOf('{')
    const endIndex = prompt.replace('\\}', '00').indexOf('}')

    const optionsString = prompt.substring(startIndex + 1, endIndex)
    const options = optionsString.split('|')

    const randomIndex = Math.floor(Math.random() * options.length)
    const randomOption = options[randomIndex]

    prompt =
      prompt.substring(0, startIndex) +
      randomOption +
      prompt.substring(endIndex + 1)
  }

  // Overwrite the value in the serialized workflow pnginfo
  // if (workflowNode?.widgets_values)
  //   workflowNode.widgets_values[widgetIndex] = prompt

  return prompt
}