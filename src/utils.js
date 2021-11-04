const autoId = (() => {
  let i = 0;
  return () => {
    i += 1;
    return i;
  }
})();

const utils = {
  autoId,
}

export default utils;