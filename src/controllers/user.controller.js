import {asyncHandler} from "../utils/asyncHandler.js"
import {Apierror} from "../utils/Apierror.js"
import {User} from "../models/user.model.js"
import { uploadoncloudinary } from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"


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
    if(!username &&  !email)
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
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken:1 // remove the field from document
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

const refreshAccessToken = asyncHandler(async(req,res)=>{
   const incomingrefreshToken =  req.cookies.refreshToken || req.body.refreshToken
   if(!incomingrefreshToken)
   {
    throw new Apierror(401,"Unauthorised request")
   }

   try {
    const decodedToken = jwt.verify(
     incomingrefreshToken,
     process.env.REFRESH_TOKEN_SECRET 
    )
 
    const user = await User.findById(decodedToken?._id)
    if(!user)
     {
      throw new Apierror(401,"Invalid Refresh Token")
     }
     if(incomingrefreshToken !== user?.refreshToken)
     {
         throw new Apierror(401,"Refresh Token is expired or used")
     }
 
     const options = {
         httpOnly:true,
         secure:true
     }
 
     const{accessToken,newrefreshToken} = await generateAccessandRefreshTokens(user._id)
 
     return res
     .status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",newrefreshToken,options)
     .json(
         new ApiResponse(
             200,
             {accessToken,refreshToken:newrefreshToken},
             "Access Token refreshed"
         )
     )
   } catch (error) {
    throw new Apierror(401,error?.message || "Invalid Refresh Token")
   }

})

const changecurrentpassword = asyncHandler(async(req,res)=>{
    const {oldpassword,newpassword} = req.body

    const user = await User.findById(req.user?._id)
    const ispasswordcorrect = await user.isPasswordCorrect(oldpassword)
    if(!ispasswordcorrect)
    {
        throw new Apierror(400,"Invalid old password")
    }

    user.password = newpassword
    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json(new ApiResponse(200,{},"Password Changed Successfully"))
})


const getCurrentuser = asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(new ApiResponse(200,req.user,"current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body

    if(!fullName || !email)
    {
        throw new Apierror(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email:email
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,"Account Details Updated Successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarlocalpath = req.file?.path

    if(!avatarlocalpath)
    {
        throw new Apierror(400,"Avatar file is missing")
    }

    // TODO: delete old image - assignment

    const avatar = await uploadoncloudinary(avatarlocalpath)
    if(!avatar.url)
    {
        throw new Apierror(400,"Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")
    return res.status(200)
    .json(
        new ApiResponse(200,user,"Avatar Image Updated Successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const Coverlocalpath = req.file?.path

    if(!Coverlocalpath)
    {
        throw new Apierror(400,"Cover Image file is missing")
    }

    const coverImage = await uploadoncloudinary(Coverlocalpath)
    if(!coverImage.url)
    {
        throw new Apierror(400,"Error while uploading on CoverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(200,user,"Cover Image Updated Successfully")
    )
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const{username} = req.params
    if(!username?.trim())
    {
        throw new Apierror(400,"username is missing")
    }

    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField: "channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField: "subscriber",
                as:"subscribedTo"
            } 
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])

    if(!channel?.length){
        throw new Apierror(404,"channel does not exists")
    }

    return res.status(200)
    .json(
        new ApiResponse(200,"User channel fetched successfully")
    )
})

const getwatchhistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user_id)
            }
        },
        {
            $lookup:{
                from:"video",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(200,user[0].watchHistory),
        "Watch History fetched successfully"
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changecurrentpassword,
    getCurrentuser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getwatchhistory
}