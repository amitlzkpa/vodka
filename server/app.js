require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const DIR = 'server/src';
const PORT = process.env.PORT || 4000;

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(DIR));

// app.get('/', function(req, res) {
//   console.log('foo');
//   res.send('bar');
// });

app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
