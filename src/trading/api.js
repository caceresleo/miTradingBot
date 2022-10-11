const axios = require('axios');
const querystring = require('querystring');
const crypto = require('crypto');

const simbolo = process.env.SYMBOL;


const apikey = process.env.API_KEY;
const apisecret = process.env.SECRET_KEY;
const apiUrl = process.env.API_URL;

var cantidadOrdenes=0;
const cotizadores = [
  'BTC',  'ETH',  'USDT', 'BNB',
  'TUSD', 'PAX',  'USDC', 'XRP',
  'USDS', 'TRX',  'BUSD', 'NGN',
  'RUB',  'TRY',  'EUR',  'ZAR',
  'BKRW', 'IDRT', 'GBP',  'UAH',
  'BIDR', 'AUD',  'DAI',  'BRL',
  'BVND', 'VAI',  'GYEN', 'USDP',
  'DOGE', 'UST',  'DOT'
];

const bases = ["ETH","LTC","BNB","NEO","QTUM","EOS","SNT","BNT","BCC","GAS","BTC","HSR","OAX","DNT","MCO",
"ICN","WTC","LRC","YOYO","OMG","ZRX","STRAT","SNGLS","BQX","KNC","FUN","SNM","IOTA","LINK","XVG","SALT",
"MDA","MTL","SUB","ETC","MTH","ENG","ZEC","AST","DASH","BTG","EVX","REQ","VIB","TRX","POWR","ARK","XRP",
"MOD","ENJ","STORJ","VEN","KMD","NULS","RCN","RDN","XMR","DLT","AMB","BAT","BCPT","ARN","GVT","CDT","GXS",
"POE","QSP","BTS","XZC","LSK","TNT","FUEL","MANA","BCD","DGD","ADX","ADA","PPT","CMT","XLM","CND","LEND",
"WABI","TNB","WAVES","GTO","ICX","OST","ELF","AION","NEBL","BRD","EDO","WINGS","NAV","LUN","TRIG","APPC",
"VIBE","RLC","INS","PIVX","IOST","CHAT","STEEM","NANO","VIA","BLZ","AE","RPX","NCASH","POA","ZIL","ONT",
"STORM","XEM","WAN","WPR","QLC","SYS","GRS","CLOAK","GNT","LOOM","BCN","REP","TUSD","ZEN","SKY","CVC",
"THETA","IOTX","QKC","AGI","NXS","DATA","SC","NPXS","KEY","NAS","MFT","DENT","ARDR","HOT","VET","DOCK",
"POLY","PHX","HC","GO","PAX","RVN","DCR","USDC","MITH","BCHABC","BCHSV","REN","BTT","USDS","ONG","FET",
"CELR","MATIC","ATOM","PHB","TFUEL","ONE","FTM","BTCB","ALGO","USDSB","ERD","DOGE","DUSK","BGBP","ANKR",
"WIN","COS","TUSDB","COCOS","TOMO","PERL","CHZ","BAND","BUSD","BEAM","XTZ","HBAR","NKN","STX","KAVA","ARPA",
"CTXC","BCH","TROY","VITE","FTT","USDT","EUR","OGN","DREP","BULL","BEAR","ETHBULL","ETHBEAR","TCT","WRX",
"LTO","EOSBULL","EOSBEAR","XRPBULL","XRPBEAR","MBL","COTI","BNBBULL","BNBBEAR","STPT","SOL","CTSI","HIVE",
"CHR","BTCUP","BTCDOWN","MDT","STMX","IQ","PNT","GBP","DGB","COMP","BKRW","SXP","SNX","ETHUP","ETHDOWN",
"ADAUP","ADADOWN","LINKUP","LINKDOWN","VTHO","IRIS","MKR","DAI","RUNE","AUD","FIO","BNBUP","BNBDOWN","XTZUP",
"XTZDOWN","AVA","BAL","YFI","JST","SRM","ANT","CRV","SAND","OCEAN","NMR","DOT","LUNA","LUNC","IDEX","RSR","PAXG",
"WNXM","TRB","BZRX","WBTC","SUSHI","YFII","KSM","EGLD","DIA","UMA","EOSUP","EOSDOWN","TRXUP","TRXDOWN",
"XRPUP","XRPDOWN","DOTUP","DOTDOWN","BEL","WING","SWRV","LTCUP","LTCDOWN","CREAM","UNI","NBS","OXT","SUN",
"AVAX","HNT","BAKE","BURGER","FLM","SCRT","CAKE","SPARTA","UNIUP","UNIDOWN","ORN","UTK","XVS","ALPHA","VIDT",
"AAVE","NEAR","SXPUP","SXPDOWN","FIL","FILUP","FILDOWN","YFIUP","YFIDOWN","INJ","AERGO","EASY","AUDIO","CTK",
"BCHUP","BCHDOWN","BOT","AKRO","KP3R","AXS","HARD","RENBTC","SLP","CVP","STRAX","FOR","UNFI","FRONT","BCHA",
"ROSE","HEGIC","AAVEUP","AAVEDOWN","PROM","SKL","SUSD","COVER","GLM","GHST","SUSHIUP","SUSHIDOWN","XLMUP",
"XLMDOWN","DF","GRT","JUV","PSG","REEF","OG","ATM","ASR","CELO","RIF","BTCST","TRU","DEXE","CKB",
"TWT","FIRO","BETH","PROS","LIT","SFP","FXS","DODO","UFT","ACM","AUCTION","PHA","TVK","BADGER","FIS","OM",
"POND","DEGO","ALICE","BIFI","LINA","PERP","RAMP","SUPER","CFX","EPS","AUTO","TKO","PUNDIX","TLM",
"MIR","BAR","FORTH","EZ","SHIB","ICP","AR","POLS","MDX","MASK","LPT","AGIX","NU","ATA","GTC","TORN",
"KEEP","ERN","KLAY","BOND","MLN","QUICK","C98","CLV","QNT","FLOW","XEC","MINA","RAY","FARM","ALPACA","MBOX","VGX",
"WAXP","TRIBE","GNO","DYDX","USDP","GALA","ILV","YGG","FIDA","AGLD","RAD","BETA","RARE","SSV","LAZIO","CHESS","DAR",
"BNX","RGT","MOVR","CITY","ENS","QI","PORTO","JASMY","AMP","PLA","PYR","RNDR","ALCX","SANTOS","MC","ANY","BICO","FLUX",
"VOXEL","HIGH","CVX","PEOPLE","OOKI","SPELL","UST","JOE","ACH","IMX","GLMR","LOKA","API3","BTTC","ACA","ANC","BDOT",
"XNO","WOO","ALPINE","T","ASTR","NBT","GMT","KDA","APE","BSW","MULTI"];


