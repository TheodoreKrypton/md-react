import React from 'react';
import Block from './Block';
import utils from '../utils';

const Markdown = () => {
  const [blocks, setBlocks] = React.useState([]);
  const [height, setHeight] = React.useState(window.innerHeight / 2);

  const [focusedBlock, setFocusedBlock] = React.useState({ block: null, cursor: null });

  const [setBlockInfoTable, getBlockInfo] = React.useMemo(() => {
    const blks = {};
    return [(k, v) => { blks[k] = v }, (k) => blks[k]];
  }, []);

  const dispatchEvent = React.useCallback((event, args) => {
    editor.current.dispatchEvent(new CustomEvent(event, { detail: args }));
  }, []);

  const makeNewBlock = React.useCallback(({ source }) => {
    const id = utils.autoId();
    const block = {
      component:
        <Block
          source={source}
          key={id}
          id={id}
          getBlockInfo={getBlockInfo}
          mergeBlocks={mergeBlocks}
          breakLines={breakLines}
          dispatchEvent={dispatchEvent}
          setFocusedBlock={setFocusedBlock}
          registerRef={(ref) => { block.ref = ref }}
        />,
      id,
      ref: null,
    };
    setBlockInfoTable(id, { block, source });
    return block;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mergeBlocks = React.useCallback((key) => {
    setBlocks((blocks) => {
      const res = [];
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].id === key) {
          if (i === 0) {
            continue
          } else {
            const previousBlock = getBlockInfo(blocks[i - 1].id);
            res[i - 1] = makeNewBlock({ source: `${previousBlock.source}${getBlockInfo(blocks[i].id).source}` });
            setFocusedBlock({ block: res[i - 1], cursor: previousBlock.source.length });
          }
        } else {
          res.push(blocks[i])
        }
      }
      return res;
    });
  }, [getBlockInfo, makeNewBlock]);

  const breakLines = React.useCallback((id) => {
    const newLines = getBlockInfo(id).source.split('\n');
    const newBlocks = newLines.map((line) => makeNewBlock({ source: line }));
    setBlocks((blocks) => {
      let res = [];
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].id === id) {
          res = [...res, ...newBlocks];
        } else {
          res.push(blocks[i]);
        }
      }
      return res;
    });
    setFocusedBlock({ block: newBlocks[newBlocks.length - 1], cursor: 0 });
  }, [getBlockInfo, makeNewBlock, setFocusedBlock]);

  React.useEffect(() => {
    const block = makeNewBlock({ source: '' });
    setFocusedBlock({ block });
    setBlocks([block]);
  }, [makeNewBlock]);

  React.useEffect(() => {
    if (!focusedBlock.block) {
      return;
    }
    const { block, cursor } = focusedBlock;
    block.ref.current.dispatchEvent(new CustomEvent('edit', { detail: { cursor: cursor === undefined ? getBlockInfo(block.id).source.length : cursor } }));
  }, [focusedBlock, getBlockInfo])

  /*
    Click on the empty area of the editor to create a new block when the last block is not empty.
  */
  const onClick = React.useCallback((ev) => {
    if (ev.target !== ev.currentTarget) {
      return;
    }
    setBlocks(blocks => {
      // If the last block is empty, focus on it.
      if (blocks.length > 0 && getBlockInfo(blocks[blocks.length - 1].id).source.length === 0) {
        setFocusedBlock({ block: blocks[blocks.length - 1] });
        return blocks;
      } else {
        const block = makeNewBlock({ source: '' });
        setFocusedBlock({ block });
        return [...blocks, block];
      }
    });
  }, [getBlockInfo, makeNewBlock, setFocusedBlock]);

  React.useEffect(() => {
    editor.current.addEventListener('moveup', ({ detail: { id, cursor } }) => {
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].id === id) {
          if (i === 0) {
            continue;
          } else {
            setFocusedBlock({ block: blocks[i - 1], cursor: Math.min(cursor, getBlockInfo(blocks[i - 1].id).source.length) });
          }
        }
      }
    });
    editor.current.addEventListener('movedown', ({ detail: { id, cursor } }) => {
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].id === id) {
          if (i === blocks.length - 1) {
            onClick();
          } else {
            setFocusedBlock({ block: blocks[i + 1], cursor: Math.min(cursor, getBlockInfo(blocks[i + 1].id).source.length) });
          }
        }
      }
    });
    editor.current.addEventListener('selectionBegin', ({ detail: { id, cursor } }) => {
      selectionBegin.current = { id, cursor };
    })
    editor.current.addEventListener('selectionEnd', ({ detail: { id, cursor } }) => {
      const begin = selectionBegin.current;

      if (begin === null) {
        return;
      }
      const end = { id, cursor };

      (() => {
        for (let i = 0; i < blocks.length; i++) {
          if (blocks[i].id === begin.id) {
            for (let j = i + 1; j < blocks.length; j++) {
              if (blocks[j].id === end.id) {
                return;
              }
            }
            return;
          }
        }
      })();

      selectionBegin.current = null;
    });

    editor.current.addEventListener('click', onClick);
  }, [blocks, getBlockInfo, onClick, setFocusedBlock]);



  const editor = React.useRef(null);
  const wordyArea = React.useRef(null);
  const selectionBegin = React.useRef(null);

  return (
    <>
      <div ref={editor} style={{ height: height }}>
        <table ref={wordyArea}>
          <tbody>
            {blocks.map(({ component }) => component)}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default Markdown;