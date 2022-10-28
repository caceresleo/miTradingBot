const router = require('express').Router();
const passport = require('passport');

//.... REQUERIMIENTOS PARA EL TRADINGBOT............
const api = require('../trading/api');
const exchange = require('../trading/apiccxt2');

const coinslista = require('../trading/listadoCoins.json');

const coinsGecko = require('../trading/coinGecko');

const userTask = require('../models/user');
const Task = require ("../models/usersdb");



let pedidoOrden = "000.0000";
let cotizoTicker = "";
let cotizador = "USDT";
let base = "ETH";
let billetera ={};
let listadoGecko = [];
//...................................................


router.get('/', async (req, res, next) => {
  var conexion = await coinsGecko.ping().seccess;

if (!conexion) res.render('index');
  else res.render('fallaConexion');
});




router.get('/inicio',isAuthenticated, async (req, res, next) => {


     //  var objetoParticular = req.user;

    //   console.log("usuario que llega: ", objetoParticular)
   //  const tasks = await Task.find({user_id: objetoParticular}); //toma todo el listado perteneciente a ese usuario

       var valoresparciales = exchange.valoresParciales()

  res.render('inicio', { valoresparciales});
});



router.get('/coins', async (req, res, next)=>{


      listadoGecko = await exchange.bajarListadoGecko();

      res.send({listadoGecko});

} );

//...........................................................................

router.get('/deleteBD/:id', async (req, res)=> {
const elemento = req.params.id;
const devuelve = await Task.findByIdAndRemove(elemento);
//console.log("devuelve: ", devuelve);

res.redirect('/tablaTrading');

});
router.get('/delete/:id', async (req, res)=> {
  var mercado = `${base}/${cotizador}`;
  const {id} = req.params;
  await exchange.cancelaOperacion(req.params.id, mercado, req.user);
  res.redirect('/ordenes');
});
//...........................................................................

router.get("/tablaTrading",isAuthenticated , async function (req, res) {
 //  console.log("base de datos :", req.user.id);  para ver el id del usuario
   var objetoParticular = req.user.id;
   const tasks = await Task.find({user_id: objetoParticular});
  // console.log("datos del usuario :", tasks);   para ver todos los datos que encuentra

  res.render('./layouts/tablaTrading',{tasks});
});


router.get('/signup', (req, res, next) => {
  res.render('signup');
});

router.post('/signup', passport.authenticate('local-signup', {
  successRedirect: '/profile',
  failureRedirect: '/signup',
  failureFlash: true
})); 

router.get('/signin', (req, res, next) => {
  res.render('signin');
});


//-------CONDICIONES INICIALES .................................................................

router.get('/condicionesIniciales', (req, res, next) => {

  res.render('./layouts/condicionesIniciales');
});

router.post('/condicionesIni',isAuthenticated , async (req, res, next) => {
const variables = req.body;

const inicioOrden = await exchange.ejecutarOrden(variables, ticker, base, cotizador, req.user); //devuelve conidciones iniciales de config
console.log("INICIA ORDEN DE COMPRA INICIAL");

console.log("INICIA EL TRADING");
const inicioTrading = await exchange.inicioTrading(inicioOrden, req.user);

 res.redirect('/inicio');

});
//................................................................................................


router.post('/signin', passport.authenticate('local-signin', {
  successRedirect: '/inicio',
  failureRedirect: '/signin',
  failureFlash: true
}));

//isAuthenticated es una funcion que coloco en las rutas que yo quiero que acceda SOLO SI 
//el usuario esta logeado
// es decir, si me desloguie, hay rutas como las de perfil que no deberia poder volver a entrar. 

router.get('/profile',isAuthenticated, (req, res, next) => {
  res.render('profile');
});

// otra manera mas global de proteger multiples rutas sin ponerle "isAuthenticated" es mediante este codigo siempre 
// ubicado antes de todas las rutas que quiero proteger....  es un middleware
/*
    router.use((req, res, next) => {
       isAuthenticated(req, res, next);
       next();
    });
*/

router.get('/logout', (req, res, next) => {
  req.logout();  // logout es un metodo de passport
  res.redirect('/');
});

router.get('/cotizacion',isAuthenticated, async(req, res) =>{
  //{arregloBases, arregloCotizadores, cotizoTicker}
      arregloBases = api.listarBases();
      arregloCotizadores = api.listarCotizadores(); 
   res.render('./layouts/contizacion',{arregloBases, arregloCotizadores, cotizoTicker});

});

router.post('/cotizacion', async(req, res)=>{

    ticker= req.body.tickerBase + req.body.tickerCotizadores;
    cotizador = req.body.tickerCotizadores;
    base = req.body.tickerBase;
    var mercado = `${base}/${cotizador}`;
    try{
      cotizoTicker = await exchange.precioActual(mercado, req.user);
      console.log(cotizoTicker);
      res.render('./layouts/contizacion', {arregloBases, arregloCotizadores, cotizoTicker, cotizador});
    }catch(err){
       console.log("contenido del error para la billetera: ", err);
       res.redirect('/'); 
    } 
   // res.redirect('/');
});



router.get('/wallet',isAuthenticated, async(req, res) =>{

  try{
     billetera = await exchange.balancesPropios(req.user); 
     res.render('./layouts/billetera',{billetera, coinslista});
  }catch(err){
     console.log("contenido del error para la billetera: ", err);
     res.redirect('/'); 
 }
   
});

router.get('/ordenes',isAuthenticated, async(req, res) =>{

  var mercado = `${base}/${cotizador}`;

    const ordenesAbiertas = await exchange.ordenesAbiertas(mercado, req.user);

   res.render('./layouts/ordenes',{ordenesAbiertas});
});



router.get('/anulartodo',isAuthenticated , async(req, res) =>{
  try{
      exchange.anularOperaciones();    
  }catch(e){
    console.log("no se pudo anular: ", e);
  }

  res.redirect('/ordenes');
});

function isAuthenticated(req, res, next) {
  if(req.isAuthenticated()) {
    return next();
  }

  res.redirect('/')
}

module.exports = router; 
