const ccxt = require('ccxt');

function cliente(usuario){
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
}



module.exports = cliente;
