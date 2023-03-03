import React from 'react';
import BlocksManager from './BlocksManager';
import BlockView from './BlockView';

const bm = new BlocksManager();

const Markdown = () => {
  const [height, setHeight] = React.useState(window.innerHeight / 2);
  const [blocks, setBlocks] = React.useState([]);

  // const dispatchEvent = React.useCallback((event, args) => {
  //   editor.current.dispatchEvent(new CustomEvent(event, { detail: args }));
  // }, []);

  const updateBlocks = React.useCallback(() => {
    setBlocks(bm.map((block) => <BlockView block={block} key={block.id} />));
  }, []);

  /*
    Click on the empty area of the editor to create a new block when the last block is not empty.
  */
  const onClick = React.useCallback((ev) => {
    if (ev.target !== ev.currentTarget) {
      return;
    }
    if (bm.tail().source.length === 0) {
      bm.tail().focus();
    } else {
      bm.insertBlockAfter(bm.tail().id);
      updateBlocks();
    }
  }, [updateBlocks]);

  React.useEffect(() => {
    editor.current.addEventListener('moveup', ({ detail: { id } }) => {
      bm.getBlock(id).prev.focus();
    });
    editor.current.addEventListener('movedown', ({ detail: { id } }) => {
      bm.getBlock(id).next.focus();
    });

    editor.current.addEventListener('click', onClick);
  }, [onClick]);

  React.useEffect(() => {
    updateBlocks();
  }, [updateBlocks]);

  const editor = React.useRef(null);
  const wordyArea = React.useRef(null);

  return (
    <>
      <div ref={editor} style={{ height: height }}>
        <table ref={wordyArea}>
          <tbody>
            {blocks}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default Markdown;