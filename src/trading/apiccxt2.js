require('dotenv').config()

const ccxt = require('ccxt');

//const ccxt = require('./apiccxt');

const axios = require('axios');
const userTask = require('../models/user');
const Task = require ("../models/usersdb");
const coinGecko = require("./coinGecko");
const path = require('path');

const {sendMessage} = require('./send-sms');

var net = require('net');

function ping(direccion, puerto){
  item = [direccion, puerto];

var hosts = [['google.com', 80]];

setInterval(()=>{
  var sock = new net.Socket();
sock.setTimeout(1500);
    sock.on('connect', function() {
        console.log(item[0]+':'+item[1]+' is up.');
        sock.destroy();
    }).on('error', function(e) {
        console.log(item[0]+':'+item[1]+' is down: ' + e.message);
    }).on('timeout', function(e) {
        console.log(item[0]+':'+item[1]+' is down: timeout');
    }).connect(item[1], item[0]);
},2000);
 

}




let openOrders ={};
let fixedOrders = {};
let ordenesBD = [];
let wallet={};
//.... a partir del nuevo cambio
let condicionesIniciales={};
var precioReferencia = 0;
var ordenAgregada = false, bucleInicial, inicioStop, preciosSuperiores;
var stopLossPorcent = 0.00;
var stopLossPrice = 0.00; // porcentaje total al que hace la venta por stop loss
var precioMercado = 0.0000;
var margenSeguro = 0.00;
//.................................................
let cantidadVentas = 0;
let cantidadCompras = 0;
var startPrice = 0.00;

var listadoCoinGecko = []; // arreglo con todos los elemenots de coingecko con el siguient formato:

var ordenesEjecutadas = [];
var ordenDuplicada = false;
let contenidoBD = {
  "numero" : 1,
  "compraId" : '',
  "montocompra" : 0.0,
  "fechaCompra" : '',
  "simbolo" : '',
  "precioCompra" : 0.0,
  "ventaId" : '',
  "montoventa" : 0.0,  
  "fechaVenta" : '',
  "precioVenta" : 0.0,
  "margen" : 1,
  "modo" : ''
}


//.. para inicializar todo el proceso

var config = {}


//const binanceClient = ccxt.usuarioActivo()


   //un objeto de javascript que representara una conexion con el api de binance o de alguna otra que estara 
   //especificado en ccxt

const binanceClient = {};
/*
new ccxt.binance({
        //no es necesario esto si solo queremos leer los precios de mercado.
        //pero en caso de hacer una orden debemos hacerlo
        'apiKey': process.env.API_KEY,
        'secret': process.env.SECRET_KEY,
        'enableRateLimit': false,
        'verbose': false,
        'rateLimit':  1000,
        'options': { 
          'adjustForTimeDifference': true,
           }
   })
*/

function cliente(usuario){
  try{
      const binanceClient = new ccxt.binance({
              //no es necesario esto si solo queremos leer los precios de mercado.
              //pero en caso de hacer una orden debemos hacerlo
              'apiKey': usuario.KEY,
              'secret': usuario.SECRET,
              'enableRateLimit': false,
              'verbose': false,
              'rateLimit':  1000,
              'options': { 
                'adjustForTimeDifference': true,
                 }
         });
      return binanceClient;
    }catch(err){
    return err.msg;
    }
}

async function balancesPropios(usuario){

  const binanceClient = cliente(usuario);

    const micuenta = await binanceClient.fetchBalance();   
   const prueba = micuenta.total;
   let filtrado = [];
    for(let asset in prueba) if (prueba[asset])   filtrado.push(asset);
    for (var i = 0; i < filtrado.length; i++) {
      const variable = filtrado[i];
      wallet[variable]= micuenta[variable];
    }

    return wallet;
} 

//...........LISTADO DE LAS MONEDAS DE COINGECKO CON IMAGENES.................
async function bajarListadoGecko(){
      listadoCoinGecko = await coinGecko.todasLasCripto();             
 return listadoCoinGecko;
}

//................................................................................................. 

var deltaSuperior = 1;
var deltaInferior = 1;
var deltaPrecio=1;
var deltaPrecio2=1;

var montoRemanente = 0.00;
var idOrdenRemanente = '0000';


async function ejecutarOrden(variables, ticker, base, cotizador, usuario){

    const binanceClient = cliente(usuario);

//.... condiciones iniciales de config	
	config.base = base;
	config.cotizador = cotizador;
	config.allocation = parseFloat(variables.montoInicial);
	var profitability= parseFloat(variables.margenOperacion)*0.01;
    config.spread = profitability;	

    config.initPrice = parseFloat(parseFloat(variables.precioInicial).toFixed(2));
    config.order = variables.orden;
    config.ammountOperation = parseFloat(parseFloat(variables.montoOperacion).toFixed(2));
    config.trend = variables.tendencia;
    config.stoploss = variables.stoploss;
    config.stop = parseFloat(parseFloat(variables.stop).toFixed(1));

//..........................................................................    

    await bajarListadoGecko();

		if (variables.tendencia == 'alzista' || variables.tendencia == 'estable') {
               deltaPrecio=2;
               deltaPrecio2=2;
               if (variables.tendencia == 'alzista') {
               		deltaSuperior = 1.5;
               }else{

               }
      //  montoRemanente=config.ammountOperation; //es el monto que va a estar libre para venderlo en una alza
		}
		                  if (variables.tendencia == 'bajista') {
                        deltaPrecio=1;
                        deltaInferior=1.5;
                      }

      const market = `${config.base}/${config.cotizador}`;



    var precioNuevaCompra = config.initPrice;
    startPrice = precioNuevaCompra;
    const monto =  (config.ammountOperation / precioNuevaCompra  - 0.00001).toFixed(5);

                            console.log(`valor que llega de ammountOperation ${config.ammountOperation} : y de la compra ${precioNuevaCompra}`);
    
    if(config.order === "Compra"){  
              for(var i=1; i <= deltaPrecio; i++){
                          console.log(`monto al que se va a hacer la compra ${i} : ${monto}`);
                          try{
                            var ordenCompraInicio = await binanceClient.createLimitBuyOrder(market, monto, precioNuevaCompra);
                                      console.log("ser realizo orden de compra a :", precioNuevaCompra);
                            //await actualizoArrayCompras("agrego", precioNuevaCompra); 
                            if(i == 2){
                               console.log("SE REALIZO LA SIGUIENTE ORDEN DE COMPRA REMANENTE :", ordenCompraInicio);
                               idOrdenRemanente = ordenCompraInicio.id;
                               montoRemanente = ordenCompraInicio.amount;

                               console.log(`Y SE TIENE EL SIGUIENTE VALOR DE ID: ${idOrdenRemanente}, Y DE AMMOUNT: ${montoRemanente}`)
                            }          
                            await  actualizoOrdenesCompra("agrego", precioNuevaCompra);       
                                console.log("SE ACTUALIZO ARRAY DE COMPRAS CON VALOR :", precioNuevaCompra);

                          }catch(err){
                            console.log(`no se puedo realizar la operacion , datos que envio, market = ${market} ; monto = ${monto} ; preciocompra = ${precioNuevaCompra}`);
                            console.log("motivo: ", err);

                          }
                }          
       }else {
                          console.log("monto al que se va a vender: ", monto);
                          try{
                            await binanceClient.createLimitSellOrder(market, monto, precioNuevaCompra);
                                      console.log("ser realizo orden de venta a :", precioNuevaCompra);

                          }catch(err){
                            console.log("no se puedo realizar la operacion ");
                            console.log("motivo: ", err);

                          }

            }
return config;
}
//...................................................................................................................
//.................. BASE DE DATOS ................................................................................

