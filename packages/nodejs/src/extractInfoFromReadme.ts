export default async function* exportInfoFromReadme(
  iterator: AsyncIterable<string>
) {
  const handleLine = /^\* \[([^\]]+)\]\(/;
  const nameAndEmailLine = /^\s\s\*\*([^*]+)\*\* <<([^>]+)>>(?: \([^)]+\))?$/;
  let isInsideTSCSection = false;
  let currentMemberHandle;
  for await (const line of iterator) {
    if (currentMemberHandle != null) {
      const [, name, email] = nameAndEmailLine.exec(line);
      yield { handle: currentMemberHandle, name, email };
      currentMemberHandle = null;
    } else if (isInsideTSCSection && line === "<details>") {
      break;
    } else if (isInsideTSCSection && line.charAt(0) === "*") {
      currentMemberHandle = handleLine.exec(line)[1];
    } else if (line === "### TSC (Technical Steering Committee)") {
      isInsideTSCSection = true;
    }
  }
}
