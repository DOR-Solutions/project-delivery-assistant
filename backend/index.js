const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => app.listen(PORT, () => {  
    console.log(`Server is running on port ${PORT}`);
  }))
  .catch(err => console.log(err));
