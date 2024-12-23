/**
 * Split by "RANDOM" and choose random item
 * @param {string} str 
 * @returns 
 */
export function randomPrompt(str) {
  try {
    const arr =  str.split("RANDOM");
    if (arr.length <= 1) {
      return str;
    }

    // Start with RANDOM for strength
    if (arr[0].trim() == "") {
      arr.shift();
    }

    let { totalCount, totalStrength, prompts } = arr.reduce((acc, cur, index) => {
      let s = 1, 
          t = cur;

      const m = t.match(/^:[0-9](\.[0-9]+)?/);
      if (m) {
        s = parseFloat(m[0].substring(1));
        t = t.substring(m[0].length);
      }


      acc.totalCount++;
      acc.totalStrength += s;
      acc.prompts.push([s, t]);
      return acc;
    }, {
      totalCount: 0,
      totalStrength: 0,
      prompts: []
    });

    prompts = prompts.sort((a, b) => a[0] - b[0]);

    let seed = Math.random();
    let acc = 0;
    for (let i = 0; i < prompts.length; i++) {
      acc += prompts[i][0];
      str = prompts[i][1];
      if (seed < acc / totalStrength) {
        break;
      }
    }
  } catch(err) {
    console.error(err);
  }

  return str;
}