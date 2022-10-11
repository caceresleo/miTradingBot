const mongoose = require('mongoose');
var Schema = mongoose.Schema;

var user = mongoose.model('user');


const tradeSchema = new Schema({
     numero:{
      type:Number,  

     },
     user_id:{
        type:Schema.ObjectId,
        ref: 'user'
     },
     compraId:{
        type:String
     },
     fechaCompra:{
        type:Date
     },
     simbolo:{
        type:String
     },  
     precioCompra:{
        type:Number
     }, 
      montocompra:{
        type:Number
     },
     ventaId:{
        type:String
     },           
     fechaVenta:{
        type:Date
     },
     precioVenta:{
        type:Number
     },
     montoventa:{
              type:Number
     },
     margen:{
        type:Number
     },
     modo:{
        type:String
     }
 },{
  timestamps: true,   //es una propiedad que viene incorporada en Schema y 
                     // contiene los elementos  createAt y UpdateAt
  versionKey: false                    
 })

module.exports = mongoose.model("usuarioDB", tradeSchema);
