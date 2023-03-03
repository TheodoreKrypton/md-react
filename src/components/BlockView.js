import React from 'react';
import Rendered from './Rendered';

const BlockView = (props) => {
  const { block } = props;

  const onClick = React.useCallback((ev) => {
    ev.stopPropagation();
  }, []);

  const self = React.useRef(null);
  const renderedRef = React.useRef(null);

  // const onKeyDown = React.useCallback((ev) => {
  //   if (ev.keyCode === 8 && selectionStart === 0 && ta.value.length === 0) { // backspace
  //     props.mergeBlocks(props.id);
  //   } else if (ev.keyCode === 9) { // tab
  //     ev.preventDefault();
  //     ta.value = insert(ta.value, selectionStart, '\t');
  //     moveCursor(selectionStart + 1);
  //   } else if (ev.keyCode === 38) { // move up
  //     ev.preventDefault();
  //     props.dispatchEvent('moveup', { id: props.id, cursor: selectionStart });
  //   } else if (ev.keyCode === 40) { // move down
  //     ev.preventDefault();
  //     props.dispatchEvent('movedown', { id: props.id, cursor: selectionStart });
  //   }
  // }, [props, moveCursor]);

  React.useEffect(() => {
    block.ref = self;
  }, [block]);

  return (
    <tr ref={self} className="outer" width="100%">
      <td
        ref={renderedRef}
        className="rendered"
        style={{ display: 'table-cell' }}
        onClick={onClick}
      >
        <Rendered block={block} />
      </td>
    </tr >
  );
}

export default BlockView;