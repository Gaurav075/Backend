import {asyncHandler} from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import {Apierror} from "../utils/Apierror.js"
import {User} from "../models/user.model.js"

export const verifyJWT = asyncHandler(async(req,_,next)=>{
    try {
        const token = req.cookies?.accessToken || req.header
        ("Authorisation")?.replace("Bearer ","")
    
        if(!token){
            throw new Apierror(401,"Unauthorised request")
        }
    
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
        .select("-password -refreshToken")
    
        if(!user)
        {
            // TODO: discuss about frontend next video
            throw new Apierror(401,"Invalid Access Token")
        }
    
        req.user = user
        next()
    } catch (error) {
        throw new Apierror(401,error?.message || 
            "Invalid access token"
        )
    }
})