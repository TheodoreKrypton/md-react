import mod from './modifications';
import walk from './walk';
import { marked } from 'marked'

marked.use(mod);

marked.Lexer.rules.block.code.exec = function (src) {
  return false;
}

function parse(md) {
  const tokens = marked.lexer(md);
  walk(tokens, 0);
  return tokens;
}

export default parse;