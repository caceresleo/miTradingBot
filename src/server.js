const express = require('express');
const path = require('path');
const engine = require('ejs-mate');
const flash = require('connect-flash');
//const session = require('express-session');
const session = require('cookie-session');
const passport = require('passport');
const morgan = require('morgan');
const rutasTrading = require("./trading/routes");
//const bootstrap = require('bootstrap') 
//import "bootswatch/dist/[theme]/bootstrap.min.css";
// TODO: Note: Replace ^[theme]^ (examples: darkly, slate, cosmo, spacelab, and superhero. See https://bootswatch.com for current theme names.)

// initializations
const app = express();
require('./database');
require('./passport/local-auth');

//require('bootswatch/dist/slate/bootstrap.min.css');

//import 'bootswatch/dist/slate/bootstrap.min.css';

// settings
app.set('port', process.env.PORT || 3800);
app.set('views', path.join(__dirname, 'views'))
app.engine('ejs', engine);
app.set('view engine', 'ejs');

// middlewares
app.use(express.static(__dirname + "/public", {
    index: false, 
    immutable: true, 
    cacheControl: true,
    maxAge: "30d"
}));
app.use(morgan('dev'));
app.use(express.urlencoded({extended: false}));
app.use(session({
  secret: 'mysecretsession',
  resave: false,
  saveUninitialized: false,
  cookie:{
   secure: true 
    }
}));
app.use(flash());  //flash y passport hacen uso de las session, por lo que deben ir despues
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  app.locals.signinMessage = req.flash('signinMessage'); //app.locals es una variable que es accesible en toda mi aplicacion
  app.locals.signupMessage = req.flash('signupMessage'); //estos mensajes son los que obtenesmos cuando nos autenticamos
  app.locals.user = req.user;  // en todas mis vistas tengo el usuario que se valido con req.user
 // console.log("muestro el contenido de  locals.user: ", app.locals.user);
  /*
  req.user  devuelve el dato del usuario 
 locals.user:  {
  _id: new ObjectId("6316497956fab224e52ba98b"),
  email: '123456@gmail.com',
  password: '$2a$10$zZLucBPLCsxOCLF/rVFOxe6jopJyqYoZxW3Cic/UywVB3TWtBB9wK',
  __v: 0
}

  */
  next();
});

// routes
app.use('/', require('./routes/index'));
app.use(rutasTrading);


// Starting the server
app.listen(app.get('port'), () => {
  console.log('server on port', app.get('port'));
});
