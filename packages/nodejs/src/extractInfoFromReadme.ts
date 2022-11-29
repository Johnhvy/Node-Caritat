export default async function exportInfoFromReadme(
  iterator: AsyncIterable<string>
) {
  let list = "";
  const info = /^\s\s\*\*([^*]+)\*\* <<([^>]+)>>(?: \([^)]+\))?$/;
  let isInsideTSCSection = false;
  for await (const line of iterator) {
    if (isInsideTSCSection && line === "<details>") {
      break;
    } else if (isInsideTSCSection && !"*<".includes(line.charAt(0))) {
      const [, name, email] = info.exec(line);
      list += `* ${name} <${email}>\n`;
    } else if (line === "### TSC (Technical Steering Committee)") {
      isInsideTSCSection = true;
    }
  }

  return list;
}
