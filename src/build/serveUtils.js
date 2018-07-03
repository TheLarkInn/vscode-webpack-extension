exports.getServeUrlFromOptions = ({ host, port, protocol }) => {
  return `${protocol}://${host}:${port}`;
};
