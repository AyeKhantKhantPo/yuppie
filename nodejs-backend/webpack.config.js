const nodeExternals = require("webpack-node-externals");

module.exports = {
  entry: "./server.js",
  target: "node",
  externals: [nodeExternals()],
  output: {
    filename: "bundle.js",
    path: __dirname + "/dist",
  },
};