//COMUNICACION PRIVADA CON EL EXCHANGE --------------------------------------

async function privateCall(path, data={}, method='GET'){
	const timestamp = Date.now(); 

	const signature = crypto.createHmac('sha256', apisecret)  
					.update(`${querystring.stringify({...data, timestamp})}`)   
					.digest('hex');

	const newData = {...data, timestamp, signature}; 
	const qs = `?${querystring.stringify(newData)}`; 
	try{
		const result = await axios({
			method,
			url: `${apiUrl}${path}${qs}`,
			headers: { 'X-MBX-APIKEY': apikey}
		})
     cantidadOrdenes++;
		console.log("cantidad de ordenes: ",cantidadOrdenes);
		return result.data;
       
	}catch(err){
		console.log(err);
	}
}

//PETICIONES PUBLICAS QUE PUEDO HACER SIN KEY --------------------------------------

async function publicCall(path, data, method='GET'){
	try{

		const qs = data ? `?${querystring.stringify(data)}`:'';
		const result = await axios({
			method,
			url: `${apiUrl}${path}${qs}`
		})

		cantidadOrdenes++;
		console.log("cantidad de ordenes: ",cantidadOrdenes);
		return result.data;

	}catch(error){
		console.log(error);
	}

}
//----------------------------------------------------------------------------------

//CREAR UNA ORDEN (ES UNA PETICION PRIVADA)-----------------------------------------

async function newOrder(symbol, quantity, price, side = 'BUY', type = 'MARKET'){
		const data = {symbol, side, type, quantity};
		if(price) data.price= price;  
		if(type === 'LIMIT') data.timeInForce = 'GTC'; 		                                             
		return privateCall('/v3/order', data, 'POST');                                             
}

//---------------------------------------------------------------------------------

//informacion de mi cuenta en cartera
async function accountInfo(){
	return privateCall('/v3/account');
}

async function time(){
	return publicCall('/v3/time');
}

async function depth(symbol = 'ETHUSDT', limit = 5){
	return publicCall('/v3/depth', {symbol, limit});
}

async function exchangeInfo(symbol = 'ETHUSDT'){
	return publicCall('/v3/exchangeInfo');
}

async function tickerPrice(parametro){
	symbol = parametro;
	return publicCall('/v3/ticker/price',{symbol});
}

async function myTrades(symbol = 'ETHUSDT'){
	return privateCall('/v3/myTrades',{symbol});
}

function allOrders(symbol = 'ETHUSDT') {
	return privateCall('/v3/allOrders',{symbol});
}

function openOrders(symbol = 'ETHUSDT') {
	return privateCall('/v3/openOrders',{symbol});
}

/*
function openOrders() {
	return privateCall('/v3/openOrders');
}
*/

function listarBases() {
 	return bases.sort();
}
function listarCotizadores() {
	return cotizadores.sort();
}

module.exports = { time, depth, exchangeInfo, accountInfo, newOrder, tickerPrice, myTrades,
                   allOrders, openOrders, listarBases, listarCotizadores}