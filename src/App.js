import React from 'react';
import './App.css';
import marked from 'marked';

marked.use({
  'gfm': true,
  renderer: {
    paragraph(content) {
      return content;
    },
    text(text) {
      return `<span data-begin="${text.begin}">${text}</span>`
    }
  },
});

const autoId = (() => {
  let i = 0;
  return () => {
    i += 1;
    return i;
  }
})();

const Rendered = (props) => {
  const { source } = props;

  const ref = React.useRef(null);

  const render = React.useCallback((source) => {
    let cursor = 0;
    const walk = (token) => {
      if (token.type === 'text') {
        // eslint-disable-next-line no-new-wrappers
        token.text = new String(token.text);
        token.text.begin = cursor;
        cursor += token.text.length;
      } else {
        cursor += token.raw.length - token.text.length;
        token.tokens.forEach(walk);
      }
    }
    const tokens = marked.lexer(source);
    tokens.forEach(walk);
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

const Block = (props) => {
  const [source, setSource] = React.useState(props.source);
  const [rendered, setRendered] = React.useState('');
  const [editing, setEditing] = React.useState(props.editing === true);
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
        console.log(source[i], renderedText[j])
        while (source[i] !== renderedText[j]) {
          i++;
        }
      }
      props.setFocusedBlock({ block: props.getBlockInfo(props.id).block, cursor: i + 1 });
    }
  }, [editing, props, source]);

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
  const renderedRef = React.useRef(null);

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
    const block = makeNewBlock({ source: '# type here *here* here' });
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
