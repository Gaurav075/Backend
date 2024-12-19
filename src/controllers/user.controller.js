import {asyncHandler} from "../utils/asyncHandler.js"
import {Apierror} from "../utils/Apierror.js"
import {User} from "../models/user.model.js"
import { uploadoncloudinary } from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async(req,res)=>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists : username,email
    // check for images, check for avatar
    // upload them to cloudinary,avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response

    const {fullName,email,username,password}=req.body
    console.log("email: ",email);

    // if(fullName===""){
    //     throw new Apierror(400,"fullname is required")
    // }
    if(
        [fullName,email,username,password].some((field)=>field ?.trim()==="")
    ){
        throw new Apierror(400,"All fields are required")
    }

    const existeduser = User.findOne({
        $or:[{username},{email}]
    })

    if(existeduser){
        throw new Apierror(409,"User with email or username already exists")
    }

    const avatarlocalpath = req.files?.avatar[0]?.path
    const coverImagelocalpath = req.files?.coverImage[0]?.path

    if(!avatarlocalpath){
        throw new Apierror(400,"Avatar file is required")
    }

    const avatar = await uploadoncloudinary(avatarlocalpath)
    const coverImage = await uploadoncloudinary(coverImagelocalpath)

    if(!avatar){
        throw new Apierror(400,"Avatar file is required")
    }
    
    const user = User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createduser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createduser){
        throw new Apierror(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createduser,"User registered successfully")
    )
})

export {registerUser}