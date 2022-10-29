function walk(tokens, begin) {
  let offset = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'list') {
      walk(token.items, begin + offset);
    } else {
      if (token.tokens && token.tokens.length > 0) {
        walk(token.tokens, begin + offset);
      } else {
        // eslint-disable-next-line no-new-wrappers
        //token.text = new String(token.text);
        //token.text.begin = begin + offset;
      }
      offset += token.raw.length;
    }
  }
}

export default walk;