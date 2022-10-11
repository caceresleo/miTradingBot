const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const User = require('../models/user');
const Trade = require('../models/usersdb');


passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

passport.use('local-signup', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true
}, async (req, email, password, done) => {
  const user = await User.findOne({'email': email})  //
 // console.log("Busca un usuario",user)
  if(user) {
    return done(null, false, req.flash('signupMessage', 'El mail ya existe en la base de datos. '));
  } else {
    //  console.log("datos que llegan: ",req.body)

    const newUser = new User();

    newUser.email = email;
    newUser.password = newUser.encryptPassword(password);
    newUser.telefono = req.body.telefono;
        newUser.alias = req.body.alias;
        newUser.KEY = req.body.key;
        newUser.SECRET = req.body.secret;

 // console.log("datos que se cargan a la base de datos",newUser)
    await newUser.save();

    asignarTrade(newUser.id);

    done(null, newUser);
  }
}));

async function asignarTrade(iduser){
      const userTrade = new Trade();
            userTrade.numero=0;
      userTrade.user_id=iduser;
     userTrade.compraId="";
      userTrade.fechaCompra="";
      userTrade.simbolo="";
       userTrade.precioCompra=0.00;
     userTrade.montocompra=0.00;
      userTrade.ventaId="";
      userTrade.fechaVenta="";
       userTrade.precioVenta=0.00;     
      userTrade.montoventa=0.00;
      userTrade.margen=0.00;
       userTrade.modo=""; 
       await userTrade.save();      

}

let contenidoBD = {
  "numero" : 0,
  "compraId" : '',
  "fecha" : '',
  "simbolo" : '',
  "precioCompra" : 0.00,
  "ventaId" : '',
  "fechaVenta" : '',
  "precioVenta" : 0.00,
  "margen" : 0,
  "modo" : ''
}
 
passport.use('local-signin', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true
}, async (req, email, password, done) => {

    //    console.log("datos que llegan: ",req.body)

  const user = await User.findOne({email: email});
  if(!user) {
    return done(null, false, req.flash('signinMessage', 'Usuario no encontrado'));
  }
  if(!user.comparePassword(password)) {
    return done(null, false, req.flash('signinMessage', 'Contraseña Incorrecta !'));
  }
  return done(null, user); //si todo es valido
}));