async function balanceBD (usuario) {

 // var objetoParticular = usuario._id;
//  const tasks = await Task.findOne({_id: objetoParticular}); //deberia tener una lista con los trading de un usuario en particular
  var task = "";
  var sumatoria = 0.00;
  console.log("LISTADO DE MARGENES QUE SE SUMAN DE LA BASE DE DATOS: ");

  for (var i = 0; i < ordenesBD.length; i++) { //ordenesBD  es un array con las id de las ordenes de compra realizadas.
    task =  await Task.findOne({'compraId': ordenesBD[i]});
    console.log("suma el siguiente valor: ",parseFloat(task.margen));
    sumatoria += parseFloat(task.margen);
  }
  console.log("devuelve la suma total: ",sumatoria);

return sumatoria;
}

async function cargaBasedatos(ordenActual, orden, usuario){
     var objetoParticular = usuario._id;
     const total = await Task.find({user_id: objetoParticular});//total tiene la lista de ordenes de ese usuario en particular
     var number = total.length;
     var task = "";
      if (ordenActual.side === 'buy') {
      contenidoBD.numero = number;
      contenidoBD.user_id = usuario._id;
      contenidoBD.compraId = ordenActual.id;
      contenidoBD.fechaCompra = ordenActual.datetime;
      contenidoBD.simbolo = ordenActual.symbol;
      contenidoBD.precioCompra = ordenActual.price;
      contenidoBD.montocompra = ordenActual.price*ordenActual.amount;   
      contenidoBD.ventaId = orden.id;
      contenidoBD.fechaVenta = orden.datetime;
      const nuevaOrden = Task(contenidoBD);
       await nuevaOrden.save();

       ordenesBD.push(ordenActual.id);

       } else{
          // var objetoParticular = usuario._id;
          // const tasks = await total.findOne({user_id: objetoParticular}); //deberia tener una lista con los trading de un usuario en particular

           console.log("contenido del usuario en particular es: ", Task);

            if(ordenActual.id != orden.id){
           //buscar la orden de compra a la que corresponde esta venta.
              try{
                task = await Task.findOne({'ventaId': ordenActual.id});
                task.modo = ordenActual.type;
              }catch(err){
                  task.modo = "stopLoss";
              }
           }else { //caso de venta de orden remanente
              try{
                task = await Task.findOne({'compraId': idOrdenRemanente});
                task.modo = "ventaInicial";
              }catch(err){
                  console.log("NO SE PUDO ENCONTRAR LA COMPRA REMANENTE", err);
              }
           }
            task.fechaVenta = ordenActual.datetime;
            task.precioVenta = ordenActual.price;
            const margen = ordenActual.price*ordenActual.amount - task.montocompra;
            task.margen = margen; 
                       console.log("contenido de task: ", task);

             await Task.findByIdAndUpdate(task._id, task);       
             
         }
  }


// se envia el mercado y el precio al que se va a vendar el remanente 
async function ventaRemanente(market, precio, usuario){

   const binanceClient = cliente(usuario);

                           var montoVender = (montoRemanente - 0.00001 - montoRemanente*comisionOperacion).toFixed(5);
                            console.log("PRECIO AL QUE SE VENDE REMANETE: ", precio);
                            console.log("EL MONTO QUE SE SOLICITA TENIENDO EN CUENTA COMISION: ", montoVender);
                           var ordenRemanente = {};
                    try{
                         //  ordenRemanente = await binanceClient.createLimitSellOrder(market, montoVender, precio);
                           ordenRemanente = await binanceClient.createMarketSellOrder(market, montoVender);
                           
                        }catch(err){
                            console.log("no se puedo realizar la venta del remanente ");
                            console.log("motivo: ", err);
                        }
                    try{
                         cargaBasedatos(ordenRemanente, ordenRemanente,usuario) ;  //foundOrder es la orden que se ejecuto, y ordenVentaActual es la orden de venta en consecuencia       
                                               
                        }catch(err){
                            console.log("no se puedo realizar la operacion de carga en base de datos de ORDEN REMANENTE");
                            console.log("motivo: ", err);                 
                       }
}
//..............................................................................................
var condIniciales = true;
var ventapuchito = true;
var market ='';
var comisionOperacion = 0.075/100;// 
var vueltaRutinaExterna = false;
var limiteInferior = false;
var ultimaVenta = 0;

