const express = require("express");
const { spawn } = require("child_process");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("K-Anime Proxy Active. Please provide a 'vid' parameter.");
});

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.vid;

  if (!targetUrl) {
    return res.status(400).send("Error: No video URL provided");
  }

  // Basic validation to avoid this becoming an open proxy
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return res.status(400).send("Error: Invalid URL");
  }
  if (!/owocdn\.top$|kwik\.cx$/.test(parsed.hostname)) {
    return res.status(400).send("Error: Host not allowed");
  }

  const curlArgs = [
    "-s",
    "-D", "-", // dump response headers to stdout, separated from body
    "--max-time", "30",
    "-H", "Accept: */*",
    "-H", "Accept-Language: en-US,en;q=0.8",
    "-H", "Cache-Control: no-cache",
    "-H", "Origin: https://kwik.cx",
    "-H", "Pragma: no-cache",
    "-H", "Priority: u=1, i",
    "-H", "Referer: https://kwik.cx/",
    "-H", 'Sec-CH-UA: "Chromium";v="148", "Brave";v="148", "Not/A)Brand";v="99"',
    "-H", "Sec-CH-UA-Mobile: ?1",
    "-H", 'Sec-CH-UA-Platform: "Android"',
    "-H", "Sec-Fetch-Dest: empty",
    "-H", "Sec-Fetch-Mode: cors",
    "-H", "Sec-Fetch-Site: cross-site",
    "-H", "Sec-GPC: 1",
    "-H", "User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
    targetUrl,
  ];

  const curl = spawn("curl", curlArgs);

  let headersParsed = false;
  let headerBuffer = "";
  let statusCode = 200;

  res.set("Access-Control-Allow-Origin", "*");

  curl.stdout.on("data", (chunk) => {
    if (!headersParsed) {
      headerBuffer += chunk.toString("latin1");
      const sep = headerBuffer.indexOf("\r\n\r\n");

      if (sep !== -1) {
        headersParsed = true;
        const rawHeaders = headerBuffer.slice(0, sep).split("\r\n");
        const bodyStart = headerBuffer.slice(sep + 4);

        // First line is the status line: "HTTP/1.1 200 OK"
        const statusLine = rawHeaders.shift();
        const statusMatch = statusLine.match(/HTTP\/[\d.]+\s+(\d+)/);
        statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 200;

        for (const line of rawHeaders) {
          const idx = line.indexOf(":");
          if (idx === -1) continue;
          const key = line.slice(0, idx).trim();
          const value = line.slice(idx + 1).trim();
          if (key.toLowerCase() !== "set-cookie" && key.toLowerCase() !== "transfer-encoding") {
            res.setHeader(key, value);
          }
        }

        res.status(statusCode);

        if (bodyStart.length) {
          res.write(Buffer.from(bodyStart, "latin1"));
        }
      }
    } else {
      res.write(chunk);
    }
  });

  curl.stderr.on("data", (data) => {
    console.error(`curl stderr: ${data}`);
  });

  curl.on("close", (code) => {
    if (!headersParsed) {
      // curl never returned a parseable response (network error, timeout, etc.)
      res.status(502).send("Error: curl failed to fetch target");
    } else {
      res.end();
    }
  });

  curl.on("error", (err) => {
    console.error("Failed to spawn curl:", err);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error");
    }
  });

  req.on("close", () => {
    if (!curl.killed) curl.kill();
  });
});

app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
