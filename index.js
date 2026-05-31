const express = require("express");
const axios = require("axios");

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

try {
const MAX_SIZE = 3 * 1024; // 3KB limit

const response = await axios({
url: targetUrl,
method: "GET",
responseType: "stream",
maxRedirects: 10,
maxContentLength: MAX_SIZE,
maxBodyLength: MAX_SIZE,
headers: {
Accept: "*/*",
"Accept-Language": "en-US,en;q=0.8",
"Cache-Control": "no-cache",
Origin: "https://kwik.cx",
Pragma: "no-cache",
Priority: "u=1, i",
Referer: "https://kwik.cx/",
"Sec-CH-UA":
'"Chromium";v="148", "Brave";v="148", "Not/A)Brand";v="99"',
"Sec-CH-UA-Mobile": "?1",
"Sec-CH-UA-Platform": '"Android"',
"Sec-Fetch-Dest": "empty",
"Sec-Fetch-Mode": "cors",
"Sec-Fetch-Site": "cross-site",
"Sec-GPC": "1",
"User-Agent":
"Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
},
});

res.set("Access-Control-Allow-Origin", "*");

for (const [key, value] of Object.entries(response.headers)) {
  if (key.toLowerCase() !== "set-cookie") {
    res.setHeader(key, value);
  }
}

response.data.pipe(res);

} catch (error) {
const status = error.response?.status || 500;

res.status(status).send(
  error.response?.data ||
  error.message ||
  "Internal Server Error"
);

}
});

app.listen(PORT, () => {
console.log(`Proxy running on port ${PORT}`);
});