// require ('dotenv').config({path:'./env'})
console.log("MONGO:", process.env.MONGODB_URL)

import dotenv from 'dotenv'
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js"; 
import connectDB from "./db/index.js";
import express from "express"
const app = express()

dotenv.config({
    path: './env'
})

console.log("MONGO: ", process.env.MONGODB_URL)

connectDB()

app.listen(process.env.PORT || 8000, () => {
  console.log(`Server running on port ${process.env.PORT}`)
})














// import express from "express"
// const app = express()
// ;(async()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//         app.on("error" , (error)=>{
//             console.log("ERROR: " , error)
//             throw error
//         })

//         app.listen(process.env.PORT, ()=>{
//             console.log(`App is listening on port ${process.env.PORT}`)
//         })
//     } catch(error){
//         console.error("ERROR:  , error")
//         throw err
//     }
// })()

