import React from 'react';
import parse from '../parser'

import './rendered.css';

const Editable = (props) => {
  const { children, onChange } = props;

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
    console.log(analyzed);
    if (analyzed.length === 0) {
      setText("");
      return;
    }

    if (analyzed.length > 1) {
      throw new Error('unexpected two lines')
    }
    const tokens = analyzed[0].tokens

    if (tokens.length === 1) {
      setText(newText);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const element = React.useMemo(() => {
    return React.createElement(children.type, {
      contentEditable: true,
      onInput: onInput,
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

  const onChange = React.useCallback((newText) => {
    model.text = newText;
    if (newText === "") {
      rerender();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (model.type === 'text') {
      setView(<Editable onChange={onChange}><span>{model.text}</span></Editable>)
    } else if (model.type === 'codespan') {
      setView(<Editable onChange={onChange}><code>{model.text}</code></Editable>)
    } else {
      const children = model.children.map((child, i) => <Node model={child} key={i} rerender={rerender} />);
      if (model.type === 'heading') {
        setView(<h1>{children}</h1>)
      } else if (model.type === 'list_item') {
        setView(<li>{children}</li>)
      } else {
        setView(<>{children}</>)
      }
    }
  }, [model, onChange, rerender]);

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
    if (item.tokens) {
      node.children = item.tokens.map(createNode);
    } else if (item.type === "list") {
      node.children = item.items.map(createNode);
    } else {
      node.text = item.text;
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
    if (this.type === 'text' || this.type === '') {
      return text;
    } else if (this.type === 'codespan') {
      return `\`${text}\``
    } else if (this.type === 'heading') {
      return `# ${text}`
    } else {
      return "error"
    }
  }
}

const Rendered = (props) => {
  const { source } = props;

  const [model, setModel] = React.useState(constructTree(source));
  const [view, setView] = React.useState(null);

  const rerender = React.useCallback(() => {
    setModel(constructTree(model.source()));
  }, [model]);

  React.useEffect(() => {
    setView(<Node model={model} rerender={rerender} />);
  }, [model, rerender]);

  return <>{view}</>
}

export default Rendered;