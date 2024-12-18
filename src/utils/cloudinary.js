import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });

const uploadoncloudinary = async(localfilepath)=>{
    try {
        if (!localfilepath) {
            return null;
        }
        // upload file
        const response = await cloudinary.uploader.upload(localfilepath,{
            resource_type:"auto"
        })
        // file has been uploaded successfully
        console.log("file is uploaded on cloudinary",response.url);
        return response
        
    } catch (error) {
        fs.unlinkSync(localfilepath) // remove the locally saved temporray file as the upload operation fot failed
        return null;
    }


}

export {uploadoncloudinary}