
async function todasLasCripto(){
 var arrayCriptos = [];

 var res = await fetch('https://api.poloniex.com/markets/price');
 arrayCriptos = await res.json();

  return arrayCriptos;
}


async function precioCripto(base){
 
 var res = await fetch(`https://api.poloniex.com/markets/${base}_USDT/price`);
 var precioCriptos = await res.json();

  return precioCriptos.price;
}


//   ...... velas............
async function velasCripto(base){ // esta cada cinco minutos, habria que seleccionar tiempo
 
 var res = await fetch(`https://api.poloniex.com/markets/${base}_USDT/candles?interval=MINUTE_5
`);
 var velasCriptos = await res.json();

  return velasCriptos;
}

/*
contenido de las velas


symbol 	String 	true 	symbol name

interval 	String 	true 	the unit of time to aggregate data by. Valid values: 
                        MINUTE_1, MINUTE_5, MINUTE_10, MINUTE_15, MINUTE_30, HOUR_1, HOUR_2, 
                        HOUR_4, HOUR_6, HOUR_12, DAY_1, DAY_3, WEEK_1 and MONTH_1

limit 	Integer 	false 	maximum number of records returned. The default value is 100 and the max value is 500.

startTime 	Long 	false 	filters by time. The default value is 0.

endTime 	Long 	false 	filters by time. The default value is current time


[
  [
    "1.9",
    "1.9",
    "1.9",
    "1.9",
    "0",
    "0",
    "0",
    "0",
    0,
    1648707601291,
    "1.9",
    "MINUTE_1",
    1648707600000,
    1648707659999
  ],
  [
    ...
  ],
  ...
]


*/

module.exports = {todasLasCripto, precioCripto, velasCripto}
//module.exports = {marketChart, precioCripto, ping, todasLasCripto }