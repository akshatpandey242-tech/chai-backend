//this code is going to be very useful , can use as it is in other projects also

import { v2 as cloudinary } from "cloudinary";
// when to manage file system , use fs , aur isme unlink ka thoda padh lena
import fs from "fs"
import { unlink } from "fs";

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        //file has been uploaded successfully
        // console.log("file has been uploaded on cloudinary", response.url);
        await fs.promises.unlink(localFilePath)        
        return response;
    } catch (error) {
        if (localFilePath && fs.existsSync(localFilePath)) {
            //await fs.promise.unlink(localFilePath)
            await fs.promises.unlink(localFilePath)
        }
        // remove the locally saved temporary file as the upload operation has failed
        console.error("Cloudinary upload failed: ", error)
        return null;
    }
}


// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});



export { uploadOnCloudinary }


