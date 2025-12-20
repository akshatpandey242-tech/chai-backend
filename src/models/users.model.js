import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
//jwt is a bearer token , ye token jiske bhi paas hai , ye usko data bhejdega
import bcrypt from "bcrypt";
//direct encryption not possible , need to use hooks , like pre 
// what pre does , just before data is saved use the hook to encrypt the data like password
const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true    //kisi bhi field mei searching enable krni hai toh index ko true , iska use env me dekhle
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    avatar: {
        type: String, // cloudinary url
        required: true,
    },
    coverimage: {
        type: String, //cloudinary url 
    },
    watchHistory: {  // this alone here makes this part of the project quite complex , we will be using plugin mongoose-aggregate-paginate-v2 , aggregation pipelines itself a topic for mongoose
        type: Schema.Types.ObjectId,
        ref: "Video",
    },
    password: {
        type: String,  // standard practive , pass ko encript kiya jata hai db mei , but then compare kaise karenge , wo aage 
        required: [true, 'Password is required'], // true field ke saath custom msg de sakte hai
    },
    refreshToken: {
        type: String,
    }
}, { timestamps: true })

//ye waale hooks model files me hi likhte hai professionla work mei 

userSchema.pre("save", async function (next) {
    if (this.isModified("password")){
        this.password = await bcrypt.hash(this.password, 10)
    }
    next()
})   // inn hooks ko app.listen and app.error type methods se relate ke sakte hai
//explore the functionalities of this hooks from the docs


// never use this type of callback ()=>{} in pre hook , as in this type of callback there is no context of "this " , and we need this to manipulate and encrypt all the fields that we have written , 
//async isliye because encryption will take time 
// next ka ref because , middleware , ye kaam hogayga , now aage wale ko flag pass krdo


//now like how we are allowed to make custom middleware by mongo  , we can also make custom methods also

//we are making this method to check the normak and encrypted password
userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password , this.password) //boolean
}

// neeche dono hi jwt methods hai
userSchema.methods.generateAccessToken = async function(){
    return  jwt.sign(
        { /* ye meta payload , ki kya kya rakho  
            //ye mera payload ka key hai */ _id : this._id , // ye mere db se aa rahi hai
            email : this.email ,
            username : this.username ,
            fullname : this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET ,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return  jwt.sign(
        {   
            _id : this._id
        },
        process.env.REFRESH_TOKEN_SECRET ,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}
export const User = mongoose.model("User", userSchema) // db me User will be saved as users