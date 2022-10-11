//const { Router } = require ('express');
//const Task = require ("../models/Task");
//const api = require('../api');

const router = require("../routes/index");

const exchange = require('./apiccxt2');


//const exchange = require('../apiccxt2');


let cotizoTicker = "....";
let cotizador = "";
let base = "";


let billetera ={};


router.get('/prueba', async (req, res)=> {
billetera = await exchange.balancesPropios();
    arregloBases = api.listarBases();
    arregloCotizadores = api.listarCotizadores();
    var time = await api.time();
    console.log("dato horario de la api: ", time);
    var mytime = new Date(time.serverTime);
    console.log("datos horarios que me da la api: ", mytime);
   	res.render('index', {billetera, arregloBases, arregloCotizadores, cotizoTicker, cotizador});
});

router.post('/cotizacion', async(req, res)=>{

    ticker= req.body.tickerBase + req.body.tickerCotizadores;

    cotizador = req.body.tickerCotizadores;
    base = req.body.tickerBase;

    var mercado = `${base}/${cotizador}`;

    cotizoTicker = await exchange.precioActual(mercado);


   // res.redirect('/');
    res.render('index', {arregloBases, arregloCotizadores, cotizoTicker});
});


module.exports = router;