//............................................................................................................................
async function inicioTrading(parametrosIniciales, usuario){

 const binanceClient = cliente(usuario);

if(condIniciales){
		condicionesIniciales = JSON.parse(JSON.stringify(parametrosIniciales));//copia independiente de el ojeto anterior
		console.log("datos de condiciones iniciales que llegaron: ", condicionesIniciales);
		contador =0;
		fallosLectura= 0;
		//var stopLossPorcent =  ((condicionesIniciales.allocation/condicionesIniciales.ammountOperation)/100) + (condicionesIniciales.stop / 100)  ;
		if(!parseInt(stopLossPrice)){
		stopLossPorcent = condicionesIniciales.stop / 100  ;
		stopLossPrice = parseFloat((condicionesIniciales.initPrice - condicionesIniciales.initPrice*stopLossPorcent).toFixed(2)); // porcentaje total al que hace la venta por stop loss
		}
		idMinimaOrdenCompra = '';
		precioMinimaOrdenCompra = 1000000;
		precioVenta = 0;
		mibilletera = await balancesPropios(usuario);
		market = `${condicionesIniciales.base}/${condicionesIniciales.cotizador}`;
		margenSeguro = mibilletera[condicionesIniciales.cotizador].total - condicionesIniciales.allocation;
    console.log("billetera: ", mibilletera);
    console.log("disponible", mibilletera[condicionesIniciales.cotizador].free);
	condIniciales = false;
}


console.log("el margen seguro es : ", margenSeguro);
if(!vueltaRutinaExterna && !limiteInferior){ //limite inferior es una vuelta de una rutina de atentoPreciosSuperiores() para que vuelva y pueda detectar el cambio de ordenes
  await equalOrders(market, usuario); //carga los valores de  openOrders  y fixedOrders
  vueltaRutinaExterna = false;
  limiteInferior = false;
} 
 let foundOrder = {};
console.log("el stop loss es de : ", stopLossPrice);
var tiempoCoinGecko = 10;
var actualizar = true;
var cambioOrdenes = false;
bucleInicial = setInterval(async()=>{

  tiempoCoinGecko--;

                      try{
                           openOrders = await binanceClient.fetchOpenOrders(market);
                            if (actualizar){
                              actualizarOrdenesAbiertas(openOrders);
                            } 

                          }catch(err){
                        console.log("hubo un error al intentar consultar las ordenes abiertas");
                        fallosLectura++;
                        } 				
               if(cambioOrdenes) {
                                await equalOrders(market, usuario); //carga los valores de  openOrders  y fixedOrders
                                console.log("ACTUALIZACION FORZADA DE LAS ORDENES, ALGO ANDUVO MAL");
                                cambioOrdenes = false;  
                              }
              if(openOrders.length != fixedOrders.length) {
                   cambioOrdenes = true;
                        clearInterval(bucleInicial);

                        if (openOrders.length > fixedOrders.length) foundOrder = searchOrderPrueba(openOrders, fixedOrders); 
                                else foundOrder = searchOrderPrueba(fixedOrders, openOrders); 
                        ordenesEjecutadas.push(foundOrder);
                        await equalOrders(market, usuario); //carga los valores de  openOrders  y fixedOrders

                        console.log("orden que se ejecuto: ", foundOrder);

                        var accion = await ejecutoAccion(foundOrder, usuario);

                        console.log("DE LA ORDEN QUE SE EJECUTO DEVUELVE ACCION: ", accion);
                        
                        await equalOrders(market, usuario); //carga los valores de  openOrders  y fixedOrders
                        if(accion != 'vacio'){}
                        if(accion == 'stoplossFunction'){
                          await actualizarOrdenesAbiertas(openOrders);
                          await ejecutaStopLoss(market, foundOrder[0].price, usuario);                          
                         // inicioTrading(condicionesIniciales);
                        }

                        if(accion == 'preciossuperiores'){
                          await actualizarOrdenesAbiertas(openOrders);
                          await atentoPreciosSuperiores(market, foundOrder[0].price, usuario); 
                          // inicioTrading(condicionesIniciales);
                        } 

                        if(accion == 'normal'){
                          await actualizarOrdenesAbiertas(openOrders);                          
                          inicioTrading(condicionesIniciales, usuario); 
                        }  
                                               

              }// del if openOrders.length != fixedOrders.length

        console.log("precio de referencia actual: ", precioReferencia); 
        console.log("contador: ", contador++);
        console.log("stopLossPrice: ", stopLossPrice);
        console.log("ordenes de compra en espera : ", listadoOrdenesCompra);
        var tasafallos = ((100*fallosLectura)/contador).toFixed(2);
        console.log(`TASA DE FALLOS ${tasafallos} % `);
        if(tiempoCoinGecko <= 0){
             tiempoCoinGecko = 40;


                 cotizoTicker = await precioActual(market, usuario);
                 var cotizacion = cotizoTicker.ask;


           //     var cotizacion = await precioCoinGecko(condicionesIniciales.base);  
                precioMercado = cotizacion; 
                console.log("---------------------------------------PRECIO CON CCTX: ", cotizacion);  
                if (precioMaximo < cotizacion) precioMaximo = cotizacion; 
                console.log("PRECIO MAXIMO DETECTADO: ", precioMaximo); 
                console.log("monto de la ultima venta ejecutada: ", ultimaVenta); 

   // si la cotizacion es menor un numero kte de veces del valor maximo, me fijo si no existen ordenes de venta. 
   // si no existen ordenes de venta, entonces vendo lo que tengo en billetera al precio de mercado.
            if(ultimaVenta != 0  &&  (ultimaVenta*(1+ condicionesIniciales.spread + condicionesIniciales.spread/3)) < precioMaximo){  // tiene que haberse hecho una venta y ademas el precio de la venta tiene qeu ser menor al precio maximo

              var coeficiente = precioMaximo - (precioMaximo-ultimaVenta)/3;
                 console.log("LA VENTA DEL REMANENTE SE HARIA CUANDO BAJE EL VALOR DE : ", coeficiente); 

              var cantidadOrdVent = 0;

              if(montoRemanente > 0){ //me fijo si hay un monto remanente o si se vendio
                                if(cotizacion < coeficiente) {
                    openOrders.forEach((arr, index)=> {if(arr.side === 'sell') cantidadOrdVent++});
                    if(!cantidadOrdVent && ventapuchito){
                      precioMaximo =0 ; //RESETEO EL VALOR DE PRECIO MAXIMO
                      //realizar la venta de lo que tenga en billetera al precio de mercado
                      await ventaRemanente(market, cotizacion, usuario);
                      console.log("SE REALIZO LA VENTA DE MI REMANETE !!! , AL PRECIO DE ",cotizacion );
                      montoRemanente=0;
                      ventapuchito=false;
                      cantidadOrdVent=0;
                      listadoOrdenesCompra.shift(); // borra el primer elemento del array que corresponde al remanente.
                      stopLossPrice *= (1+ condicionesIniciales.spread);
                      console.log("ELEVO EL STOPLOSS A EL VALOR: ", stopLossPrice); //elevo stop loss un nivel mas

                       await elevoNivelCompra(market, precioReferencia, usuario);// actualizo nivel de compra a un nivel superior

                      }
                    }
              } 

         }
     
        }
      }, 1500 );

}

function anularOperaciones(){
  clearInterval(bucleInicial);
  clearInterval(preciosSuperiores);
  clearInterval(inicioStop);
 for (var i = 0; i < listadoOrdenesCompra.length; i++) listadoOrdenesCompra.pop();//vaciar ordenes de compra 
}

