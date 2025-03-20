(() => {
  var e = {
      86: (e) => {
        "use strict";
        e.exports = require("ws");
      },
      252: (e) => {
        "use strict";
        e.exports = require("express");
      },
      577: (e) => {
        "use strict";
        e.exports = require("cors");
      },
      896: (e) => {
        "use strict";
        e.exports = require("fs");
      },
      928: (e) => {
        "use strict";
        e.exports = require("path");
      },
    },
    s = {};
  function o(r) {
    var t = s[r];
    if (void 0 !== t) return t.exports;
    var n = (s[r] = { exports: {} });
    return e[r](n, n.exports, o), n.exports;
  }
  const r = o(252),
    t = o(86),
    n = o(577),
    i = o(896),
    c = (o(928), r());
  c.use(n());
  const l = c.listen(3e3, () => {
    console.log("Server running at http://localhost:3000");
  });
  new t.Server({ server: l }).on("connection", (e) => {
    console.log("Client connected"),
      e.on("message", (s) => {
        const o = `uploads/image_${Date.now()}.jpg`;
        i.writeFile(o, s, "binary", (s) => {
          s
            ? (console.error("Failed to save image:", s),
              e.send("Failed to upload image"))
            : (console.log("Image saved:", o),
              e.send("Image uploaded successfully"));
        });
      }),
      e.on("close", () => {
        console.log("Client disconnected");
      });
  });
  const a = "./uploads";
  i.existsSync(a) || i.mkdirSync(a);
})();
