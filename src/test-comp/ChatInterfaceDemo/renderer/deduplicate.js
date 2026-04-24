/**
 * Dedupe a questions map (as emitted by ChatInterface.subscribe) into an
 * ordered array, collapsing duplicates that share a messageId / reqId / cId / id.
 *
 * Ported from CDN_support: src/test-comp/ChatInterfaceDemo/ChatInterface.jsx
 */
export function deduplicateQuestions(questions) {
    if (!questions) return [];
    const questionList = Object.values(questions);
    const seen = new Set();
    const deduped = [];
    for (let i = 0; i < questionList.length; i++) {
        const item = questionList[i];
        const key =
            (item?.messageId ? `m:${item.messageId}` : null) ||
            (item?.reqId ? `r:${item.reqId}` : null) ||
            (item?.cId ? `c:${item.cId}` : null) ||
            (item?.id ? `i:${item.id}` : `idx:${i}`);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(item);
    }
    return deduped;
}