//....ACTUALIZAR LOS VALORES A MOSTRAR EN INICIO..........................

async function actualizarOrdenesAbiertas(ordenesActivas){
    listaVentas=[];
    listaCompras=[];
    ordenesActivas.forEach((arr,index) => {
             if (arr.side === 'sell') {
                listaVentas.push(parseFloat(arr.price.toFixed(2)));
            }else{
                listaCompras.push(parseFloat(arr.price.toFixed(2)));
            }
          simboloActual = arr.symbol;   
          });
      actualizar=false 
}

//...........VARIABLES A COMPARTIR.........................................
  var listaCompras =[];
  var listaVentas = []; 
  var simboloActual = '';
  var datoPrecioTicker={};
function valoresParciales(){  
  //  datoPrecioTicker   variable global que se carga con la funcion precioActual(mercado, usuario)
  var valoresActuales = {
        compras : listaCompras,
        ventas: listaVentas,
        maximoPrecio: datoPrecioTicker.high,
        precio: precioMercado,
        minimoPrecio: datoPrecioTicker.low,
        aperturaPrecio: datoPrecioTicker.open,
        SL: stopLossPrice,
        simbolo: simboloActual, 
        precioInicio:  startPrice         
  }

return valoresActuales;
}
//......................................................................... 

var ultimasOrdenes = [];

async function ejecutoAccion(foundOrder, usuario){

   const binanceClient = cliente(usuario);

     var accion = 'vacio';
   //  var inicioBuclePpal=true;
        const market = foundOrder[0].symbol; // 'ETH/USDT'                 
     //   clearInterval(bucleInicial);
           var precioEquivalente = foundOrder[0].price*foundOrder[0].amount;
           console.log("precio real que se manipula : ", precioEquivalente);
           var precioSuperior= parseFloat(((1+condicionesIniciales.spread*deltaSuperior)*foundOrder[0].price).toFixed(2));
           var precioInferior= parseFloat(((1-condicionesIniciales.spread*deltaInferior)*foundOrder[0].price).toFixed(2));

		   if(!precioReferencia) precioReferencia= precioSuperior;		


       ultimasOrdenes.push(foundOrder[0].side); // voy acumulando las ultimas ordenes para saber cuales fueron las ultimas

           if (foundOrder[0].side === 'buy') {  //ORDEN QUE SE EJECUTÓ,en este caso se ejecuto una orden de compra. 
                     clearInterval(preciosSuperiores);// para que abandone la rutina de lectura de precios superiores si es que la esta ejecutando
                   ventapuchito=true; // relacionado a la habilitacion de nueva orden de compra si hay venta remanente
				           console.log("orden de compra !");
                   precioMaximo = foundOrder[0].price; // cada vez que hace una compra actualiza el precio maximo a ese valor 
				           cantidadCompras += 1;

				           const precioVenta = precioSuperior;

				           await actualizoOrdenesCompra("elimino", foundOrder[0].price);

				           //  const monto = (foundOrder[0].amount - foundOrder[0].amount*(comisionOperacion)).toFixed(5);
				          // const monto = (foundOrder[0].amount-0.00001).toFixed(5);// como tofixed redondea para arriba , hago esa resta
				           const monto = (condicionesIniciales.ammountOperation/foundOrder[0].price-0.00001).toFixed(5);
				           console.log("la nueva venta se haria a :", precioVenta);

				           //... realizo la orden de venta por esa compra

				            let idVenta="";
				            let ordenVentaActual = {};
				            try{
				            // ordenVentaActual = await binanceClient.createLimitSellOrder(operacionPendiente.market, operacionPendiente.monto , operacionPendiente.precio);
				            ordenVentaActual = await binanceClient.createLimitSellOrder(market, 
				                                          (parseFloat(monto)- condicionesIniciales.ammountOperation / precioVenta*comisionOperacion).toFixed(5),
				                                          precioVenta);

                            if (precioVenta > precioReferencia) precioReferencia = precioVenta; //actualizo precio referencia

                              console.log(`se realizo una orden de venta a ${precioVenta} ${condicionesIniciales.base}`);
                              idVenta = ordenVentaActual.id;
                              console.log("id de venta: ", idVenta);
                            }catch(err){
                                   console.log("no se puedo realizar la operacion de venta ");
                                   console.log("motivo: ", err); 
                               }  

                            //... cargo en base de datos la orden de compra que se ejecuto........... 
                            var cantidad = deltaPrecio2;
                          for(var i=0; i < cantidad; i++){
                                if(i > 0) {
                                deltaPrecio2 = 1;  // para que haga esta doble carga en base de datos solo una vez
                                ordenVentaActual.id = '00000000000000';
                                }                             
                            try{
                               await   cargaBasedatos(foundOrder[i], ordenVentaActual, usuario) ;  //foundOrder es la orden que se ejecuto, y ordenVentaActual es la orden de venta en consecuencia       
                                console.log("se mando a cargar en base de datos con la siguiente id de venta: ", ordenVentaActual.id);
                                                    
                                 }catch(err){
                                  console.log("no se puedo realizar la operacion de carga en base de datos");
                                  console.log("motivo: ", err);                 
                                   }
                             }     
  //..................................................................................

                         console.log(`-----se haria una nueva compra al precio de ${precioInferior} si no esta en array de compras,
                          o no se hicieron dos compras consecutivas`);

                         var comprasConsecutivas= false; 
                         var muestraUltimasOrdenes=[].concat(ultimasOrdenes);

                         if (muestraUltimasOrdenes.pop() === 'buy') if (muestraUltimasOrdenes.pop() === 'buy'){
                            comprasConsecutivas=true;
                            console.log("LAS DOS ULTIMAS ORDENES FUERON DE COMPRA !! , NO SE HARIA OTRA COPRA NUEVA"); 
                         } 

                         var stop=false;
                         if((1+condicionesIniciales.spread*deltaSuperior)*stopLossPrice > precioInferior && !comprasConsecutivas){
                                 console.log("NO SE HACE LA ORDEN DE COMPRA PORQUE EN ESE NIVEL TENEMOS AL STOPLOSS CERCA"); 
                                  stop =true; //CON ESTO EJECUTA LA RUTINA DE STOPLOSS
                          }else{
                            if (!exiteOrdenCompra(precioInferior)) { //... para que no haga orden de compra si ya existe una en ese monto
                                 console.log("NO EXISTE ESA ORDEN DE COMPRA, LA CREAMOS A CONTINUACION"); 
                                 //wallet = await binanceClient.fetchBalance();
                                 var mibilletera = await balancesPropios(usuario);
                                 const baseWallet = mibilletera[condicionesIniciales.base].free; //lo que tengo disponible en este caso de ETH
                                 const cotizadorWallet = mibilletera[condicionesIniciales.cotizador].free - margenSeguro;  //lo uqe tengo disponible en este caso de USD   
                                 var nuevoMonto =  (condicionesIniciales.ammountOperation / precioInferior - 0.00001).toFixed(5) ;

                                 if( cotizadorWallet < condicionesIniciales.ammountOperation) {
                                    console.log(`no hay mas operaciones de compra disponibles, en la cartera queda ${cotizadorWallet} ${condicionesIniciales.cotizador}`);
                                   // ejecutaStopLoss(market); 
                                   // accion='stoplossFunction'; 
                                        stop =true;
                                   // inicioBuclePpal=false;

    
                                   } else {
                                        try{
                                          const ordenCompraActual = await binanceClient.createLimitBuyOrder(market, nuevoMonto, precioInferior); 
                                          console.log(`se realizo una orden de compra en consecuencia a la venta reciente de ${precioInferior} ${condicionesIniciales.base}`);
                                       await actualizoOrdenesCompra("agrego", precioInferior);
    
                                            }catch(err){
                                                          console.log("no se puedo realizar la operacion ");
                                                          console.log("motivo: ", err);
                                                        }
                                       } 
                            } else console.log("YA EXISTE ESA ORDEN DE COMPRA, NO HACEMOS NINGUNA NUEVA");

                          }      
                            if(stop)accion='stoplossFunction';
                                else accion='normal';
            }else{
               console.log("orden de venta ejecutada !");
               clearInterval(inicioStop);
               cantidadVentas += 1;  
               var precioNuevaCompra = precioInferior;
               //  const monto =  (condicionesIniciales.ammountOperation / precioNuevaCompra - condicionesIniciales.ammountOperation / precioNuevaCompra*(comisionOperacion)).toFixed(4);
               const monto =  (condicionesIniciales.ammountOperation / precioNuevaCompra).toFixed(4);
               console.log("la nueva compra se haria a :", precioNuevaCompra);

               let idCompra = "";
               let ordenCompra = {};

                try{
                   ordenCompra = await binanceClient.createLimitBuyOrder(market, monto, precioNuevaCompra);
                   console.log(`se realizo una orden de compra a ${precioNuevaCompra} ${condicionesIniciales.base}`);
                   idCompra = ordenCompra.id; 
                   console.log("id de compra: ", idCompra);
                   //await actualizoArrayCompras("agrego", precioNuevaCompra);
                   await   actualizoOrdenesCompra("agrego", precioNuevaCompra);
                 //  accion='normal';
                    }catch(err){
                         console.log("no se puedo realizar la operacion ");
                         console.log("motivo: ", err);
                         }
                try{
                    cargaBasedatos(foundOrder[0], ordenCompra, usuario) ;  //foundOrder es la orden que se ejecuto, y ordenCompra es la orden de venta en consecuencia 
                    console.log("cargue orden en base de datos");
                      
                    }catch(err){
                     console.log("error al enviar a cargar base de datos: ", err);
                    }
                if (parseInt(precioReferencia) == parseInt(foundOrder[0].price)){ 
                  //atentoPreciosSuperiores(market); 
                  accion='preciossuperiores';
                  ultimaVenta = parseInt(foundOrder[0].price);
                   }else accion = 'normal';                                      
               }              

    //  if(inicioBuclePpal)  inicioTrading(condicionesIniciales);

      return accion;
}

