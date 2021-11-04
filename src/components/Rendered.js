import React from 'react';
import marked from 'marked';

function getBegin(text) {
  return text.begin ? text.begin : 0;
}

marked.use({
  'gfm': true,
  renderer: {
    paragraph(content) {
      return content;
    },
    text(text) {
      return `<span data-begin=${getBegin(text)}>${text}</span>`
    },
    code(text) {
      return `<code data-begin=${getBegin(text)}>${text}</code>`
    },
    codespan(text) {
      return `<code data-begin=${getBegin(text)}>${text}</code>`
    }
  },
});

const Rendered = (props) => {
  const { source } = props;

  const ref = React.useRef(null);

  const render = React.useCallback((source) => {
    const walk = (tokens, begin) => {
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
            token.text = new String(token.text);
            token.text.begin = begin + offset;
          }
          offset += token.raw.length;
        }
      }
    }
    const tokens = marked.lexer(source);
    walk(tokens, 0);
    const html = marked.parser(tokens);
    return html;
  }, []);

  React.useEffect(() => {
    if (source) {
      ref.current.innerHTML = render(source);
    } else {
      ref.current.innerHTML = "<br/>"
    }
  }, [render, source]);

  return <div ref={ref}></div>
}

export default Rendered;