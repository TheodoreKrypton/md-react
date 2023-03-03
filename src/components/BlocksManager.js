const autoId = (() => {
  let i = 0;
  return () => {
    i += 1;
    return i;
  }
})();

class Block {
  constructor(source) {
    this.source = source;
    this.id = autoId();
    this.next = null;
    this.prev = null;

    this.ref = null;
  }

  focus() {
    this.ref.current.focus();
  }

  setSource(source) {
    this.source = source;
  }
}

class BlocksManager {
  #idToBlock = {};
  #head = null;
  #tail = null;

  constructor() {
    const block = new Block("123");
    this.#idToBlock[block.id] = block;
    this.#head = block;
    this.#tail = block;
  }

  #newBlock(source) {
    const block = new Block(source);
    this.#idToBlock[block.id] = block;
    return block;
  }

  #removeBlock(id) {
    const block = this.getBlock(id);
    if (block !== this.#head) {
      block.prev.next = block.next;
    }
    if (block !== this.#tail) {
      block.next.prev = block.prev;
    }
    return block;
  }

  getBlock(id) {
    return this.#idToBlock[id];
  }

  head() {
    return this.#head;
  }

  tail() {
    return this.#tail;
  }

  breakBlock(id, sources) {
    const blockToBreak = this.#removeBlock(id);
    const newBlocks = sources.map((source) => this.#newBlock(source));

    for (let i = 0; i < newBlocks.length - 1; i++) {
      newBlocks[i].next = newBlocks[i + 1];
      newBlocks[i + 1].prev = newBlocks[i];
    }
    if (blockToBreak !== this.#head) {
      blockToBreak.prev.next = newBlocks[0];
      newBlocks[0].prev = blockToBreak.prev;
    } else {
      this.#head = newBlocks[0];
    }

    if (blockToBreak !== this.#tail) {
      blockToBreak.next.prev = newBlocks[newBlocks.length - 1];
      newBlocks[newBlocks.length - 1].next = blockToBreak.next;
    } else {
      this.#tail = newBlocks[newBlocks.length - 1];
    }

    delete this.#idToBlock[id];

    return newBlocks.map((b) => b.id);
  }

  insertBlockAfter(id, source = "") {
    const [, block] = this.breakBlock(id, [this.getBlock(id).source, source]);
    return block.id;
  }

  insertBlockBefore(id, source = "") {
    const block = this.breakBlock(id, [source, this.getBlock(id).source]);
    return block.id;
  }

  mergeWithPrev(id) {
    const block = this.getBlock(id);
    if (block !== this.#head) {
      this.#removeBlock(id);
      block.prev.source.concat(block.source);
      return block.prev.id;
    }
  }

  map(fn) {
    const result = [];
    let block = this.#head;
    while (block != null) {
      result.push(fn(block));
      block = block.next;
    }
    return result;
  }
}

export default BlocksManager;