var precioMaximo=0;

//.....................................................................................................................................
async function atentoPreciosSuperiores(datoMercado, ultimoPrecio, usuario){

    const binanceClient = cliente(usuario);

  //clearInterval(bucleInicial); 
   // var primeraentrada=true;
		var priceAdviceCheck = 15000;
        var limiteBajo = ultimoPrecio*(1-condicionesIniciales.spread); //limite inferior a partir del cual quiero que corte la funcion atentopreciossuperiores
        var nuevoNivel = parseFloat(((1+ condicionesIniciales.spread + condicionesIniciales.spread/2)*precioReferencia).toFixed(2)); //precioReferencia + 1.5%
        var nuevoPrecio = parseFloat(((1+condicionesIniciales.spread*deltaSuperior)*precioReferencia).toFixed(2));//  precioReferencia + 1%
        var precioCompra= parseFloat(((1-condicionesIniciales.spread)*precioReferencia).toFixed(2));// precioReferencia - 1%

        const monto =  (condicionesIniciales.ammountOperation / precioReferencia-0.00001).toFixed(5);
        var cantidadPedidoPrecio=0;

		preciosSuperiores = setInterval(async()=>{

            var cotizacion=0.00;
            try{
                      console.log("SE ESTA HACIENDO RUTINA DE PRECIOS SUPERIORES");
                      console.log("SE HARA ESTA RUTINA HASTA EL VALOR DE limitebajo: ", limiteBajo);
                      console.log("stopLossPrice: ", stopLossPrice);

                      cotizoTicker = await precioActual(datoMercado, usuario);
                      cotizacion = cotizoTicker.ask;
            }catch(e){
                console.log("no se pudo realizar esta peticion de precio, envia el mensaje de error: ", e.message);

                console.log("INTENTO CON COINGEKO");        
                cotizacion = await precioCoinGecko(condicionesIniciales.base);
                console.log("precio de mercado actual desde coingecko: ", cotizacion);
            }
            console.log("CANTIDAD DE PEDIDOS DE PRECIO AL MERCADO: ", cantidadPedidoPrecio++);
            precioMercado = cotizacion;
            if (precioMaximo < precioMercado) precioMaximo = precioMercado;
            console.log("PRECIO MAXIMO DETECTADO: ", precioMaximo);
            console.log("REVISAMOS PRECIOS SUPERIORES, precio de mercado atual: ", precioMercado);

                if(precioMercado < limiteBajo){ //salgo de atentoPreciosSuperiores, cotizacion supero un limite en donde deveria haberse ejecutado la venta de la ultima compra
                  vueltaRutinaExterna = true;
                  limiteInferior = true;
                  inicioTrading(condicionesIniciales, usuario);
                  clearInterval(preciosSuperiores); 
                  console.log(".............CORTO DE HACER LECTURA PRECIOS SUPERIORES ");

                }


              if(precioMercado>nuevoPrecio){
                console.log("SUPERO EL LIMITE DE PRECIO PREESTABLECIDO, REALIZAMOS OPERACIONES CORRESPONDIENTES ");

              //  clearInterval(bucleInicial); //suspendo las actividades en el bucle inicial para evitar conflictos
                stopLossPrice *= (1+ condicionesIniciales.spread);
                console.log("ELEVO EL STOPLOSS A EL VALOR: ", stopLossPrice);


                var menorValor = 1000000;
                var indice = 0;

             //  busca menor valor, se supone que este valor es de una compra
                for (var i = 0; i < openOrders.length; i++) {
                    if(openOrders[i].price < menorValor ) {
                       menorValor = openOrders[i].price;
                       indice = i;
                        }
                   }
                console.log("BUSCAMOS LA MENOR ORDEN DE COMPRA PARA ELIMINAR ! y encontramos: ", menorValor);

            // si se pisa con stoploss debemos eliminar esta orden de compra

                /*
              parseInt(stopLossPrice) == parseInt(menorValor) || 
              parseInt(stopLossPrice) === parseInt(menorValor+1) || 
              parseInt(stopLossPrice) === parseInt(menorValor-1) ||
                */ 
            
            // si menorValor esta por debajo del valor de stoploss + el porcentaje de spread
            if ((1+condicionesIniciales.spread*deltaSuperior)*stopLossPrice > parseInt(menorValor)) {   
                  try{
                     var ordenCancelada = await binanceClient.cancel_order(openOrders[indice].id, openOrders[indice].symbol); //para que cancele el menor precio de compra  
                     console.log ("se realizo una orden de CANCELAR de la siguiente orden de compra inferior: ", ordenCancelada);
                     await actualizoOrdenesCompra("elimino", menorValor);
                     console.log ("SE ELIMINO ESE MENOR VALOR DEL ARRAY DE ORDENES DE COMPRA");
                     }catch(err){
                          console.log ("no se pudo realizar la cancelacion de orden de compra inferior ", err.message);
                     } 

                }else{
                 console.log("NO ELIMINO ESTA ORDEN DE COMPRA INFERIOR PORQUE ESTA ALEJADA DEL VALOR DE STOPLOSS ");

                }     
                     

          //....  coloco nueva orden de compra en nivel de referencia pasada....................           
                  try{
                      var nuevaOrdenCompra = await binanceClient.createLimitBuyOrder(datoMercado, monto, precioReferencia);
                              console.log("SE REALIZO UN ARDEN DE COMPRA POR SUPERAR EL NIVEL DE 1% DE LA REFERANCIA :", precioReferencia);
                              await actualizoOrdenesCompra("agrego", precioReferencia); 
                              console.log("SE ACTUALIZO EL ARRAY DE ONDENES DE COMPRA CON :", precioReferencia);   
                                }catch(err){
                                  console.log("no se puedo realizar la operacion ");
                                  console.log("motivo: ", err);
                                }
          //... actualizo precio de referencia...........
                precioReferencia =  nuevoPrecio;    
                await equalOrders(datoMercado, usuario);    // igualo ordenes abiertas con ordenes fijas

              console.log("SE ACTUALIZO EL PRECIO DE REFERENCIA A : ", precioReferencia);

             //   precioActualMercado(condicionesIniciales.base); //comienza lectura de precios obtenidos de CoinGecko 
               inicioTrading(condicionesIniciales, usuario);

               clearInterval(preciosSuperiores);                
              } // fin de "si precio de marcado supera al nuevo precio"

		},priceAdviceCheck);	
// inicioTrading(condicionesIniciales);//reinicio el proceso de trading que cancele para ralizar todas las operaciones

}

