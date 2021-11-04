import React from 'react';
import Rendered from './Rendered';

function insert(str, index, value) {
  return str.slice(0, index) + value + str.slice(index);
}

const Block = (props) => {
  const [source, setSource] = React.useState(props.source);
  const [rendered, setRendered] = React.useState('');
  const [editing, setEditing] = React.useState(false);
  const [lines, setLines] = React.useState(null); // null for single line, integer > 0 for multi-line

  const cursorPos = React.useRef(undefined);

  const onClick = React.useCallback((ev) => {
    ev.stopPropagation();
    if (!editing) {
      const selection = window.getSelection();
      const node = selection.focusNode.parentNode;
      const begin = parseInt(node.getAttribute('data-begin')) - 1;
      const renderedOffset = selection.focusOffset;
      const renderedText = node.textContent;
      let i = begin;
      for (let j = 0; j < renderedOffset; j++) {
        while (source[i] !== renderedText[j]) {
          i++;
        }
      }
      props.setFocusedBlock({ block: props.getBlockInfo(props.id).block, cursor: i + 1 });
    }
  }, [editing, props, source]);

  const onChange = React.useCallback((ev) => {
    props.getBlockInfo(props.id).source = ev.target.value;
    if (ev.target.value.indexOf('\n') !== -1) {
      props.breakLines(props.id);
    } else {
      setSource(ev.target.value);
    }
  }, [props]);

  const onBlur = React.useCallback(() => {
    setEditing(false);
  }, []);

  const self = React.useRef(null);
  const textAreaRef = React.useRef(null);
  const renderedRef = React.useRef(null);

  const moveCursor = React.useCallback((pos) => {
    textAreaRef.current.setSelectionRange(pos, pos);
  }, []);

  const onKeyDown = React.useCallback((ev) => {
    const ta = textAreaRef.current;
    const { selectionStart } = ta;

    if (ev.keyCode === 8 && selectionStart === 0 && ta.value.length === 0) { // backspace
      props.mergeBlocks(props.id);
    } else if (ev.keyCode === 9) { // tab
      ev.preventDefault();
      ta.value = insert(ta.value, selectionStart, '\t');
      moveCursor(selectionStart + 1);
    } else if (ev.keyCode === 38) { // move up
      ev.preventDefault();
      props.dispatchEvent('moveup', { id: props.id, cursor: selectionStart });
    } else if (ev.keyCode === 40) { // move down
      ev.preventDefault();
      props.dispatchEvent('movedown', { id: props.id, cursor: selectionStart });
    }
  }, [props, moveCursor]);

  React.useEffect(() => {
    if (editing === false) {
      setRendered(<Rendered source={source} />)
    }
  }, [editing, source]);

  React.useEffect(() => {
    self.current.addEventListener('edit', ({ detail: { cursor } }) => {
      cursorPos.current = cursor;
      setEditing(true);
    });
    props.registerRef(self);
  }, [props]);

  React.useEffect(() => {
    if (editing === true && cursorPos.current !== null) {
      if (cursorPos.current !== undefined) {
        moveCursor(cursorPos.current);
      } else {
        textAreaRef.current.setSelectionRange(textAreaRef.current.value.length);
      }
      cursorPos.current = null;
    }
  }, [editing, moveCursor]);

  return (
    <tr ref={self} className="outer" width="100%" onBlur={onBlur}>
      {
        editing ?
          <td>
            <textarea
              ref={textAreaRef}
              style={{ display: editing ? 'table-cell' : 'none' }}
              value={source}
              onChange={onChange}
              onKeyDown={onKeyDown}
              onClick={onClick}
              rows={lines === null ? 1 : lines}
              autoFocus
            />
          </td> : <td
            ref={renderedRef}
            className="rendered"
            style={{ display: editing ? 'none' : 'table-cell' }}
            onClick={onClick}
          >
            {rendered}
          </td>
      }
    </tr >
  );
}

export default Block;