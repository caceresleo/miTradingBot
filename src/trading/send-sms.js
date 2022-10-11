require('dotenv').config()

const config = require('./config'); 

const client = require('twilio')(config.accountSid, config.authToken);
//const client = require('twilio')('ACeb4c46d38213108a37a8c15c1afe18f7', '9420d3e13c1a8e7e449785d30b8b6438');


async function sendMessage(contenido, usuario){  //modificar los datos con lo que trae " usuario "

	try{
       const message = await client.messages.create({
      // 	to: config.phone,
       	to: usuario.telefono,
       	from: '+18306899012',
       	body: contenido
       })

       console.log("Se envio un mensaje de texto ",message.sid)
	}catch(err){
		console.log(err);
	}

}

//sendMessage();

module.exports = {sendMessage}