//.........ELEVO COMPRA UN NIVEL...........................................
async function elevoNivelCompra(market, nuevoPrecio, usuario){
      const binanceClient = cliente(usuario);

                        const monto =  (condicionesIniciales.ammountOperation / nuevoPrecio-0.00001).toFixed(5);

                var menorValor = 1000000;
                var indice = 0;
                for (var i = 0; i < openOrders.length; i++) {
                    if(openOrders[i].price < menorValor ) {
                       menorValor = openOrders[i].price;
                       indice = i;
                        }
                   }
                console.log("BUSCAMOS LA MENOR ORDEN DE COMPRA PARA ELIMINAR ! y encontramos: ", menorValor);
                  try{
                     var ordenCancelada = await binanceClient.cancel_order(openOrders[indice].id, openOrders[indice].symbol); //para que cancele el menor precio de compra  
                     console.log ("se realizo una orden de CANCELAR de la siguiente orden de compra inferior: ", ordenCancelada);
                     await actualizoOrdenesCompra("elimino", menorValor);
                     console.log ("SE ELIMINO ESE MENOR VALOR DEL ARRAY DE ORDENES DE COMPRA");
                     }catch(err){
                          console.log ("no se pudo realizar la cancelacion de orden de compra inferior ", err.message);
                     } 

          //....  coloco nueva orden de compra en nivel de referencia pasada....................           
                  try{
                      var nuevaOrdenCompra = await binanceClient.createLimitBuyOrder(market, monto, nuevoPrecio);
                              console.log("SE REALIZO UN ARDEN DE COMPRA POR SUPERAR EL NIVEL DE 1% DE LA REFERANCIA :", nuevoPrecio);
                              await actualizoOrdenesCompra("agrego", nuevoPrecio); 
                              console.log("SE ACTUALIZO EL ARRAY DE ONDENES DE COMPRA CON :", nuevoPrecio);   
                                }catch(err){
                                  console.log("no se puedo realizar la operacion ");
                                  console.log("motivo: ", err);
                                }
          //... actualizo precio de referencia...........
                precioReferencia =  nuevoPrecio;    
                await equalOrders(market, usuario);    // igualo ordenes abiertas con ordenes fijas

              console.log("SE ACTUALIZO EL PRECIO DE REFERENCIA A : ", precioReferencia);
}

