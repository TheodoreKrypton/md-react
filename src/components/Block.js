import React from 'react';
import Rendered from './Rendered';

function insert(str, index, value) {
  return str.slice(0, index) + value + str.slice(index);
}

const Block = (props) => {
  const onClick = React.useCallback((ev) => {
    ev.stopPropagation();
    props.setFocusedBlock(props.getBlockInfo(props.id).block);
  }, [props]);

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
    props.registerRef(self);
  }, [props]);

  return (
    <tr ref={self} className="outer" width="100%">
      <td
        ref={renderedRef}
        className="rendered"
        style={{ display: 'table-cell' }}
        onClick={onClick}
      >
        <Rendered source="123" />
      </td>
    </tr >
  );
}

export default Block;