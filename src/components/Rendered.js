import React from 'react';
import parse from '../parser'

import './rendered.css';

const Editable = (props) => {
  const { children, onChange, onBlur } = props;

  React.useEffect(() => {
    if (children.length !== undefined) {
      throw new Error('Editable can only have one child');
    }
  }, [children]);

  const [text, setText] = React.useState(children.props.children);

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

  const element = React.useMemo(() => {
    return React.createElement(children.type, {
      contentEditable: true,
      onInput: onInput,
      onBlur: onBlur,
      dangerouslySetInnerHTML: {
        __html: text
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children.type, onInput]);

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

    const onBlur = (ev) => {
      console.log("123");
      rerender();
    }

    if (model.type === 'text') {
      setView(<Editable onChange={onChange} onBlur={onBlur}><span>{model.text}</span></Editable>)
    } else if (model.type === 'codespan') {
      setView(<Editable onChange={onChange} onBlur={onBlur}><code>{model.text}</code></Editable>)
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
    node.type = item.type
    if (item.type === "text") {
      node.text = item.text
    } else if (item.type === "list") {
      node.children = item.items.map(createNode);
    } else if (item.tokens) {
      node.children = item.tokens.map(createNode);
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
    this.children = [];
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