//...................................................................................................................................
async function ejecutaStopLoss(datoMercado, ultimoPrecio, usuario){

	stopLossCheck = 15000;
  var limiteMaximo = ultimoPrecio*(1+condicionesIniciales.spread*deltaSuperior);
	inicioStop = setInterval (async()=>{
    var cotizacion=0.00;
    try{
              console.log("SE ESTA HACIENDO RUTINA DE STOPLOSS");
              cotizoTicker = await precioActual(datoMercado, usuario);
              cotizacion = cotizoTicker.ask;
        console.log("precio de mercado actual desde stoploss: ", cotizacion);

    }catch(e){
        console.log("no se pudo realizar esta peticion de precio, envia el mensaje de error: ", e.message);
        console.log("INTENTO CON COINGEKO");        
        cotizacion = await precioCoinGecko(condicionesIniciales.base);
        console.log("precio de mercado actual desde stoploss: ", cotizacion);
    }
                if(cotizacion > limiteMaximo){ //salgo de stoploss, cotizacion supero un limite en donde deveria haberse ejecutado la venta de la ultima compra
                  vueltaRutinaExterna = true;
                  inicioTrading(condicionesIniciales, usuario);
                  clearInterval(inicioStop); 
                  console.log(".............CORTO DE HACER STOPLOSS ");
                }

                if (cotizacion < stopLossPrice) {
                   //  clearInterval(bucleInicial);  //salto inconidcional del bulce de trading

                     await ventaRemanente(datoMercado, cotizacion, usuario);
                  console.log("TERMINO EL PROCESO DE VENTA REMANENTE ");                   
                     await procesoCancelar(datoMercado, usuario);
                  console.log("TERMINO EL PROCESO DE CANCELAR ORDEN "); 


                     console.log("se salio del bucle general por STOP LOSS   :-( ");  
                      var montoTotal = await balanceBD(usuario);
                      var mensajeTexto = `vendio todas las ordenes por STOP LOSS,
                                          desde la ultima activación, el balance total fue de ${montoTotal.toFixed(2)} USDT`; 
                     console.log("mensaje que se mandaria por msn: ", mensajeTexto);  

                     // sendMessage(mensajeTexto, usuario);  
                      clearInterval(inicioStop);      
                  }
	},stopLossCheck );
}
//...............................................................................................................................

function ordenRepetida(id){  //para que no detecte repetidamente una orden ejecutada
  var existe = false;
  if(!ordenesEjecutadas.length) return false;
  for (var i = 0; i < ordenesEjecutadas.length; i++){
      if(ordenesEjecutadas[i].id == id) {
        existe = true;
        ordenDuplicada = true;
        console.log("SE EJECUTO UNA ORDEN DE MANERA REPETIDA");
      }else ordenDuplicada = false;
  }
  return existe;
}

async function precioActualMercado(symbolo){
  setInterval(async()=>{
        var priceGecko = await precioCoinGecko(datoMercado);
        console.log("precio obtenido desde coinGecko: ", priceGecko);

     }
    ,15000);
}


// si hay una variacion muy grande del precio que se va de rango en un tiempo superior del del setINterval
// loque hacemos es comparar el array de listadoOrdenesCompra con las abiertas y fericar que se encuentran en ordenes abiertas.
function chequeoDeImprevisto(ordenesAbiertas, listadoCompras){
  var arrayOrdenesBuy = [];
  var existe = false;
  for (var i = 0; i < ordenesAbiertas.length; i++) {
            if(ordenesAbiertas[i].side == "buy"){
                arrayOrdenesBuy.push(parseInt(ordenesAbiertas[i].price));
                for (var j = 0; j < listadoCompras.length; j++) {
                   if (parseInt(ordenesAbiertas[i].price) == listadoCompras[j]) existe = true;
                }
            }
  }

  if (arrayOrdenesBuy.length != listadoCompras.length) {
                 console.log(`no me coincide la longitud de las ordenes de compra openOrders ${arrayOrdenesBuy.length}, con el array de ordenes abiertas ${listadoCompras.length}`);
        }

return existe;
}


//.........................................................................


//... ESTAS DOS FUNCIONES LO QUE BUSCAN ES QUE NO SE SUPERPONGAN DOS ORDENES DE COMPRA.....
var listadoOrdenesCompra = [];

function exiteOrdenCompra(monto) {

  var precioBuscar = parseInt(monto);
  var existe = false;
  if (listadoOrdenesCompra.length) {  // que el array no este vacio
          for (var i = 0; i < listadoOrdenesCompra.length; i++) {
            if (precioBuscar == listadoOrdenesCompra[i]  || precioBuscar == listadoOrdenesCompra[i]+1 || precioBuscar == listadoOrdenesCompra[i]-1) existe = true;  
          }
       }
  return existe;     
}

async function actualizoOrdenesCompra(accion, monto) {

      var precio = parseInt(monto);

      if (accion == "agrego") {
        listadoOrdenesCompra.push(precio);

      } else {  // le saco una orden de compra que se ejecuto
        var posicion = 0;
        for (var i = 0; i < listadoOrdenesCompra.length; i++) {
                if (precio == listadoOrdenesCompra[i]) posicion = i;  
              }

         //    var j = listadoOrdenesCompra.indexOf(posicion);      
       // delete listadoOrdenesCompra[posicion];  
             listadoOrdenesCompra.splice(posicion,1);    
      }
  }

// ---------------------------------------------------------------------------------------------  


async function procesoCancelar(market, usuario){
      const binanceClient = cliente(usuario);

                  openOrders = await binanceClient.fetchOpenOrders(market);
                  var ordenesActuales = JSON.parse(JSON.stringify(openOrders));                  

                  var ordenCancelar = await binanceClient.cancelAllOrders(market);

                  console.log("ordenes canceladas !");
                  console.log("lo que devuelve las ordenes canceladas: ", ordenCancelar);

                   var idOrdenesVenta = [];
                   var precio
                   var cantidadTotal = 0;

                   for (var i = 0; i < ordenCancelar.length; i++) {
                     idOrdenesVenta.push(ordenesActuales[i].id);
                     cantidadTotal += ordenCancelar[i].amount;
                   }

                   console.log("listado de id de ordenes a cancelar: ", idOrdenesVenta);

                  console.log(`se envia para vender todas las ordenes el dato de mercado  ${market}  con la cantidad total de ${cantidadTotal}`);
                  var ordenVentaTotal = await binanceClient.createMarketSellOrder (market, cantidadTotal);
                  console.log("se vendieron todas las ordenes por stopLoss a precio de mercado!");
                  console.log("lo que devuelve las ordenes vendidas: ", ordenVentaTotal);
            // cargo base de datos

               for (var i = 0; i < ordenesActuales.length; i++) {


                  var task = await Task.findOne({'ventaId': idOrdenesVenta[i]});

                  console.log(`el contenido de task que se encontro con la orden de venta  ${idOrdenesVenta[i]}, es el siguiente : ${task}`);


                   // task.fechaVenta = ordenCancelar[i].datetime;
                    task.precioVenta = ordenVentaTotal.price;
                    const margen = ordenVentaTotal.price*ordenCancelar[i].amount - task.montocompra;
                    task.margen = margen; 
                    task.modo = "stopLoss"; 

                      try{

                          await Task.findByIdAndUpdate(task._id, task);
                         console.log(`SE ACTUALIZÓ la base de datos con el id  ${task.numero}, linea 1154`);

                      }catch(err){
                          console.log("no pudo actualizar la base de datos, linea 875");
                          console.log(`recibio los siguientes datos, de task id : ${task._id}, y de task : ${task}`);
                      }

                    }

}


