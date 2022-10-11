const mongoose = require('mongoose');
const { mongodb } = require('./keys');

mongoose.connect(mongodb.URI, {
  useNewUrlParser: true
})
  .then(db => console.log('DB is connected in ', db.connection.name))
  .catch(err => console.log(err));
