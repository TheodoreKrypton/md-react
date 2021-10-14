import React from 'react';
import './App.css';
import marked from 'marked';

marked.use({
  'gfm': true,
  renderer: {
    paragraph(content) {
      return content;
    }
  }
})

const render = (s) => {
  return marked.parse(s);
}

const autoId = (() => {
  let i = 0;
  return () => {
    i += 1;
    return i;
  }
})();

const Block = (props) => {
  const [source, setSource] = React.useState(props.source);
  const [rendered, setRendered] = React.useState('');
  const [editing, setEditing] = React.useState(props.editing === true);
  const cursorPos = React.useRef(undefined);

  const onClick = React.useCallback((ev) => {
    ev.stopPropagation();
    props.setFocusedBlock({ block: props.getBlockInfo(props.id).block });
  }, [props]);

  const onChange = React.useCallback((ev) => {
    props.getBlockInfo(props.id).source = ev.target.value;
    props.breakLines(props.id);
    setSource(ev.target.value);
  }, [props]);

  const onBlur = React.useCallback(() => {
    setEditing(false);
  }, []);

  const self = React.useRef(null);
  const textAreaRef = React.useRef(null);

  const onKeyDown = React.useCallback((ev) => {
    if (ev.keyCode === 8 && textAreaRef.current.selectionStart === 0) { // backspace
      props.mergeBlocks(props.id);
    } else if (ev.keyCode === 38) {
      ev.preventDefault();
      props.dispatchEvent('moveup', { id: props.id, cursor: textAreaRef.current.selectionStart });
    } else if (ev.keyCode === 40) {
      ev.preventDefault();
      props.dispatchEvent('movedown', { id: props.id, cursor: textAreaRef.current.selectionStart });
    }
  }, [props]);

  React.useEffect(() => {
    setRendered(render(source));
  }, [source]);

  React.useEffect(() => {
    self.current.addEventListener('edit', ({ detail: { cursor } }) => {
      cursorPos.current = cursor;
      setEditing(true);
    });
    props.registerRef(self);
  }, [props]);

  const moveCursor = React.useCallback((pos) => {
    textAreaRef.current.setSelectionRange(pos, pos)
  }, []);

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
              rows={1}
              autoFocus
            />
          </td> : <td
            className="rendered"
            style={{ display: editing ? 'none' : 'table-cell' }}
            dangerouslySetInnerHTML={{ __html: rendered.length ? rendered : '<br>' }}
            onClick={onClick}
          >
          </td>
      }
    </tr >
  );
}

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
    const id = autoId();
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
    if (newLines.length > 1) {
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
    }
  }, [getBlockInfo, makeNewBlock, setFocusedBlock]);

  React.useEffect(() => {
    const block = makeNewBlock({ source: 'type here' });
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

  const onClick = React.useCallback(() => {
    setBlocks(blocks => {
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
  }, [blocks, getBlockInfo, onClick, setFocusedBlock]);

  const editor = React.useRef(null);
  const wordyArea = React.useRef(null);

  return (
    <>
      <div ref={editor} onClick={onClick} style={{ height: height }}>
        <table ref={wordyArea}>
          <tbody>
            {blocks.map(({ component }) => component)}
          </tbody>
        </table>
      </div>
    </>
  )
}

const App = () => {
  return <div style={{ position: 'absolute', paddingLeft: 20, paddingTop: 20, paddingRight: 20, boxSizing: 'border-box', width: '100%' }}><Markdown /></div>
}


export default App;