async function cancelaOperacion(orderId, symbol, usuario) { 
  const binanceClient = cliente(usuario);
  const ordenes = await binanceClient.cancel_order(orderId, symbol);
  return ordenes;
  // body...
}


async function rutinaCancelarOperacion() {

                  var ordenesActuales = JSON.parse(JSON.stringify(openOrders));//copia independiente de el ojeto openOrders                  

                 //  openOrders = await binanceClient.fetchOpenOrders(operacionPendiente.market);

                  var ordenCancelar = await binanceClient.cancelAllOrders(operacionPendiente.market);

                console.log("ordenes canceladas !");

                  console.log("lo que devuelve las ordenes canceladas: ", ordenCancelar);

                   var idOrdenesVenta = [];
                   var precio
                   var cantidadTotal = 0;

                   for (var i = 0; i < ordenCancelar.length; i++) {
                     idOrdenesVenta.push(ordenesActuales[i].id);
                     cantidadTotal =+ ordenCancelar[i].amount;
                   }

                  console.log(`se envia para vender todas las ordenes el dato de mercado  ${operacionPendiente.market}  con la cantidad total de ${cantidadTotal}`);

                  var ordenVentaTotal = await binanceClient.createMarketSellOrder (operacionPendiente.market, cantidadTotal);
                  console.log("se vendieron todas las ordenes por stopLoss a precio de mercado!");
                  console.log("lo que devuelve las ordenes vendidas: ", ordenVentaTotal);

            // cargo base de datos
               for (var i = 0; i < ordenesActuales.length; i++) {
                  var task = await Task.findOne({'ventaId': idOrdenesVenta[i].id});

                    task.fechaVenta = ordenCancelar[i].datetime;
                    task.precioVenta = ordenCancelar[i].price;
                    const margen = ordenCancelar[i].price*ordenCancelar[i].amount - task.precioCompra*ordenCancelar[i].amount;
                    task.margen = margen; 
                    task.modo = "stopLoss"; 

                      try{

                          await Task.findByIdAndUpdate(task._id, task);
                      }catch(err){
                          console.log("no pudo actualizar la base de datos, linea 1014");
                          console.log(`recibio los siguientes datos, de task id : ${task._id}, y de task : ${task}`);
                      }

                    }

}


function searchOrderPrueba(ordenes1, ordenes2) {
   let iterator = ordenes2.values();
   let indices = [];
   for (const value of iterator){
                            //"indices" contiene los indices que NO se modificaron
    ordenes1.forEach((arr, index)=> {if(arr.id === value.id) indices.push(index)});
   }
   let operacionNueva = ordenes1.map(x => x); //mapeo para tener un array similar y manipularlo

   let indicesnuevos=[]; //contendran los indices a los que se le va a hacer splice a "operacionNueva"
   for (var i = 0; i < indices.length; i++) indicesnuevos.push(indices[i]-i);   
   //elimina un elemento donde indica indicesnuevos
   for (var i = 0; i < indicesnuevos.length; i++)operacionNueva.splice(indicesnuevos[i],1); 
    
  return operacionNueva;
}


async function ordenesAbiertas(market, usuario){
  const binanceClient = cliente(usuario);
	const ordenes = await binanceClient.fetchOpenOrders(market);
	return ordenes;
}

async function cancelarOrden(id){
  return await binanceClient.cancelOrder(id);
}


//.... PRECIO ACTUAL CON COINGECKO....................
//.. utiliza el listado de cargue al principio con todas las criptomonedas del mercado para buscar su ticker equivalente y encontrar el precio
async function precioCoinGecko(base){
  var elementoGecko = [];
  var price = 0.000;
  var baseMinusculas = base.toLowerCase();
   var valor='';  
   for(var i=0 ; i < listadoCoinGecko.length; i++){
    if (listadoCoinGecko[i].symbol == baseMinusculas) {
         var elemento = {
            ticker: listadoCoinGecko[i].ticker,
            symbol: listadoCoinGecko[i].symbol,
            image: listadoCoinGecko[i].image  
          };

      elementoGecko.push(elemento);
      }
    }
 
    try{
    price = await coinGecko.precioCripto(elementoGecko[0].ticker);
    }catch(e){
  console.log("no se pudo leer el precio con coinGecko por el siguiente error: ", e.message);
    }
    return   price;   
}  



async function precioActual(ticker, usuario){
    const binanceClient = cliente(usuario);
    datoPrecioTicker = await binanceClient.fetchTicker(ticker);
  return datoPrecioTicker
}


async function cotizacionActual(ticker){
	const results = await Promise.all([
           axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'),
           axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd')
        ]);

	const precioTicker = results[0].data.ethereum.usd / results[1].data.tether.usd;

	console.log("cotizacion: ", precioTicker);
		console.log("results: ", results);

	return precioTicker;
}

async function equalOrders(market, usuario) {
      const binanceClient = cliente(usuario);

	openOrders = await binanceClient.fetchOpenOrders(market);
	fixedOrders = JSON.parse(JSON.stringify(openOrders));//copia independiente de el ojeto anterior
}
//... comparo ordenes fijas con ordenes abiertas para ver cual se ejecuto
function searchOrder(ordenes1, ordenes2) {
   let iterator = ordenes2.values();
   let indices = [];
   for (const value of iterator){
                            //"indices" contiene los indices que NO se modificaron
    ordenes1.forEach((arr, index)=> {if(arr.id === value.id) indices.push(index)});
   }
   let operacionNueva = ordenes1.map(x => x); //mapeo para tener un array similar y manipularlo

   let indicesnuevos=[]; //contendran los indices a los que se le va a hacer splice a "operacionNueva"
   for (var i = 0; i < indices.length; i++) indicesnuevos.push(indices[i]-i);   
   //elimina un elemento donde indica indicesnuevos
   for (var i = 0; i < indicesnuevos.length; i++)operacionNueva.splice(indicesnuevos[i],1); 
    
  return operacionNueva;
}


module.exports = {anularOperaciones, valoresParciales, balancesPropios, cotizacionActual, ejecutarOrden, inicioTrading, ordenesAbiertas, cancelaOperacion, precioActual, bajarListadoGecko}
   


