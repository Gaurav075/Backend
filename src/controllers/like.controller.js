import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video id")
    }

    const likedalready = await findOne({
        video:videoId,
        likedBy:req.user_id
    })

    if(likedalready)
    {
        await Like.findByIdAndDelete(likedalready._id)
        return res.status(200)
        .json(new ApiResponse(200,{liked:false},"Successfully unliked"))
    }

    await Like.create({
        video:videoId,
        likedBy:req.user_id
    })

    return res.status(200)
    .json(new ApiResponse(200,{liked:true},"Successfully liked"))
    //TODO: toggle like on video
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!isValidObjectId(commentId)){
        throw new ApiError(400,"Invalid comment id")
    }

    const likedalready = await findOne({
        comment:commentId,
        likedBy:req.user_id
    })

    if(likedalready)
    {
        await Like.findByIdAndDelete(likedalready?._id)
        return res.status(200)
        .json(new ApiResponse(200,{liked:false},"Successfully unliked"))
    }

    await Like.create({
        comment:commentId,
        likedBy:req.user_id
    })
    return res.status(200)
    .json(new ApiResponse(200,{liked:true},"Successfully liked"))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"Invalid tweet id")
    }

    const likedalready = await Like.findOne({
        tweet:tweetId,
        likedBy:req.user_id
    })

    if(likedalready)
    {
        await Like.findByIdAndDelete(likedalready._id)
        return res.status(200)
        .json(new ApiResponse(200,{liked:false},"Successfully unliked"))
    }

    await Like.create({
        tweet:tweetId,
        likedBy:req.user_id
    })

    return res.status(200)
    .json(new ApiResponse(200,{liked:true},"Successfully liked"))
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const LikedVideosaggregate = Like.aggregate([
        {
            $match:{
                likedBy:new mongoose.Types.ObjectId(req.user_id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"likedVideo",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"ownerDetails"
                        }
                    },
                    {
                        $unwind:"$ownerDetails"
                    }
                ]
            }
        },
        {
            $unwind:"$likedVideo"
        },
        {
            $sort:{
                createdAt:-1
            }
        },
        {
            $project:{
                _id: 0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1,
                    },
                },
            }
        }
    ])

    return res.status(200)
    .json(new ApiResponse(200,LikedVideosaggregate,"Liked videos fetched successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}