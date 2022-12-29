
//1. Import coingecko-api
const CoinGecko = require('coingecko-api');

//2. Initiate the CoinGecko API Client
const CoinGeckoClient = new CoinGecko();

//3. Make calls
async function todasLasCripto(){
 var arrayCriptos = [];
  let data = await CoinGeckoClient.coins.all();
 for(var i=0 ; i<data.data.length; i++){
   var elemento = {
  ticker: data.data[i].id,
  symbol: data.data[i].symbol,
  image: data.data[i].image  
          };
  arrayCriptos.push(elemento);
  }
  return arrayCriptos;
}


async function ping(){
    let data = await CoinGeckoClient.ping();
   return data;
}

async function precioCripto(base){
  let data = await CoinGeckoClient.simple.price({
    ids: [base, 'tether'],
    vs_currencies: ['usd', 'usd'],
     });
  let precioMercado = data.data.ethereum.usd / data.data.tether.usd ;
  return precioMercado;
 }

async function marketChart(base){
let data = await CoinGeckoClient.coins.fetchMarketChart(base);

return data;
}


module.exports = {marketChart, precioCripto, ping, todasLasCripto }

