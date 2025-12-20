import mongoose , {Schema} from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"
const videoSchema = mongoose.Schema
(
    {
        videoFile : {   // waise mongo all
            type : String , // cloudinary
            required : true ,
        },
        thumbnail : {
            type : String , //cloudinary url 
            required : true ,
        },
        title : {
            type : String ,
            required : true ,
        },
        description : {
            type : String ,
            required : true , 
        },
        duration : {
            type : Number , //from cloudinary also , it will give duration also with url
            required : true,
        },
        views : {
            type : Number ,
            default : 0,
        },
        idPublished : {
            type : Boolean ,
            default : true ,
        },
        owner : {
            type : Schema.Types.ObjectId ,
            ref : "User",
        }

    }, {timestamps : true})

videoSchema.plugin(mongooseAggregatePaginate)
export const Video = mogoose.model("Video" , videoSchema)  

//bcrypt (core) , core node.js library pe package bana hai  , 
// bcryptjs optiminzed js with zero dependency ,

// what these do ? they help to hash our password , jisse encryption and decryption ka masla khatm 

//jsonwebtoken bhi lagega 
//jwt website checkout krna
