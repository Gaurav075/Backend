import {asyncHandler} from "../utils/asyncHandler.js"
import {Apierror} from "../utils/Apierror.js"
import {User} from "../models/user.model.js"
import { uploadoncloudinary } from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"


const generateAccessandRefreshTokens = async(userId)=> {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})


        return {accessToken,refreshToken}

    } catch (error) {
        throw new Apierror(500,"Something went wrong while generating refresh and access token")
    }
}

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
    // console.log("email: ",email);

    // if(fullName===""){
    //     throw new Apierror(400,"fullname is required")
    // }
    if(
        [fullName,email,username,password].some((field)=>field ?.trim()==="")
    ){
        throw new Apierror(400,"All fields are required")
    }

    const existeduser = await User.findOne({
        $or:[{username},{email}]
    })

    if(existeduser){
        throw new Apierror(409,"User with email or username already exists")
    }

    // console.log(req.files);
    

    const avatarlocalpath = req.files?.avatar[0]?.path
    // const coverImagelocalpath = req.files?.coverImage[0]?.path

    let coverImagelocalpath
    if (req.files && Array.isArray(req.files.coverImage)
    && req.files.coverImage.length>0) {
        coverImagelocalpath = req.files.coverImage[0].path
    }

    if(!avatarlocalpath){
        throw new Apierror(400,"Avatar file is required")
    }

    const avatar = await uploadoncloudinary(avatarlocalpath)
    const coverImage = await uploadoncloudinary(coverImagelocalpath)

    if(!avatar){
        throw new Apierror(400,"Avatar file is required")
    }
    
    const user = await User.create({
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

const loginUser = asyncHandler(async(req,res)=>{
    // req body->data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookies

    const {email,username,password}=req.body
    if(!username || !email)
    {
        throw new Apierror(400,"username or email is required")
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    })

    if(!user)
    {
        throw new Apierror(404,"User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid)
        {
            throw new Apierror(401,"Invalid User Credentials")
        }

    const {accessToken,refreshToken} = await generateAccessandRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken")

    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged In Successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))
})

export {
    registerUser,
    loginUser,
    logoutUser
}