function getBegin(text) {
  return text.begin ? text.begin : 0;
}

const mod = {
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
}


export default mod;