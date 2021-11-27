function split(content, context)
{
    if (xdmp.nodeKind(content.value) == 'document' &&
        content.value.documentFormat == 'JSON') {
        const result = [];
        for (const doc of content.value.toObject()) {
            let uri = doc.uri;
            if (result.some(e => e.uri === uri)) {
              // skip the duplicate
              console.log("duplicate detected "+uri);
              continue;
            }
            result.push({
                uri: uri,
                value: doc.content
            });
        }
        return Sequence.from(result);
    }
    return content;
};

exports.split = split;