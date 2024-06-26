require("dotenv").config(); // this is for heroku
const express = require("express");
const querystring = require("querystring");
const app = express();
const axios = require("axios");
const path = require("path");
const cors = require("cors"); // this is for heroku

app.use(cors()); // this is for heroku

const allowedOrigin = ['https://aviad-spotify-profile-24b1df1946bf.herokuapp.com','http://localhost:3000'];
app.use(cors({
  origin: allowedOrigin
}));

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const FRONTEND_URI = process.env.FRONTEND_URI;
const PORT = process.env.PORT || 8888; // process.env.PORT is for heroku

app.use(express.static(path.join(__dirname, "./client/build"))); // this is for heroku

app.get("/", (req, res) => {
  res.send("Meow!");
});

const generateRandomString = (length) => {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const stateKey = "spotify_auth_state";

app.get("/login", (req, res) => {
  const state = generateRandomString(16); // this is for security
  res.cookie(stateKey, state); // this is for security

  const queryParam = querystring.stringify({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    state: state,
    scope: ["user-read-private", "user-read-email", "user-top-read"].join(' '),
    show_dialog: true,
  });
  res.redirect(`https://accounts.spotify.com/authorize?${queryParam}`);
});

app.get("/callback", (req, res) => {
  const code = req.query.code || null;

  axios({
    method: "post",
    url: "https://accounts.spotify.com/api/token",
    data: querystring.stringify({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: REDIRECT_URI,
    }),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${CLIENT_ID}:${CLIENT_SECRET}`
      ).toString("base64")}`,
    },
  }).then((response) => {
    if (response.status === 200) {
      const { access_token, refresh_token, expires_in } = response.data;

      const queryParams = querystring.stringify({
        access_token,
        refresh_token,
        expires_in,
      });

      // redirect to react app
      res.redirect(`${FRONTEND_URI}?${queryParams}`);
    } else {
      res.redirect(`/?${querystring.stringify({ error: "invalid_token" })}`);
    }
  });
});

app.get("/refresh_token", (req, res) => {
  const { refresh_token } = req.query;

  axios({
    method: "post",
    url: "https://accounts.spotify.com/api/token",
    data: querystring.stringify({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    }),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${CLIENT_ID}:${CLIENT_SECRET}`
      ).toString("base64")}`,
    },
  })
    .then((response) => {
      res.send(response.data);
    })
    .catch((error) => {
      res.send(error);
    });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "./client/build/index.html")); // this is for heroku
})

app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
