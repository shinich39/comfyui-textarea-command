/**
 * Remove start with "// " lines
 * @param {string} str 
 * @returns 
 */
export function disablePrompt(str) {
  try {
    str = str.split("\n")
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

  return str;
}