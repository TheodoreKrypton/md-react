import React from 'react';
import parse from '../parser'

import './rendered.css';

const Editable = (props) => {
  const { children, onChange, onBlur, model } = props;

  React.useEffect(() => {
    if (children.length !== undefined) {
      throw new Error('Editable can only have one child');
    }
  }, [children]);

  const [text, setText] = React.useState(children.props.children);

  const onKeyDown = React.useCallback((e) => {
    const { anchorOffset: offset } = window.getSelection();
    if (e.key === "ArrowLeft" && offset === 0) {
      const prev = model.left();
      if (!prev) {
        return;
      }
      const elem = prev.ref.current;
      const selection = window.getSelection();
      const range = document.createRange();
      selection.removeAllRanges();
      range.selectNodeContents(elem);
      range.collapse(false);
      selection.addRange(range);
      elem.focus();
    } else if (e.key === "ArrowRight" && offset === e.currentTarget.textContent.length) {
      const next = model.right();
      if (!next) {
        return;
      }
      next.ref.current.focus();
    }
  }, [model]);

  const onInput = React.useCallback((e) => {
    const newText = e.currentTarget.textContent;
    onChange(newText);

    const analyzed = parse(newText);
    if (analyzed.length === 0) {
      setText("");
      return;
    }

    if (analyzed.length > 1) {
      throw new Error('unexpected two lines')
    }

    if ((analyzed[0].items && analyzed[0].items.length === 1) ||
      (analyzed[0].tokens && analyzed[0].tokens.length === 1)) {
      setText(newText);
      return;
    }
  }, [onChange]);

  const inputRef = React.useRef();

  const element = React.useMemo(() => {
    model.ref = inputRef;
    return React.createElement(children.type, {
      contentEditable: true,
      ref: model.ref,
      onInput: onInput,
      onKeyDown: onKeyDown,
      onBlur: onBlur,
      dangerouslySetInnerHTML: {
        __html: text
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children.type, model, onInput, onBlur]);

  return element;
}

const Empty = () => {
  return <span contentEditable>&nbsp;</span>
}

const Node = (props) => {
  const { model, rerender } = props;

  const [view, setView] = React.useState(null);

  React.useEffect(() => {
    const onChange = (newText) => {
      model.text = newText;
    }

    const onBlur = () => {
      rerender();
    }

    if (model.type === 'text') {
      setView(<Editable onChange={onChange} onBlur={onBlur} model={model}><span>{model.text}</span></Editable>)
    } else if (model.type === 'codespan') {
      setView(<Editable onChange={onChange} onBlur={onBlur} model={model}><code>{model.text}</code></Editable>)
    } else {
      const children = model.children.map((child, i) => <Node model={child} key={i} rerender={rerender} />);
      if (model.type === 'heading') {
        setView(<h1>{children}</h1>)
      } else if (model.type === 'list_item') {
        setView(<li>{children}</li>)
      } else if (model.type === 'strong') {
        setView(<strong>{children}</strong>)
      } else if (model.type === 'em') {
        setView(<em>{children}</em>)
      } else {
        setView(<>{children}</>)
      }
    }
  }, [model, rerender]);

  return <>{view}</>
}

const constructTree = (source) => {
  if (source === "") {
    const root = new NodeModel();
    root.text = "";
    return root;
  }

  const items = parse(source);

  const createNode = (item) => {
    const node = new NodeModel();
    node.type = item.type;

    const createFromArray = (array) => {
      return array.map((item, i) => {
        const child_node = createNode(item);
        child_node.idx = i;
        child_node.parent = node;
        return child_node;
      });
    }

    if (item.type === "text") {
      node.text = item.text
    } else if (item.type === "list") {
      node.children = createFromArray(item.items);
    } else if (item.tokens) {
      node.children = createFromArray(item.tokens);
    } else {
      throw new Error(`unexpected item type ${item.type}`)
    }
    return node;
  }

  const root = new NodeModel();
  root.children = items.map(createNode);
  return root;
}

class NodeModel {
  constructor() {
    this.type = ""
    this.text = "";

    this.idx = 0;
    this.children = [];
    this.parent = null;

    this.ref = null;
  }

  source() {
    const text = this.children.length > 0 ? this.children.map((child) => child.source()).join('') : this.text;
    if (text === "") {
      return "";
    }
    if (this.type === 'codespan') {
      return `\`${text}\``
    } else if (this.type === 'heading') {
      return `# ${text}`
    } else if (this.type === 'list_item') {
      return `* ${text}`
    } else if (this.type === 'strong') {
      return `**${text}**`
    } else if (this.type === 'em') {
      return `*${text}*`
    } else {
      return text
    }
  }

  setRef(ref) {
    this.ref = ref;
  }

  left() {
    if (!this.parent) {
      return null;
    }
    const left = this.idx === 0 ?
      this.parent.left() : this.parent.children[this.idx - 1].rightest_leaf();
    return left && left.rightest_leaf();
  }

  leftest_leaf() {
    if (this.children.length === 0) {
      return this;
    }
    return this.children[0].leftest_leaf();
  }

  right() {
    if (!this.parent) {
      return null;
    }
    const right = this.idx === this.parent.children.length - 1 ?
      this.parent.right() : this.parent.children[this.idx + 1];
    return right && right.leftest_leaf();
  }

  rightest_leaf() {
    if (this.children.length === 0) {
      return this;
    }
    return this.children[this.children.length - 1].rightest_leaf();
  }
}

const Rendered = (props) => {
  const { block } = props;

  const [model, setModel] = React.useState(constructTree(block.source));
  const [view, setView] = React.useState(null);

  const rerender = React.useCallback(() => {
    block.source = model.source();
    setModel(constructTree(block.source));
  }, [block, model]);

  React.useEffect(() => {
    setView(<Node model={model} rerender={rerender} />);
  }, [model, rerender]);

  return <>{view}</>
}

export default Rendered;